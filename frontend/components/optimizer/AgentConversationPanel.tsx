/**
 * Agent Conversation Panel
 * Displays agent discussion in a chat-like interface
 */
'use client';

import { useMemo, useRef, useEffect } from 'react';
import { AgentRole, AGENT_CONFIGS, AgentMessage } from '@/types/optimizer';

interface Props {
  session: any;
}

export default function AgentConversationPanel({ session }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.agent_messages]);

  const groupedMessages = useMemo(() => {
    if (!session?.agent_messages) return [];

    const groups: Record<number, AgentMessage[]> = {};
    session.agent_messages.forEach((msg: AgentMessage) => {
      if (!groups[msg.round_number]) {
        groups[msg.round_number] = [];
      }
      groups[msg.round_number].push(msg);
    });

    return Object.entries(groups).sort(([a], [b]) => parseInt(a) - parseInt(b));
  }, [session?.agent_messages]);

  if (!session?.agent_messages || session.agent_messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <div className="text-center">
          <div className="text-4xl mb-3">💭</div>
          <p className="text-sm">Waiting for agents to start discussion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {groupedMessages.map(([roundStr, messages]) => {
        const round = parseInt(roundStr);
        return (
          <div key={round} className="space-y-3">
            {/* Round header */}
            <div className="flex items-center gap-2 sticky top-0 bg-slate-900 py-2 z-10">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Round {round}
              </div>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Messages */}
            {messages.map((msg: AgentMessage, idx: number) => {
              const config = AGENT_CONFIGS[msg.agent_id];
              const isLast = idx === messages.length - 1;

              return (
                <div
                  key={msg.timestamp}
                  className={`flex gap-3 ${isLast ? 'mb-4' : ''}`}
                  style={{
                    borderLeft: `3px solid ${config.color}`,
                    paddingLeft: '12px'
                  }}
                >
                  {/* Agent avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{
                        backgroundColor: `${config.color}20`,
                        border: `2px solid ${config.color}`
                      }}
                    >
                      {config.emoji}
                    </div>
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: config.color }}
                      >
                        {msg.agent_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        Confidence: {(msg.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Reasoning */}
                    <div className="text-sm text-slate-300 leading-relaxed mb-2">
                      {msg.rationale}
                    </div>

                    {/* Parameter suggestions */}
                    {Object.keys(msg.parameter_suggestions).length > 0 && (
                      <div className="bg-slate-800/50 rounded p-2 mt-2">
                        <div className="text-xs text-slate-400 mb-1">Suggested changes:</div>
                        <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                          {Object.entries(msg.parameter_suggestions).slice(0, 4).map(([key, value]) => (
                            <div key={key} className="text-slate-300">
                              <span className="text-slate-500">{key}:</span>{' '}
                              <span className="text-blue-400">
                                {typeof value === 'number' ? value.toFixed(2) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
