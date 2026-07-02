import { describe, expect, it } from 'vitest';
import { parseStoredNotes } from './persistence';

describe('parseStoredNotes', () => {
  it('returns an empty array for null input', () => {
    expect(parseStoredNotes(null)).toEqual([]);
  });

  it('returns an empty array for invalid JSON', () => {
    expect(parseStoredNotes('{not json')).toEqual([]);
  });

  it('returns an empty array when the JSON is not an array', () => {
    expect(parseStoredNotes('{"id":"note-1"}')).toEqual([]);
  });

  it('parses a valid array of notes', () => {
    const raw = JSON.stringify([
      { id: 'note-1', rect: { x: 10, y: 20, width: 120, height: 80 } },
    ]);
    expect(parseStoredNotes(raw)).toEqual([
      { id: 'note-1', rect: { x: 10, y: 20, width: 120, height: 80 } },
    ]);
  });

  it('drops entries missing required fields', () => {
    const raw = JSON.stringify([
      { id: 'note-1', rect: { x: 10, y: 20, width: 120, height: 80 } },
      { id: 'note-2' },
      { rect: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'note-3', rect: { x: 0, y: 0, width: 'wide', height: 80 } },
    ]);
    expect(parseStoredNotes(raw)).toEqual([
      { id: 'note-1', rect: { x: 10, y: 20, width: 120, height: 80 } },
    ]);
  });
});
