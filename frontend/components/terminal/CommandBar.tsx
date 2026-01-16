'use client';

import { useState, useRef, useEffect } from 'react';

interface CommandBarProps {
  onCommand?: (command: string) => void;
  placeholder?: string;
}

export default function CommandBar({
  onCommand,
  placeholder = 'Type command... (try: HELP, SCAN, ANALYZE, EXPORT, CLEAR)'
}: CommandBarProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { key: 'F1', label: 'HELP', action: 'help' },
    { key: 'F2', label: 'SCAN', action: 'scan' },
    { key: 'F3', label: 'ANALYZE', action: 'analyze' },
    { key: 'F4', label: 'EXPORT', action: 'export' },
    { key: 'F5', label: 'SETTINGS', action: 'settings' },
    { key: 'F6', label: 'CLEAR', action: 'clear' },
    { key: 'F7', label: 'REFRESH', action: 'refresh' },
    { key: 'F8', label: 'LOGOUT', action: 'logout' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      setHistory([...history, command]);
      setHistoryIndex(-1);
      onCommand?.(command);
      setCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const handleQuickCommand = (action: string) => {
    const cmd = action.toUpperCase();
    setHistory([...history, cmd]);
    onCommand?.(cmd);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'var(--terminal-black)',
      borderTop: '2px solid var(--accent-financial-blue)',
      padding: 'var(--space-3) var(--space-4)',
      fontFamily: 'var(--font-data)'
    }}>
      {/* Command Input */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-2)'
      }}>
        {/* Prompt */}
        <div style={{
          color: 'var(--accent-financial-blue)',
          fontSize: '0.875rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(0, 102, 255, 0.4)'
        }}>
          ARBISENSE&gt;
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'var(--terminal-panel-blue)',
            border: '1px solid var(--border-dim)',
            color: 'var(--text-white)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-data)',
            outline: 'none',
            caretColor: 'var(--accent-financial-blue)'
          }}
        />

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--accent-financial-blue)',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--text-white)',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-cyan)';
            e.currentTarget.style.color = 'var(--terminal-black)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-financial-blue)';
            e.currentTarget.style.color = 'var(--text-white)';
          }}
        >
          [ENTER]
        </button>
      </form>

      {/* Quick Commands - Function Keys */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        borderTop: '1px solid var(--border-dim)',
        paddingTop: 'var(--space-2)'
      }}>
        {commands.map((cmd) => (
          <button
            key={cmd.key}
            onClick={() => handleQuickCommand(cmd.action)}
            style={{
              padding: '4px 12px',
              background: 'var(--terminal-dark-blue)',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-muted)',
              fontSize: '0.65rem',
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-financial-blue)';
              e.currentTarget.style.color = 'var(--text-white)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--terminal-dark-blue)';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-dim)';
            }}
          >
            <span style={{ color: 'var(--accent-amber)' }}>{cmd.key}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
