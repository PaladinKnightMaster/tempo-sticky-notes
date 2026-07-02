import { useCallback, useEffect, useReducer, useRef } from 'react';
import { boardReducer } from './boardReducer';
import { TRASH_ZONE_MARGIN, TRASH_ZONE_SIZE } from './constants';
import { fitRectToBoard } from './geometry';
import { loadNotes, saveNotes } from './persistence';
import { StickyNote } from './StickyNote';
import { TrashZone } from './TrashZone';
import type {
  BoardState,
  NoteColor,
  NoteId,
  Point,
  Rect,
  Size,
  StickyNote as NoteRecord,
} from './types';
import './StickyBoard.css';

function createInitialState(): BoardState {
  // Notes saved on a larger screen could otherwise restore fully outside the
  // visible board and become unreachable. The board fills the viewport with a
  // 1024x768 minimum, so that size is known before the first render.
  const boardSize: Size = {
    width: Math.max(window.innerWidth, 1024),
    height: Math.max(window.innerHeight, 768),
  };

  return {
    notes: loadNotes().map((note) => ({ ...note, rect: fitRectToBoard(note.rect, boardSize) })),
    interaction: null,
  };
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
    if (activePointerIdRef.current !== event.pointerId) return;
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

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) return;
    cancelScheduledFrame();
    latestPointerRef.current = null;
    activePointerIdRef.current = null;
    dispatch({ type: 'interactionCancelled' });
  }

  // A drag may only start with the primary button, and never while another
  // pointer is already driving an interaction.
  function canStartInteraction(event: React.PointerEvent<HTMLDivElement>): boolean {
    return event.button === 0 && activePointerIdRef.current === null;
  }

  function handleBoardPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !canStartInteraction(event)) return;
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
    if (!canStartInteraction(event)) return;
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
    if (!canStartInteraction(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dispatch({
      type: 'resizeStarted',
      pointerId: event.pointerId,
      noteId,
      point: toBoardPoint(event),
    });
  }, []);

  const handleColorChange = useCallback((noteId: NoteId, color: NoteColor) => {
    dispatch({ type: 'colorChanged', noteId, color });
  }, []);

  const hasActiveInteraction = state.interaction !== null;

  useEffect(() => {
    if (!hasActiveInteraction) return;

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
  }, [hasActiveInteraction]);

  useEffect(() => {
    saveNotes(state.notes);
  }, [state.notes]);

  // Shrinking the window could otherwise strand a committed note outside the
  // clipped board with no way to reach it again.
  useEffect(() => {
    function handleWindowResize() {
      const board = boardRef.current;
      if (!board) return;
      const bounds = board.getBoundingClientRect();
      dispatch({ type: 'boardResized', boardSize: { width: bounds.width, height: bounds.height } });
    }

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const trashActive = state.interaction?.kind === 'moving' && state.interaction.deleteCandidate;

  return (
    <div
      ref={boardRef}
      className="sticky-board"
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
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
            color={note.color}
            isActive={isActive}
            isDeleteCandidate={isDeleteCandidate}
            onMoveStart={handleNoteMoveStart}
            onResizeStart={handleResizeStart}
            onColorChange={handleColorChange}
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
