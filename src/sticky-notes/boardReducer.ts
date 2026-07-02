import {
  DEFAULT_NOTE_COLOR,
  MIN_CREATION_THRESHOLD,
  MIN_DELETE_DRAG_DISTANCE,
  MIN_NOTE_SIZE,
} from './constants';
import {
  clampPoint,
  fitRectToBoard,
  isNoteOverTrash,
  moveRect,
  normalizeRect,
  resizeRect,
} from './geometry';
import type { BoardAction, BoardState, Point, Rect } from './types';

function assertNever(value: never): never {
  throw new Error(`Unexpected action: ${JSON.stringify(value)}`);
}

function hasDraggedFarEnough(
  grabbed: { readonly originalRect: Rect; readonly pointerOffset: Point },
  point: Point,
): boolean {
  const grabX = grabbed.originalRect.x + grabbed.pointerOffset.x;
  const grabY = grabbed.originalRect.y + grabbed.pointerOffset.y;
  return Math.hypot(point.x - grabX, point.y - grabY) >= MIN_DELETE_DRAG_DISTANCE;
}

function bringNoteToFront<T extends { id: string }>(notes: readonly T[], noteId: string): T[] {
  const note = notes.find((candidate) => candidate.id === noteId);
  if (!note) {
    return notes as T[];
  }
  return [...notes.filter((candidate) => candidate.id !== noteId), note];
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (
    state.interaction &&
    (action.type === 'creationStarted' ||
      action.type === 'movementStarted' ||
      action.type === 'resizeStarted')
  ) {
    return state;
  }

  switch (action.type) {
    case 'creationStarted': {
      return {
        ...state,
        interaction: {
          kind: 'creating',
          pointerId: action.pointerId,
          draftId: action.draftId,
          origin: action.point,
          preview: { x: action.point.x, y: action.point.y, width: 0, height: 0 },
        },
      };
    }

    case 'movementStarted': {
      const note = state.notes.find((candidate) => candidate.id === action.noteId);
      if (!note) {
        return state;
      }

      return {
        notes: bringNoteToFront(state.notes, action.noteId),
        interaction: {
          kind: 'moving',
          pointerId: action.pointerId,
          noteId: action.noteId,
          pointerOffset: {
            x: action.point.x - note.rect.x,
            y: action.point.y - note.rect.y,
          },
          originalRect: note.rect,
          preview: note.rect,
          deleteCandidate: false,
        },
      };
    }

    case 'resizeStarted': {
      const note = state.notes.find((candidate) => candidate.id === action.noteId);
      if (!note) {
        return state;
      }

      return {
        notes: bringNoteToFront(state.notes, action.noteId),
        interaction: {
          kind: 'resizing',
          pointerId: action.pointerId,
          noteId: action.noteId,
          originPointer: action.point,
          originalRect: note.rect,
          preview: note.rect,
        },
      };
    }

    case 'pointerFrameReceived': {
      const { interaction } = state;
      if (!interaction || interaction.pointerId !== action.pointerId) {
        return state;
      }

      const point = clampPoint(action.point, action.boardSize);

      switch (interaction.kind) {
        case 'creating': {
          const preview = normalizeRect(interaction.origin, point);
          return { ...state, interaction: { ...interaction, preview } };
        }

        case 'moving': {
          const preview = moveRect(
            point,
            interaction.pointerOffset,
            interaction.originalRect,
            action.boardSize,
          );
          const deleteCandidate =
            hasDraggedFarEnough(interaction, point) && isNoteOverTrash(preview, action.trashRect);
          return { ...state, interaction: { ...interaction, preview, deleteCandidate } };
        }

        case 'resizing': {
          const preview = resizeRect(
            interaction.originalRect,
            interaction.originPointer,
            point,
            action.boardSize,
            MIN_NOTE_SIZE,
          );
          return { ...state, interaction: { ...interaction, preview } };
        }

        default:
          return assertNever(interaction);
      }
    }

    case 'pointerReleased': {
      const { interaction } = state;
      if (!interaction || interaction.pointerId !== action.pointerId) {
        return state;
      }

      const point = clampPoint(action.point, action.boardSize);

      switch (interaction.kind) {
        case 'creating': {
          const draft = normalizeRect(interaction.origin, point);
          if (
            draft.width < MIN_CREATION_THRESHOLD.width ||
            draft.height < MIN_CREATION_THRESHOLD.height
          ) {
            return { ...state, interaction: null };
          }

          const finalRect = fitRectToBoard(
            {
              x: draft.x,
              y: draft.y,
              width: Math.max(draft.width, MIN_NOTE_SIZE.width),
              height: Math.max(draft.height, MIN_NOTE_SIZE.height),
            },
            action.boardSize,
          );

          return {
            notes: [
              ...state.notes,
              { id: interaction.draftId, rect: finalRect, color: DEFAULT_NOTE_COLOR },
            ],
            interaction: null,
          };
        }

        case 'moving': {
          const finalRect = moveRect(
            point,
            interaction.pointerOffset,
            interaction.originalRect,
            action.boardSize,
          );

          if (
            hasDraggedFarEnough(interaction, point) &&
            isNoteOverTrash(finalRect, action.trashRect)
          ) {
            return {
              notes: state.notes.filter((note) => note.id !== interaction.noteId),
              interaction: null,
            };
          }

          return {
            notes: state.notes.map((note) =>
              note.id === interaction.noteId ? { ...note, rect: finalRect } : note,
            ),
            interaction: null,
          };
        }

        case 'resizing': {
          const finalRect = resizeRect(
            interaction.originalRect,
            interaction.originPointer,
            point,
            action.boardSize,
            MIN_NOTE_SIZE,
          );

          return {
            notes: state.notes.map((note) =>
              note.id === interaction.noteId ? { ...note, rect: finalRect } : note,
            ),
            interaction: null,
          };
        }

        default:
          return assertNever(interaction);
      }
    }

    case 'interactionCancelled': {
      return { ...state, interaction: null };
    }

    case 'colorChanged': {
      const note = state.notes.find((candidate) => candidate.id === action.noteId);
      if (!note) {
        return state;
      }

      return {
        ...state,
        notes: state.notes.map((candidate) =>
          candidate.id === action.noteId ? { ...candidate, color: action.color } : candidate,
        ),
      };
    }

    case 'boardResized': {
      let anyNoteMoved = false;
      const notes = state.notes.map((note) => {
        const fitted = fitRectToBoard(note.rect, action.boardSize);
        if (
          fitted.x === note.rect.x &&
          fitted.y === note.rect.y &&
          fitted.width === note.rect.width &&
          fitted.height === note.rect.height
        ) {
          return note;
        }
        anyNoteMoved = true;
        return { ...note, rect: fitted };
      });

      return anyNoteMoved ? { ...state, notes } : state;
    }

    default:
      return assertNever(action);
  }
}
