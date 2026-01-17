"""
Chatbot API endpoints for interactive bot configuration.

Provides REST API and WebSocket interfaces for the Smart Advisor.
"""

import json
import asyncio
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.chatbot import (
    ChatRequest,
    ChatResponse,
    StartSessionRequest,
    StartSessionResponse,
    SessionContext,
    AssessmentStep,
    ChatMessage,
    MessageType
)
from app.services.smart_advisor import SmartAdvisorService
from app.services.openrouter_service import OpenRouterService
from app.config import config


# Create router
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

# Global service instances
openrouter_service = OpenRouterService()
advisor_service = SmartAdvisorService(openrouter_service)

# Store WebSocket connections by session
active_connections: Dict[str, WebSocket] = {}

# Store conversation history per session
conversation_history: Dict[str, List[Dict[str, str]]] = {}


@router.post("/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest):
    """
    Start a new assessment session.

    Creates a new session and returns the initial advisor greeting.
    """
    try:
        session = advisor_service.create_session(request.user_id)

        # Initialize conversation history
        conversation_history[session.id] = []

        # Get initial message
        initial_message = advisor_service.generate_initial_message(session)

        # Store advisor's initial message in history
        conversation_history[session.id].append({
            "role": "advisor",
            "content": initial_message
        })

        return StartSessionResponse(
            session_id=session.id,
            initial_message=initial_message,
            current_step=session.current_step
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Send a message to the chatbot and get a response.

    Processes the user message, extracts preferences, and generates an AI response.
    """
    try:
        # Get conversation history for context
        history = conversation_history.get(request.session_id, [])

        # Process message with advisor service
        response = await advisor_service.process_message(
            request.session_id,
            request.message,
            history
        )

        # Update conversation history
        conversation_history[request.session_id].append({
            "role": "user",
            "content": request.message
        })
        conversation_history[request.session_id].append({
            "role": "advisor",
            "content": response.response
        })

        # If WebSocket is active, send update
        if request.session_id in active_connections:
            ws = active_connections[request.session_id]
            try:
                await ws.send_json({
                    "type": "advisor_message",
                    "data": {
                        "response": response.response,
                        "preferences_updated": response.preferences_updated,
                        "new_preferences": response.new_preferences.dict() if response.new_preferences else None,
                        "assessment_complete": response.assessment_complete,
                        "progress": response.progress
                    }
                })

                # Send completion event if done
                if response.assessment_complete:
                    await ws.send_json({
                        "type": "assessment_complete",
                        "data": {
                            "session_id": request.session_id,
                            "preferences": response.new_preferences.dict(),
                            "next_step": "optimization"
                        }
                    })

            except Exception as ws_error:
                print(f"WebSocket send error: {ws_error}")

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.get("/context/{session_id}", response_model=SessionContext)
async def get_session_context(session_id: str):
    """
    Get the current context for a session.

    Returns session data, current parameters, and conversation summary.
    """
    try:
        session = advisor_service.get_session(session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )

        # Get conversation summary (last 10 messages)
        history = conversation_history.get(session_id, [])
        summary = "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in history[-10:]
        ])

        # TODO: Fetch current parameters and metrics from parameter optimizer
        current_parameters = {
            "min_spread_pct": 0.5,
            "min_profit_usd": 10.0,
            "max_risk_score": 7,
            "max_trade_size_usd": 1000.0,
            "gas_cost_threshold_pct": 5.0,
        }

        baseline_metrics = {
            "total_profit_usd": 1250.50,
            "win_rate": 0.78,
            "sharpe_ratio": 2.3,
            "max_drawdown_pct": 5.2,
        }

        return SessionContext(
            session=session,
            current_parameters=current_parameters,
            baseline_metrics=baseline_metrics,
            conversation_summary=summary
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get context: {str(e)}"
        )


@router.get("/sessions")
async def list_sessions():
    """
    List all active sessions.

    Returns basic information about all sessions.
    """
    try:
        sessions = list(advisor_service.sessions.values())

        return {
            "sessions": [
                {
                    "id": s.id,
                    "created_at": s.created_at.isoformat(),
                    "updated_at": s.updated_at.isoformat(),
                    "current_step": s.current_step,
                    "is_complete": s.is_complete,
                    "progress": f"{s.required_fields_collected}/{s.total_required_fields}"
                }
                for s in sessions
            ],
            "total": len(sessions)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sessions: {str(e)}"
        )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session and clean up resources.

    Removes the session and closes any active WebSocket connections.
    """
    try:
        # Close WebSocket if active
        if session_id in active_connections:
            try:
                await active_connections[session_id].close()
            except Exception:
                pass
            del active_connections[session_id]

        # Delete conversation history
        if session_id in conversation_history:
            del conversation_history[session_id]

        # Delete session
        if session_id in advisor_service.sessions:
            del advisor_service.sessions[session_id]
            return {"message": f"Session {session_id} deleted"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


@router.websocket("/ws/{session_id}")
async def chatbot_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chatbot updates.

    Streams advisor responses and session updates in real-time.
    """
    await websocket.accept()

    # Verify session exists
    session = advisor_service.get_session(session_id)
    if not session:
        await websocket.send_json({
            "type": "error",
            "data": {"message": f"Session {session_id} not found"}
        })
        await websocket.close()
        return

    # Store connection
    active_connections[session_id] = websocket

    try:
        # Send initial state
        await websocket.send_json({
            "type": "connected",
            "data": {
                "session_id": session_id,
                "current_step": session.current_step,
                "progress": f"{session.required_fields_collected}/{session.total_required_fields}"
            }
        })

        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "ping":
                # Respond to keep-alive ping
                await websocket.send_json({"type": "pong"})

            elif message_type == "message":
                # User sent a message via WebSocket
                user_message = data.get("message", "")

                # Process message
                request = ChatRequest(
                    session_id=session_id,
                    message=user_message
                )

                response = await advisor_service.process_message(
                    session_id,
                    user_message,
                    conversation_history.get(session_id, [])
                )

                # Stream response
                await websocket.send_json({
                    "type": "advisor_message",
                    "data": {
                        "response": response.response,
                        "preferences_updated": response.preferences_updated,
                        "new_preferences": response.new_preferences.dict() if response.new_preferences else None,
                        "assessment_complete": response.assessment_complete,
                        "progress": response.progress
                    }
                })

                # Send completion event if done
                if response.assessment_complete:
                    await websocket.send_json({
                        "type": "assessment_complete",
                        "data": {
                            "session_id": session_id,
                            "preferences": response.new_preferences.dict(),
                            "next_step": "optimization"
                        }
                    })

            elif message_type == "get_context":
                # Send current context
                history = conversation_history.get(session_id, [])

                await websocket.send_json({
                    "type": "context_update",
                    "data": {
                        "preferences": session.preferences.dict(),
                        "conversation_history": history[-10:],  # Last 10 messages
                        "progress": f"{session.required_fields_collected}/{session.total_required_fields}"
                    }
                })

    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "data": {"message": str(e)}
            })
        except Exception:
            pass
    finally:
        # Clean up connection
        if session_id in active_connections:
            del active_connections[session_id]
