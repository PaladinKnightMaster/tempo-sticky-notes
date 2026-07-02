import { describe, expect, it } from 'vitest';
import { boardReducer } from './boardReducer';
import type { BoardState } from './types';

const boardSize = { width: 1024, height: 768 };
const trashRect = { x: 900, y: 650, width: 96, height: 96 };

function emptyState(): BoardState {
  return { notes: [], interaction: null };
}

describe('boardReducer - creation', () => {
  it('starts a creation interaction', () => {
    const state = boardReducer(emptyState(), {
      type: 'creationStarted',
      pointerId: 1,
      draftId: 'note-1',
      point: { x: 50, y: 60 },
    });

    expect(state.interaction).toEqual({
      kind: 'creating',
      pointerId: 1,
      draftId: 'note-1',
      origin: { x: 50, y: 60 },
      preview: { x: 50, y: 60, width: 0, height: 0 },
    });
    expect(state.notes).toEqual([]);
  });

  it('updates the creation preview on pointer frame', () => {
    const started = boardReducer(emptyState(), {
      type: 'creationStarted',
      pointerId: 1,
      draftId: 'note-1',
      point: { x: 50, y: 60 },
    });

    const moved = boardReducer(started, {
      type: 'pointerFrameReceived',
      pointerId: 1,
      point: { x: 200, y: 220 },
      boardSize,
      trashRect,
    });

    expect(moved.interaction).toMatchObject({
      kind: 'creating',
      preview: { x: 50, y: 60, width: 150, height: 160 },
    });
  });

  it('commits a valid creation on release', () => {
    const started = boardReducer(emptyState(), {
      type: 'creationStarted',
      pointerId: 1,
      draftId: 'note-1',
      point: { x: 50, y: 60 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 250, y: 260 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toEqual([
      { id: 'note-1', rect: { x: 50, y: 60, width: 200, height: 200 }, color: 'yellow' },
    ]);
  });

  it('ignores a creation drag below the accidental-gesture threshold', () => {
    const started = boardReducer(emptyState(), {
      type: 'creationStarted',
      pointerId: 1,
      draftId: 'note-1',
      point: { x: 50, y: 60 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 55, y: 65 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toEqual([]);
  });
});

describe('boardReducer - movement', () => {
  function stateWithNote(): BoardState {
    return {
      notes: [{ id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' }],
      interaction: null,
    };
  }

  it('starts a movement interaction with the correct pointer offset', () => {
    const state = boardReducer(stateWithNote(), {
      type: 'movementStarted',
      pointerId: 2,
      noteId: 'note-1',
      point: { x: 120, y: 110 },
    });

    expect(state.interaction).toEqual({
      kind: 'moving',
      pointerId: 2,
      noteId: 'note-1',
      pointerOffset: { x: 20, y: 10 },
      originalRect: { x: 100, y: 100, width: 120, height: 80 },
      preview: { x: 100, y: 100, width: 120, height: 80 },
      deleteCandidate: false,
    });
  });

  it('commits the moved note position on release', () => {
    const started = boardReducer(stateWithNote(), {
      type: 'movementStarted',
      pointerId: 2,
      noteId: 'note-1',
      point: { x: 120, y: 110 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 2,
      point: { x: 220, y: 210 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toEqual([
      { id: 'note-1', rect: { x: 200, y: 200, width: 120, height: 80 }, color: 'yellow' },
    ]);
  });

  it('deletes the active note when released over the trash zone', () => {
    const started = boardReducer(stateWithNote(), {
      type: 'movementStarted',
      pointerId: 2,
      noteId: 'note-1',
      point: { x: 120, y: 110 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 2,
      point: { x: 950, y: 700 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toEqual([]);
  });
});

describe('boardReducer - trash safety', () => {
  // A note already resting over the trash zone (created or resized into that corner).
  function stateWithNoteOnTrash(): BoardState {
    return {
      notes: [{ id: 'note-1', rect: { x: 850, y: 600, width: 120, height: 80 }, color: 'yellow' }],
      interaction: null,
    };
  }

  it('does not delete a note resting over the trash zone on a plain click', () => {
    const started = boardReducer(stateWithNoteOnTrash(), {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 910, y: 660 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 910, y: 660 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toHaveLength(1);
  });

  it('does not flag a delete candidate for a sub-threshold jitter over the trash zone', () => {
    const started = boardReducer(stateWithNoteOnTrash(), {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 910, y: 660 },
    });

    const jittered = boardReducer(started, {
      type: 'pointerFrameReceived',
      pointerId: 1,
      point: { x: 912, y: 661 },
      boardSize,
      trashRect,
    });

    expect(jittered.interaction).toMatchObject({ kind: 'moving', deleteCandidate: false });
  });

  it('still deletes after a real drag that ends over the trash zone', () => {
    const started = boardReducer(stateWithNoteOnTrash(), {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 910, y: 660 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 950, y: 700 },
      boardSize,
      trashRect,
    });

    expect(released.notes).toEqual([]);
  });

  it('does not delete when a resize ends over the trash zone', () => {
    const state: BoardState = {
      notes: [{ id: 'note-1', rect: { x: 700, y: 500, width: 150, height: 100 }, color: 'yellow' }],
      interaction: null,
    };

    const started = boardReducer(state, {
      type: 'resizeStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 850, y: 600 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 1000, y: 760 },
      boardSize,
      trashRect,
    });

    expect(released.notes).toHaveLength(1);
    expect(released.notes[0]?.rect.width).toBeGreaterThan(150);
  });
});

describe('boardReducer - move to front', () => {
  function stateWithTwoNotes(): BoardState {
    return {
      notes: [
        { id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' },
        { id: 'note-2', rect: { x: 150, y: 120, width: 120, height: 80 }, color: 'yellow' },
      ],
      interaction: null,
    };
  }

  it('moves a note to the end of the list (rendered on top) when a drag starts', () => {
    const state = boardReducer(stateWithTwoNotes(), {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 110, y: 110 },
    });

    expect(state.notes.map((note) => note.id)).toEqual(['note-2', 'note-1']);
  });

  it('moves a note to the end of the list when a resize starts', () => {
    const state = boardReducer(stateWithTwoNotes(), {
      type: 'resizeStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 220, y: 180 },
    });

    expect(state.notes.map((note) => note.id)).toEqual(['note-2', 'note-1']);
  });

  it('leaves the order unchanged if the note is already last', () => {
    const state = boardReducer(stateWithTwoNotes(), {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-2',
      point: { x: 160, y: 130 },
    });

    expect(state.notes.map((note) => note.id)).toEqual(['note-1', 'note-2']);
  });
});

describe('boardReducer - resize', () => {
  function stateWithNote(): BoardState {
    return {
      notes: [{ id: 'note-1', rect: { x: 100, y: 100, width: 200, height: 150 }, color: 'yellow' }],
      interaction: null,
    };
  }

  it('starts a resize interaction', () => {
    const state = boardReducer(stateWithNote(), {
      type: 'resizeStarted',
      pointerId: 3,
      noteId: 'note-1',
      point: { x: 300, y: 250 },
    });

    expect(state.interaction).toEqual({
      kind: 'resizing',
      pointerId: 3,
      noteId: 'note-1',
      originPointer: { x: 300, y: 250 },
      originalRect: { x: 100, y: 100, width: 200, height: 150 },
      preview: { x: 100, y: 100, width: 200, height: 150 },
    });
  });

  it('commits the resized dimensions on release', () => {
    const started = boardReducer(stateWithNote(), {
      type: 'resizeStarted',
      pointerId: 3,
      noteId: 'note-1',
      point: { x: 300, y: 250 },
    });

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 3,
      point: { x: 350, y: 300 },
      boardSize,
      trashRect,
    });

    expect(released.interaction).toBeNull();
    expect(released.notes).toEqual([
      { id: 'note-1', rect: { x: 100, y: 100, width: 250, height: 200 }, color: 'yellow' },
    ]);
  });
});

describe('boardReducer - cancellation', () => {
  it('restores committed notes and clears the interaction', () => {
    const initial: BoardState = {
      notes: [{ id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' }],
      interaction: null,
    };

    const started = boardReducer(initial, {
      type: 'movementStarted',
      pointerId: 2,
      noteId: 'note-1',
      point: { x: 120, y: 110 },
    });

    const moved = boardReducer(started, {
      type: 'pointerFrameReceived',
      pointerId: 2,
      point: { x: 500, y: 500 },
      boardSize,
      trashRect,
    });

    const cancelled = boardReducer(moved, { type: 'interactionCancelled' });

    expect(cancelled.interaction).toBeNull();
    expect(cancelled.notes).toEqual(initial.notes);
  });
});

describe('boardReducer - mismatched pointer id', () => {
  it('ignores frame updates from a pointer id other than the active one', () => {
    const started = boardReducer(
      { notes: [], interaction: null },
      {
        type: 'creationStarted',
        pointerId: 1,
        draftId: 'note-1',
        point: { x: 50, y: 60 },
      },
    );

    const ignored = boardReducer(started, {
      type: 'pointerFrameReceived',
      pointerId: 99,
      point: { x: 500, y: 500 },
      boardSize,
      trashRect,
    });

    expect(ignored).toBe(started);
  });

  it('ignores a new interaction started by a different pointer while one is active', () => {
    const state: BoardState = {
      notes: [
        { id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' },
        { id: 'note-2', rect: { x: 300, y: 100, width: 120, height: 80 }, color: 'yellow' },
      ],
      interaction: null,
    };

    const started = boardReducer(state, {
      type: 'movementStarted',
      pointerId: 1,
      noteId: 'note-1',
      point: { x: 110, y: 110 },
    });

    const hijackAttempt = boardReducer(started, {
      type: 'movementStarted',
      pointerId: 2,
      noteId: 'note-2',
      point: { x: 310, y: 110 },
    });

    expect(hijackAttempt).toBe(started);
  });
});

describe('boardReducer - color', () => {
  it('assigns the default color to a newly created note', () => {
    const started = boardReducer(
      { notes: [], interaction: null },
      {
        type: 'creationStarted',
        pointerId: 1,
        draftId: 'note-1',
        point: { x: 50, y: 60 },
      },
    );

    const released = boardReducer(started, {
      type: 'pointerReleased',
      pointerId: 1,
      point: { x: 250, y: 260 },
      boardSize,
      trashRect,
    });

    expect(released.notes[0]?.color).toBe('yellow');
  });

  it('changes only the targeted note color', () => {
    const state: BoardState = {
      notes: [
        { id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' },
        { id: 'note-2', rect: { x: 300, y: 100, width: 120, height: 80 }, color: 'yellow' },
      ],
      interaction: null,
    };

    const updated = boardReducer(state, {
      type: 'colorChanged',
      noteId: 'note-2',
      color: 'blue',
    });

    expect(updated.notes.map((note) => note.color)).toEqual(['yellow', 'blue']);
  });

  it('ignores a color change for an unknown note id', () => {
    const state: BoardState = {
      notes: [{ id: 'note-1', rect: { x: 100, y: 100, width: 120, height: 80 }, color: 'yellow' }],
      interaction: null,
    };

    const updated = boardReducer(state, {
      type: 'colorChanged',
      noteId: 'does-not-exist',
      color: 'blue',
    });

    expect(updated).toBe(state);
  });
});
