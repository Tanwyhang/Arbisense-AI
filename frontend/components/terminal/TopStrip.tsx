'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface TopStripProps {
  title?: string;
  user?: string;
  systemStatus?: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
}

interface FunctionKey {
  key: string;
  label: string;
  action: string;
}

export default function TopStrip({
  title = 'ARBISENSE',
  user = 'ADMIN',
  systemStatus = 'ONLINE'
}: TopStripProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleFunctionKey = useCallback((action: string) => {
    console.log(`Function key triggered: ${action}`);

    switch (action) {
      case 'HELP':
        alert('ARBISENSE Terminal Help\n\n[F1] HELP - Show this help dialog\n[F2] SCAN - Scan arbitrage opportunities\n[F3] ANALYZE - Analyze current position\n[F4] OPTIMIZE - AI Parameter Optimizer\n[F5] SETUP - Bot Setup Wizard\n[F6] EXPORT - Export data\n[F7] SETTINGS - Configure settings\n[F8] REFRESH - Refresh data\n[F9] LOGOUT - Logout session');
        break;
      case 'SCAN':
        router.push('/dashboard');
        break;
      case 'ANALYZE':
        router.push('/evaluation');
        break;
      case 'OPTIMIZE':
        router.push('/optimizer');
        break;
      case 'SETUP':
        router.push('/setup');
        break;
      case 'EXPORT':
        window.print();
        break;
      case 'SETTINGS':
        alert('Settings panel coming soon');
        break;
      case 'CLEAR':
        if (confirm('Clear terminal session?')) {
          localStorage.clear();
          window.location.reload();
        }
        break;
      case 'REFRESH':
        window.location.reload();
        break;
      case 'LOGOUT':
        if (confirm('Logout session?')) {
          router.push('/');
        }
        break;
    }
  }, [router]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.startsWith('F')) {
        const fKeyNumber = parseInt(e.key.substring(1));
        if (fKeyNumber >= 1 && fKeyNumber <= 9) {
          e.preventDefault();
          const actions = ['HELP', 'SCAN', 'ANALYZE', 'OPTIMIZE', 'SETUP', 'EXPORT', 'SETTINGS', 'REFRESH', 'LOGOUT'];
          handleFunctionKey(actions[fKeyNumber - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleFunctionKey]);

  const statusColor = {
    ONLINE: 'var(--success-ag-green)',
    OFFLINE: 'var(--alert-signal-red)',
    DEGRADED: 'var(--accent-amber)'
  }[systemStatus];

  const functionKeys: FunctionKey[] = [
    { key: 'F1', label: 'HELP', action: 'HELP' },
    { key: 'F2', label: 'SCAN', action: 'SCAN' },
    { key: 'F3', label: 'ANALYZE', action: 'ANALYZE' },
    { key: 'F4', label: 'OPTIMIZE', action: 'OPTIMIZE' },
    { key: 'F5', label: 'SETUP', action: 'SETUP' },
    { key: 'F6', label: 'EXPORT', action: 'EXPORT' },
    { key: 'F7', label: 'SETTINGS', action: 'SETTINGS' },
    { key: 'F8', label: 'REFRESH', action: 'REFRESH' },
    { key: 'F9', label: 'LOGOUT', action: 'LOGOUT' },
  ];

  const FunctionKeyButton = ({ fKey }: { fKey: FunctionKey }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <button
        onClick={() => handleFunctionKey(fKey.action)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: isHovered ? 'var(--text-white)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-data)',
          padding: '2px 6px',
          transition: 'color 0.2s ease',
          fontWeight: 500
        }}
      >
        [{fKey.key}] {fKey.label}
      </button>
    );
  };

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'var(--terminal-black)',
      borderBottom: '2px solid var(--accent-financial-blue)',
      padding: 'var(--space-2) var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-data)',
      fontSize: '0.75rem',
      letterSpacing: '0.05em'
    }}>
      {/* Left Section - Title & Menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)'
      }}>
        {/* Logo/Title */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 900,
          color: 'var(--accent-financial-blue)',
          letterSpacing: '0.15em',
          textShadow: '0 0 10px rgba(0, 102, 255, 0.5)'
        }}>
          {title}
        </div>

        {/* Menu Items */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          fontSize: '0.7rem'
        }}>
          {functionKeys.map((fKey) => (
            <FunctionKeyButton key={fKey.key} fKey={fKey} />
          ))}
        </div>
      </div>

      {/* Center Section - System Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        color: 'var(--text-muted)',
        fontSize: '0.7rem'
      }}>
        <span style={{ color: 'var(--accent-cyan)' }}>●</span>
        <span>REALTIME</span>
        <span style={{ color: 'var(--grid-line)' }}>│</span>
        <span>LATENCY: 847ms</span>
        <span style={{ color: 'var(--grid-line)' }}>│</span>
        <span style={{ color: 'var(--success-ag-green)' }}>SLA MET</span>
      </div>

      {/* Right Section - User & Time */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)'
      }}>
        {/* System Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '2px 8px',
          border: '1px solid var(--border-dim)',
          background: 'var(--terminal-dark-blue)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: statusColor,
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite'
          }}></span>
          <span style={{ color: 'var(--text-white)', fontSize: '0.65rem' }}>
            {systemStatus}
          </span>
        </div>

        {/* User */}
        <div style={{
          padding: '2px 8px',
          border: '1px solid var(--border-dim)',
          background: 'var(--terminal-dark-blue)',
          color: 'var(--accent-cyan)',
          fontSize: '0.65rem'
        }}>
          USER: {user}
        </div>

        {/* Time */}
        <div style={{
          padding: '2px 8px',
          border: '1px solid var(--accent-financial-blue)',
          background: 'var(--terminal-panel-blue)',
          color: 'var(--text-white)',
          fontSize: '0.65rem',
          minWidth: '80px',
          textAlign: 'center'
        }}>
          {currentTime.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </div>
    </div>
  );
}
