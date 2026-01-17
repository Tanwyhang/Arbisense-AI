import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  title?: string;
  minimal?: boolean;
  isFocused?: boolean;
  onClick?: () => void;
}

// Hyprland-style snappy bezier animation
const HYPRLAND_BEZIER = 'cubic-bezier(0.05, 0.9, 0.1, 1.05)';
const ANIMATION_DURATION = '220ms';

export function SortableWidget({ id, children, title, minimal, isFocused, onClick }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const baseTransition = `transform ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}, box-shadow ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}, border-color ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || baseTransition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : isFocused ? 100 : 'auto',
    marginBottom: minimal ? 'var(--space-2)' : 'var(--space-4)',
    position: 'relative' as const,
    height: minimal ? 'auto' : undefined,
  };

  // Focus styles - Hyprland-inspired with cyan glow
  const focusStyles = isFocused ? {
    boxShadow: '0 0 0 2px var(--accent-cyan), 0 0 20px rgba(0, 255, 255, 0.3), 0 4px 20px rgba(0, 255, 255, 0.15)',
    borderColor: 'var(--accent-cyan)',
    transform: `${CSS.Transform.toString(transform) || ''} scale(1.005)`.trim(),
  } : {};

  if (minimal) {
    return (
      <div 
        ref={setNodeRef} 
        style={{ ...style, ...focusStyles }} 
        {...attributes} 
        {...listeners}
        onClick={onClick}
        tabIndex={0}
      >
        <div style={{
          padding: 'var(--space-3)',
          border: `1px solid ${isFocused ? 'var(--accent-cyan)' : 'var(--accent-financial-blue)'}`,
          background: isFocused ? 'rgba(0, 255, 255, 0.1)' : 'rgba(5, 5, 5, 0.6)',
          borderRadius: '4px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: isFocused ? 'var(--accent-cyan)' : 'var(--text-white)',
          letterSpacing: '0.05em',
          backdropFilter: 'blur(4px)',
          boxShadow: isFocused 
            ? '0 0 15px rgba(0, 255, 255, 0.4), 0 2px 4px rgba(0,0,0,0.2)' 
            : '0 2px 4px rgba(0,0,0,0.2)',
          transition: `all ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}`,
        }}
        onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
        onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
        >
          <div style={{ color: isFocused ? 'var(--accent-cyan)' : 'var(--accent-financial-blue)' }}>⠿</div>
          {title || id}
          {isFocused && (
            <div style={{ 
              marginLeft: 'auto', 
              fontSize: '0.6rem', 
              opacity: 0.7,
              fontFamily: 'var(--font-data)'
            }}>
              HJKL
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={{ ...style, ...focusStyles }} 
      className="widget-container"
      onClick={onClick}
      tabIndex={0}
    >
      {/* Widget Header / Handle */}
      <div 
        {...attributes} 
        {...listeners}
        style={{
          padding: 'var(--space-2) var(--space-3)',
          borderBottom: `1px solid ${isFocused ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
          background: isFocused ? 'rgba(0, 255, 255, 0.08)' : 'var(--bg-layer-2)',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          marginBottom: 0,
          transition: `all ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}`,
        }}
        onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
        onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: isFocused ? 'var(--accent-cyan)' : 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          {title || id}
          {isFocused && (
            <span style={{ 
              fontSize: '0.6rem', 
              opacity: 0.7,
              fontFamily: 'var(--font-data)',
              padding: '2px 6px',
              background: 'rgba(0, 255, 255, 0.2)',
              borderRadius: '3px',
            }}>
              H←  J↓  K↑  L→
            </span>
          )}
        </div>
        <div style={{ color: isFocused ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '12px' }}>
          ⠿
        </div>
      </div>
      
      {/* Content */}
      <div style={{
        background: 'rgba(5, 5, 5, 0.6)',
        backdropFilter: 'blur(10px)',
        borderTop: 'none',
        borderLeft: `1px solid ${isFocused ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
        borderRight: `1px solid ${isFocused ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
        borderBottom: `1px solid ${isFocused ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        transition: `border-color ${ANIMATION_DURATION} ${HYPRLAND_BEZIER}`,
        overflow: 'hidden', // Prevent content spillover
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
