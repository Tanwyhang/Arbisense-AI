"""
Optimizer API Endpoints
REST API for AI parameter optimization system
"""
import asyncio
import uuid
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime

from app.models.optimizer import (
    ArbitrageParameters,
    PerformanceMetrics,
    OptimizationRequest,
    OptimizationSession,
    OptimizationStatus,
    StartOptimizationResponse,
    OptimizationStatusResponse,
    ApprovalRequest,
    ApprovalResponse
)
from app.engines.parameter_optimizer import get_parameter_optimizer
from app.engines.ring_consensus import get_ring_consensus_engine
from app.engines.simulation_engine import get_simulation_engine
from app.websocket_manager import ws_manager


# Active sessions storage (in production, use Redis/database)
active_sessions: Dict[str, OptimizationSession] = {}


router = APIRouter(prefix="/api/optimizer", tags=["optimizer"])


async def run_optimization_workflow(
    session_id: str,
    request: OptimizationRequest
):
    """
    Background task to run the optimization workflow

    Args:
        session_id: Session identifier
        request: Optimization request
    """
    try:
        session = active_sessions.get(session_id)
        if not session:
            return

        # Update status
        session.status = OptimizationStatus.RUNNING
        session.updated_at = datetime.utcnow()
        await ws_manager.broadcast({
            "type": "optimizer_status",
            "session_id": session_id,
            "status": "running"
        })

        # Get engines
        ring_engine = get_ring_consensus_engine()
        sim_engine = get_simulation_engine()

        # Message callback for real-time updates
        async def on_message(message):
            session.agent_messages.append(message)
            await manager.broadcast({
                "type": "agent_message",
                "session_id": session_id,
                "message": message.dict()
            })

        # Run ring consensus
        consensus_state = await ring_engine.run_consensus(
            request=request,
            on_message_callback=on_message
        )

        session.consensus_state = consensus_state
        session.updated_at = datetime.utcnow()

        # Broadcast consensus update
        await ws_manager.broadcast({
            "type": "consensus_update",
            "session_id": session_id,
            "consensus": consensus_state.dict()
        })

        # Run simulation with agreed parameters
        sim_result = await sim_engine.run_simulation(
            proposed_parameters=consensus_state.agreed_parameters,
            baseline_metrics=request.current_metrics
        )

        session.simulation_result = sim_result
        session.final_parameters = sim_result.proposed_parameters
        session.status = OptimizationStatus.COMPLETED
        session.updated_at = datetime.utcnow()

        # Broadcast completion
        await ws_manager.broadcast({
            "type": "optimizer_completed",
            "session_id": session_id,
            "result": sim_result.dict()
        })

    except Exception as e:
        session = active_sessions.get(session_id)
        if session:
            session.status = OptimizationStatus.FAILED
            session.error_message = str(e)
            session.updated_at = datetime.utcnow()

        await ws_manager.broadcast({
            "type": "optimizer_failed",
            "session_id": session_id,
            "error": str(e)
        })


@router.post("/start", response_model=StartOptimizationResponse)
async def start_optimization(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new optimization session

    Args:
        request: Optimization request with current parameters
        background_tasks: FastAPI background tasks

    Returns:
        Session ID and status
    """
    try:
        # Generate session ID
        session_id = f"opt_{uuid.uuid4().hex[:8]}"

        # Create session
        session = OptimizationSession(
            session_id=session_id,
            status=OptimizationStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            request=request
        )

        # Store session
        active_sessions[session_id] = session

        # Start background workflow
        background_tasks.add_task(
            run_optimization_workflow,
            session_id,
            request
        )

        # Estimate time (roughly: 5 agents * 2 iterations * 30 seconds per LLM call)
        estimated_time = request.max_iterations * len(request.agent_count) * 30

        return StartOptimizationResponse(
            session_id=session_id,
            status=OptimizationStatus.PENDING,
            message="Optimization session started",
            estimated_time_seconds=estimated_time
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start optimization: {str(e)}")


@router.get("/status/{session_id}", response_model=OptimizationStatusResponse)
async def get_optimization_status(session_id: str):
    """
    Get status of an optimization session

    Args:
        session_id: Session identifier

    Returns:
        Current status and progress
    """
    session = active_sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Calculate progress
    if session.status == OptimizationStatus.PENDING:
        progress = 0.0
    elif session.status == OptimizationStatus.RUNNING:
        if session.consensus_state:
            current_round = session.consensus_state.round_number
            total_rounds = session.consensus_state.total_rounds
            progress = (current_round / total_rounds) * 0.7  # 70% for consensus
            if session.simulation_result:
                progress = 0.9  # 90% if simulation done
        else:
            progress = 0.1
    elif session.status == OptimizationStatus.COMPLETED:
        progress = 100.0
    else:
        progress = 0.0

    return OptimizationStatusResponse(
        session_id=session_id,
        status=session.status,
        progress_percentage=progress,
        current_round=session.consensus_state.round_number if session.consensus_state else 0,
        total_rounds=session.consensus_state.total_rounds if session.consensus_state else request.max_iterations if 'request' in locals() else 3,
        consensus_score=session.consensus_state.convergence_score if session.consensus_state else 0.0,
        agent_messages_count=len(session.agent_messages),
        simulation_complete=session.simulation_result is not None,
        estimated_remaining_seconds=None  # Could calculate based on progress
    )


@router.get("/results/{session_id}")
async def get_optimization_results(session_id: str):
    """
    Get detailed results of an optimization session

    Args:
        session_id: Session identifier

    Returns:
        Full session data with results
    """
    session = active_sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != OptimizationStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Session not completed. Current status: {session.status}"
        )

    return session


@router.get("/simulation/{session_id}")
async def get_simulation_results(session_id: str):
    """
    Get simulation results only

    Args:
        session_id: Session identifier

    Returns:
        Simulation result data
    """
    session = active_sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.simulation_result:
        raise HTTPException(status_code=400, detail="Simulation not completed")

    return session.simulation_result


@router.post("/approve/{session_id}", response_model=ApprovalResponse)
async def approve_parameters(session_id: str, approval: ApprovalRequest):
    """
    Approve or reject proposed parameters

    Args:
        session_id: Session identifier
        approval: Approval decision

    Returns:
        Approval response
    """
    session = active_sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != OptimizationStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve. Session status: {session.status}"
        )

    if not approval.approve:
        return ApprovalResponse(
            success=True,
            message="Parameters rejected",
            applied_parameters=None,
            rollback_available=False,
            audit_log_id=None
        )

    try:
        # Apply parameters to parameter optimizer
        param_optimizer = get_parameter_optimizer()

        # Validate parameters
        is_valid, violations = await param_optimizer.validate_parameters(
            session.final_parameters
        )

        if not is_valid:
            return ApprovalResponse(
                success=False,
                message=f"Parameter validation failed: {', '.join(violations)}",
                applied_parameters=None,
                rollback_available=False,
                audit_log_id=None
            )

        # Update parameters
        await param_optimizer.update_parameters(
            parameters=session.final_parameters,
            metrics=None,  # Will be updated on next trade cycle
            session_id=session_id
        )

        # Mark as applied
        session.applied = True

        return ApprovalResponse(
            success=True,
            message="Parameters applied successfully",
            applied_parameters=session.final_parameters,
            rollback_available=True,
            audit_log_id=f"audit_{uuid.uuid4().hex[:8]}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply parameters: {str(e)}")


@router.get("/parameters/current")
async def get_current_parameters():
    """
    Get current bot parameters

    Returns:
        Current parameters from parameter optimizer
    """
    try:
        param_optimizer = get_parameter_optimizer()
        state = param_optimizer.get_current_state()

        return {
            "parameters": state["parameters"],
            "metrics": state["metrics"],
            "last_updated": state["last_updated"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get parameters: {str(e)}")


@router.get("/sessions")
async def list_sessions(limit: int = 20, offset: int = 0):
    """
    List recent optimization sessions

    Args:
        limit: Maximum number of sessions to return
        offset: Offset for pagination

    Returns:
        List of sessions
    """
    sessions = list(active_sessions.values())

    # Sort by created_at descending
    sessions.sort(key=lambda s: s.created_at, reverse=True)

    # Paginate
    paginated_sessions = sessions[offset:offset + limit]

    return {
        "total": len(sessions),
        "sessions": [
            {
                "session_id": s.session_id,
                "status": s.status,
                "created_at": s.created_at,
                "applied": s.applied,
                "final_parameters": s.final_parameters.dict() if s.final_parameters else None
            }
            for s in paginated_sessions
        ]
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    Delete an optimization session

    Args:
        session_id: Session identifier

    Returns:
        Success message
    """
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    del active_sessions[session_id]

    return {"message": "Session deleted successfully"}
