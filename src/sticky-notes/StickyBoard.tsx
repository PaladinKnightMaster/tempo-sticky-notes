import { useCallback, useEffect, useReducer, useRef } from 'react';
import { boardReducer } from './boardReducer';
import { TRASH_ZONE_MARGIN, TRASH_ZONE_SIZE } from './constants';
import { loadNotes, saveNotes } from './persistence';
import { StickyNote } from './StickyNote';
import { TrashZone } from './TrashZone';
import type { BoardState, NoteId, Point, Rect, Size, StickyNote as NoteRecord } from './types';
import './StickyBoard.css';

function createInitialState(): BoardState {
  return { notes: loadNotes(), interaction: null };
}

function createNoteId(): NoteId {
  return crypto.randomUUID();
}

function renderedRect(
  note: NoteRecord,
  state: BoardState,
): { rect: Rect; isActive: boolean; isDeleteCandidate: boolean } {
  const { interaction } = state;
  if (interaction && interaction.kind !== 'creating' && interaction.noteId === note.id) {
    const isDeleteCandidate = interaction.kind === 'moving' && interaction.deleteCandidate;
    return { rect: interaction.preview, isActive: true, isDeleteCandidate };
  }
  return { rect: note.rect, isActive: false, isDeleteCandidate: false };
}

export function StickyBoard() {
  const [state, dispatch] = useReducer(boardReducer, undefined, createInitialState);
  const boardRef = useRef<HTMLDivElement>(null);
  const latestPointerRef = useRef<Point | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  function toBoardPoint(event: { clientX: number; clientY: number }): Point {
    const bounds = boardRef.current!.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function getBoardSize(): Size {
    const bounds = boardRef.current!.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height };
  }

  function getTrashRect(boardSize: Size): Rect {
    return {
      x: boardSize.width - TRASH_ZONE_SIZE.width - TRASH_ZONE_MARGIN,
      y: boardSize.height - TRASH_ZONE_SIZE.height - TRASH_ZONE_MARGIN,
      width: TRASH_ZONE_SIZE.width,
      height: TRASH_ZONE_SIZE.height,
    };
  }

  function cancelScheduledFrame() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    latestPointerRef.current = toBoardPoint(event);

    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const point = latestPointerRef.current;
      if (!point) return;
      const boardSize = getBoardSize();
      dispatch({
        type: 'pointerFrameReceived',
        pointerId: event.pointerId,
        point,
        boardSize,
        trashRect: getTrashRect(boardSize),
      });
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    cancelScheduledFrame();
    latestPointerRef.current = null;
    activePointerIdRef.current = null;
    const point = toBoardPoint(event);
    const boardSize = getBoardSize();
    dispatch({
      type: 'pointerReleased',
      pointerId: event.pointerId,
      point,
      boardSize,
      trashRect: getTrashRect(boardSize),
    });
  }

  function handlePointerCancel() {
    cancelScheduledFrame();
    latestPointerRef.current = null;
    activePointerIdRef.current = null;
    dispatch({ type: 'interactionCancelled' });
  }

  function handleBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dispatch({
      type: 'creationStarted',
      pointerId: event.pointerId,
      draftId: createNoteId(),
      point: toBoardPoint(event),
    });
  }

  const handleNoteMoveStart = useCallback((noteId: NoteId, event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dispatch({
      type: 'movementStarted',
      pointerId: event.pointerId,
      noteId,
      point: toBoardPoint(event),
    });
  }, []);

  const handleResizeStart = useCallback((noteId: NoteId, event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dispatch({
      type: 'resizeStarted',
      pointerId: event.pointerId,
      noteId,
      point: toBoardPoint(event),
    });
  }, []);

  useEffect(() => {
    if (!state.interaction) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelScheduledFrame();
        latestPointerRef.current = null;
        activePointerIdRef.current = null;
        dispatch({ type: 'interactionCancelled' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.interaction]);

  useEffect(() => {
    saveNotes(state.notes);
  }, [state.notes]);

  const trashActive = state.interaction?.kind === 'moving' && state.interaction.deleteCandidate;

  return (
    <div
      ref={boardRef}
      className="sticky-board"
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <p className="sticky-board__instructions">
        Drag empty space to create a note. Drag a note to move it, or its bottom-right handle to
        resize it. Drop a note on the trash zone to delete it. Press Escape to cancel.
      </p>

      {state.notes.map((note) => {
        const { rect, isActive, isDeleteCandidate } = renderedRect(note, state);
        return (
          <StickyNote
            key={note.id}
            id={note.id}
            rect={rect}
            isActive={isActive}
            isDeleteCandidate={isDeleteCandidate}
            onMoveStart={handleNoteMoveStart}
            onResizeStart={handleResizeStart}
          />
        );
      })}

      {state.interaction?.kind === 'creating' && (
        <div
          className="sticky-note sticky-note--preview"
          style={
            {
              '--note-x': `${state.interaction.preview.x}px`,
              '--note-y': `${state.interaction.preview.y}px`,
              width: `${state.interaction.preview.width}px`,
              height: `${state.interaction.preview.height}px`,
            } as React.CSSProperties
          }
        />
      )}

      <TrashZone isActive={trashActive === true} />
    </div>
  );
}
