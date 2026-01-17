/**
 * Ring Visualization
 * Displays 5 agents in a ring topology with active agent highlighting
 */
'use client';

import { useEffect, useState } from 'react';
import { AgentRole, AGENT_CONFIGS, AgentMessage, OptimizationStatus } from '@/types/optimizer';

interface Props {
  session: any;
}

export default function RingVisualization({ session }: Props) {
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [messageFlow, setMessageFlow] = useState<boolean[]>([false, false, false, false, false]);

  // Animate message flow when agents are speaking
  useEffect(() => {
    if (session?.agent_messages && session.agent_messages.length > 0) {
      const lastMessage = session.agent_messages[session.agent_messages.length - 1];
      setActiveAgent(lastMessage.agent_id);

      // Animate flow to next agent
      const agentIndex = Object.values(AgentRole).indexOf(lastMessage.agent_id);
      const newFlow = [false, false, false, false, false];
      newFlow[(agentIndex + 1) % 5] = true;
      setMessageFlow(newFlow);

      // Reset after animation
      setTimeout(() => {
        setMessageFlow([false, false, false, false, false]);
      }, 1000);
    }
  }, [session?.agent_messages]);

  const agents = Object.values(AgentRole);
  const radius = 100;
  const centerX = 150;
  const centerY = 150;

  const getAgentPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const getAgentPath = (fromIndex: number, toIndex: number) => {
    const from = getAgentPosition(fromIndex);
    const to = getAgentPosition(toIndex);

    // Curved path
    const midAngle = ((fromIndex * 2 * Math.PI) / 5 + (toIndex * 2 * Math.PI) / 5) / 2 - Math.PI / 2;
    const midRadius = radius * 0.7;
    const midX = centerX + midRadius * Math.cos(midAngle);
    const midY = centerY + midRadius * Math.sin(midAngle);

    return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Connection paths (ring) */}
        {agents.map((_, i) => {
          const nextIndex = (i + 1) % 5;
          return (
            <path
              key={i}
              d={getAgentPath(i, nextIndex)}
              fill="none"
              stroke={messageFlow[i] ? '#60a5fa' : '#334155'}
              strokeWidth={messageFlow[i] ? 3 : 2}
              strokeDasharray={messageFlow[i] ? '0' : '5,5'}
              className={messageFlow[i] ? 'animate-pulse' : ''}
            />
          );
        })}

        {/* Agents */}
        {agents.map((agentRole, i) => {
          const pos = getAgentPosition(i);
          const config = AGENT_CONFIGS[agentRole];
          const isActive = activeAgent === agentRole;
          const messageCount = session?.agent_messages?.filter(
            (m: AgentMessage) => m.agent_id === agentRole
          ).length || 0;

          return (
            <g key={agentRole}>
              {/* Outer glow for active agent */}
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={35}
                  fill={config.color}
                  opacity={0.3}
                  className="animate-ping"
                />
              )}

              {/* Agent circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={30}
                fill="#1e293b"
                stroke={isActive ? config.color : '#475569'}
                strokeWidth={isActive ? 3 : 2}
                className="cursor-pointer transition-all duration-300 hover:scale-110"
                onClick={() => setActiveAgent(isActive ? null : agentRole)}
              />

              {/* Agent emoji */}
              <text
                x={pos.x}
                y={pos.y + 6}
                textAnchor="middle"
                fontSize={24}
                className="select-none"
              >
                {config.emoji}
              </text>

              {/* Message count badge */}
              {messageCount > 0 && (
                <>
                  <circle cx={pos.x + 20} cy={pos.y - 20} r={10} fill="#3b82f6" />
                  <text
                    x={pos.x + 20}
                    y={pos.y - 16}
                    textAnchor="middle"
                    fontSize={10}
                    fill="white"
                    fontWeight="bold"
                    className="select-none"
                  >
                    {messageCount}
                  </text>
                </>
              )}

              {/* Agent name label */}
              <text
                x={pos.x}
                y={pos.y + 50}
                textAnchor="middle"
                fontSize={11}
                fill={isActive ? config.color : '#94a3b8'}
                fontWeight={isActive ? 600 : 400}
                className="select-none"
              >
                {config.name}
              </text>
            </g>
          );
        })}

        {/* Center icon */}
        <g>
          <circle cx={centerX} cy={centerY} r={20} fill="#1e293b" stroke="#475569" strokeWidth={2} />
          <text x={centerX} y={centerY + 5} textAnchor="middle" fontSize={20}>
            🔄
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-5 gap-2 mt-4 w-full">
        {agents.map((agentRole) => {
          const config = AGENT_CONFIGS[agentRole];
          return (
            <div key={agentRole} className="text-center">
              <div
                className="text-xs mb-1"
                style={{ color: config.color }}
              >
                {config.emoji}
              </div>
              <div className="text-xs text-slate-500 leading-tight">
                {config.name.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
