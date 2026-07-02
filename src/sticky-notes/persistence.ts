import type { StickyNote } from './types';

export const NOTES_STORAGE_KEY = 'tempo-sticky-notes:notes';

function isValidNote(value: unknown): value is StickyNote {
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

export function parseStoredNotes(raw: string | null): StickyNote[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidNote);
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
