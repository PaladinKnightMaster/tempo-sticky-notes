import { memo } from 'react';
import type { NoteId, Rect } from './types';

interface StickyNoteProps {
  readonly id: NoteId;
  readonly rect: Rect;
  readonly isActive: boolean;
  readonly onMoveStart: (id: NoteId, event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onResizeStart: (id: NoteId, event: React.PointerEvent<HTMLDivElement>) => void;
}

function StickyNoteComponent({ id, rect, isActive, onMoveStart, onResizeStart }: StickyNoteProps) {
  return (
    <div
      className={`sticky-note${isActive ? ' sticky-note--active' : ''}`}
      style={
        {
          '--note-x': `${rect.x}px`,
          '--note-y': `${rect.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        } as React.CSSProperties
      }
      onPointerDown={(event) => onMoveStart(id, event)}
    >
      <div
        className="sticky-note__resize-handle"
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeStart(id, event);
        }}
      />
    </div>
  );
}

export const StickyNote = memo(StickyNoteComponent);
