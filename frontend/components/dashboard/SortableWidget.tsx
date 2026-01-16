import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  title?: string;
  minimal?: boolean;
}

export function SortableWidget({ id, children, title, minimal }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    marginBottom: minimal ? 'var(--space-2)' : 'var(--space-4)',
    position: 'relative' as const,
    height: minimal ? 'auto' : undefined,
  };

  if (minimal) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
      >
        <div style={{
          padding: 'var(--space-3)',
          border: '1px solid var(--accent-financial-blue)',
          background: 'rgba(5, 5, 5, 0.6)',
          borderRadius: '4px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-white)',
          letterSpacing: '0.05em',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
        onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
        >
          <div style={{ color: 'var(--accent-financial-blue)' }}>⠿</div>
          {title || id}
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="widget-container">
      {/* Widget Header / Handle */}
      <div 
        {...attributes} 
        {...listeners}
        style={{
          padding: 'var(--space-2) var(--space-3)',
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--bg-layer-2)',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          marginBottom: 0
        }}
        onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
        onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {title || id}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          ⠿
        </div>
      </div>
      
      {/* Content */}
      <div style={{
        background: 'rgba(5, 5, 5, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-dim)',
        borderTop: 'none',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </div>
    </div>
  );
}
