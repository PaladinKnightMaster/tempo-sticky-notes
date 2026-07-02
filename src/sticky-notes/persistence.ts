import { DEFAULT_NOTE_COLOR, NOTE_COLORS } from './constants';
import type { NoteColor, Rect, StickyNote } from './types';

export const NOTES_STORAGE_KEY = 'tempo-sticky-notes:notes';

interface StoredNoteShape {
  readonly id: string;
  readonly rect: Rect;
  readonly color?: unknown;
}

function isValidColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value);
}

function isValidNoteShape(value: unknown): value is StoredNoteShape {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  if (typeof note.id !== 'string') return false;

  if (typeof note.rect !== 'object' || note.rect === null) return false;
  const rect = note.rect as Record<string, unknown>;
  return (
    typeof rect.x === 'number' &&
    typeof rect.y === 'number' &&
    typeof rect.width === 'number' &&
    typeof rect.height === 'number'
  );
}

function normalizeNote(stored: StoredNoteShape): StickyNote {
  return {
    id: stored.id,
    rect: stored.rect,
    color: isValidColor(stored.color) ? stored.color : DEFAULT_NOTE_COLOR,
  };
}

export function parseStoredNotes(raw: string | null): StickyNote[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidNoteShape).map(normalizeNote);
  } catch {
    return [];
  }
}

export function loadNotes(): StickyNote[] {
  try {
    return parseStoredNotes(window.localStorage.getItem(NOTES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveNotes(notes: readonly StickyNote[]): void {
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded) - persistence is best-effort.
  }
}
