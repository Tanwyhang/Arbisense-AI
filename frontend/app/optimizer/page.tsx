/**
 * AI Optimizer Page
 * Main page for AI-powered parameter optimization
 */
'use client';

import { useState, useEffect } from 'react';
import { Play, StopCircle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import ParameterControlPanel from '@/components/optimizer/ParameterControlPanel';
import RingVisualization from '@/components/optimizer/RingVisualization';
import AgentConversationPanel from '@/components/optimizer/AgentConversationPanel';
import SimulationResultsPanel from '@/components/optimizer/SimulationResultsPanel';
import ApprovalWorkflow from '@/components/optimizer/ApprovalWorkflow';

import {
  OptimizationSession,
  OptimizationStatus,
  OptimizationRequest,
  AgentMessage,
  OptimizerWebSocketMessage
} from '@/types/optimizer';

export default function OptimizerPage() {
  const [session, setSession] = useState<OptimizationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch current parameters on mount
  useEffect(() => {
    fetchCurrentParameters();
  }, []);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/arbitrage');

    ws.onopen = () => {
      console.log('Optimizer WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: OptimizerWebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleWebSocketMessage = (message: OptimizerWebSocketMessage) => {
    if (!session) return;

    switch (message.type) {
      case 'optimizer_status':
        setSession(prev => prev ? { ...prev, status: message.status } : null);
        break;

      case 'agent_message':
        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            agent_messages: [...prev.agent_messages, message.message]
          };
        });
        break;

      case 'consensus_update':
        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            consensus_state: message.consensus
          };
        });
        break;

      case 'optimizer_completed':
        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: OptimizationStatus.COMPLETED,
            simulation_result: message.result,
            final_parameters: message.result.proposed_parameters
          };
        });
        setIsLoading(false);
        break;

      case 'optimizer_failed':
        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: OptimizationStatus.FAILED,
            error_message: message.error
          };
        });
        setIsLoading(false);
        setError(message.error);
        break;
    }
  };

  const fetchCurrentParameters = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/optimizer/parameters/current');
      if (!response.ok) throw new Error('Failed to fetch parameters');

      const data = await response.json();
      console.log('Current parameters:', data);
    } catch (err) {
      console.error('Error fetching parameters:', err);
    }
  };

  const startOptimization = async (request: OptimizationRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/optimizer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) throw new Error('Failed to start optimization');

      const data = await response.json();
      console.log('Optimization started:', data);

      // Create initial session state
      const initialSession: OptimizationSession = {
        session_id: data.session_id,
        status: data.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        request: request,
        consensus_state: null,
        agent_messages: [],
        simulation_result: null,
        final_parameters: null,
        applied: false,
        error_message: null
      };

      setSession(initialSession);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleApprove = async (approve: boolean, reason?: string) => {
    if (!session) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/optimizer/approve/${session.session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id, approve, reason })
        }
      );

      if (!response.ok) throw new Error('Failed to process approval');

      const data = await response.json();
      console.log('Approval response:', data);

      if (data.success) {
        setSession(prev => prev ? { ...prev, applied: true } : null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Parameter Optimizer
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Multi-agent consensus for optimal arbitrage parameters
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              {session && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
                  {session.status === OptimizationStatus.RUNNING && (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400">Optimizing...</span>
                    </>
                  )}
                  {session.status === OptimizationStatus.COMPLETED && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Completed</span>
                    </>
                  )}
                  {session.status === OptimizationStatus.FAILED && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Failed</span>
                    </>
                  )}
                </div>
              )}

              {/* WebSocket Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                wsConnected
                  ? 'bg-green-900/20 border-green-700/50'
                  : 'bg-red-900/20 border-red-700/50'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="text-xs text-slate-300">
                  {wsConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold mb-1">Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Three Panel Layout */}
      <div className="container mx-auto px-6 py-6">
        {!session ? (
          /* Initial State - Show Parameter Controls */
          <div className="max-w-4xl mx-auto">
            <ParameterControlPanel
              onStartOptimization={startOptimization}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Active Session - Show All Panels */
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Parameters (3 cols) */}
            <div className="col-span-3 space-y-6">
              <ParameterControlPanel
                onStartOptimization={startOptimization}
                isLoading={isLoading}
                session={session}
              />

              {/* Consensus Progress */}
              {session.consensus_state && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    Consensus Progress
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Round</span>
                      <span>
                        {session.consensus_state.round_number} / {session.consensus_state.total_rounds}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Convergence</span>
                      <span>
                        {(session.consensus_state.convergence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${session.consensus_state.convergence_score * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Center Panel - Ring & Conversation (5 cols) */}
            <div className="col-span-5 space-y-6">
              {/* Ring Visualization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">
                  Agent Ring
                </h2>
                <RingVisualization session={session} />
              </div>

              {/* Agent Conversation */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">
                  Agent Discussion
                </h2>
                <AgentConversationPanel session={session} />
              </div>
            </div>

            {/* Right Panel - Results & Approval (4 cols) */}
            <div className="col-span-4 space-y-6">
              {/* Simulation Results */}
              {session.simulation_result ? (
                <SimulationResultsPanel session={session} />
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-slate-200 mb-4">
                    Simulation Results
                  </h2>
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">
                        Running simulation...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Workflow */}
              {session.status === OptimizationStatus.COMPLETED && (
                <ApprovalWorkflow
                  session={session}
                  onApprove={handleApprove}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 bg-slate-900/30 mt-8">
        <div className="container mx-auto px-6 py-4">
          <p className="text-xs text-slate-500 text-center">
            AI Optimizer • Powered by 5 specialized agents • Ring consensus topology
          </p>
        </div>
      </div>
    </div>
  );
}
