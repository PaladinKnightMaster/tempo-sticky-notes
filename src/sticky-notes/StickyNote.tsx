import { memo } from 'react';
import { NOTE_COLORS } from './constants';
import type { NoteColor, NoteId, Rect } from './types';

interface StickyNoteProps {
  readonly id: NoteId;
  readonly rect: Rect;
  readonly color: NoteColor;
  readonly isActive: boolean;
  readonly isDeleteCandidate: boolean;
  readonly onMoveStart: (id: NoteId, event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onResizeStart: (id: NoteId, event: React.PointerEvent<HTMLDivElement>) => void;
  readonly onColorChange: (id: NoteId, color: NoteColor) => void;
}

function StickyNoteComponent({
  id,
  rect,
  color,
  isActive,
  isDeleteCandidate,
  onMoveStart,
  onResizeStart,
  onColorChange,
}: StickyNoteProps) {
  const className = [
    'sticky-note',
    `sticky-note--${color}`,
    isActive && 'sticky-note--active',
    isDeleteCandidate && 'sticky-note--delete-candidate',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
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
      <div className="sticky-note__colors" onPointerDown={(event) => event.stopPropagation()}>
        {NOTE_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Set note color to ${swatch}`}
            className={`sticky-note__color-swatch sticky-note__color-swatch--${swatch}${
              swatch === color ? ' sticky-note__color-swatch--selected' : ''
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onColorChange(id, swatch);
            }}
          />
        ))}
      </div>
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
