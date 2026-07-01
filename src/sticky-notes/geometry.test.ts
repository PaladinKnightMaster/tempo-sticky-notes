import { describe, expect, it } from 'vitest';
import {
  clampPoint,
  containsPoint,
  isNoteOverTrash,
  moveRect,
  normalizeRect,
  resizeRect,
} from './geometry';

describe('normalizeRect', () => {
  it('normalizes a top-left to bottom-right drag', () => {
    const rect = normalizeRect({ x: 10, y: 20 }, { x: 110, y: 120 });
    expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it('normalizes a bottom-right to top-left drag', () => {
    const rect = normalizeRect({ x: 110, y: 120 }, { x: 10, y: 20 });
    expect(rect).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it('normalizes a horizontally reversed drag', () => {
    const rect = normalizeRect({ x: 100, y: 20 }, { x: 10, y: 120 });
    expect(rect).toEqual({ x: 10, y: 20, width: 90, height: 100 });
  });

  it('normalizes a vertically reversed drag', () => {
    const rect = normalizeRect({ x: 10, y: 120 }, { x: 100, y: 20 });
    expect(rect).toEqual({ x: 10, y: 20, width: 90, height: 100 });
  });
});

describe('clampPoint', () => {
  it('leaves a point inside the board unchanged', () => {
    const point = clampPoint({ x: 50, y: 50 }, { width: 1024, height: 768 });
    expect(point).toEqual({ x: 50, y: 50 });
  });

  it('clamps a point outside the negative edges', () => {
    const point = clampPoint({ x: -20, y: -30 }, { width: 1024, height: 768 });
    expect(point).toEqual({ x: 0, y: 0 });
  });

  it('clamps a point beyond the far edges', () => {
    const point = clampPoint({ x: 2000, y: 900 }, { width: 1024, height: 768 });
    expect(point).toEqual({ x: 1024, y: 768 });
  });
});

describe('moveRect', () => {
  const boardSize = { width: 1024, height: 768 };
  const noteSize = { width: 120, height: 80 };

  it('positions the note at pointer minus offset', () => {
    const rect = moveRect({ x: 200, y: 200 }, { x: 20, y: 10 }, noteSize, boardSize);
    expect(rect).toEqual({ x: 180, y: 190, width: 120, height: 80 });
  });

  it('clamps movement at the left/top boundary', () => {
    const rect = moveRect({ x: 5, y: 5 }, { x: 20, y: 20 }, noteSize, boardSize);
    expect(rect).toEqual({ x: 0, y: 0, width: 120, height: 80 });
  });

  it('clamps movement at the right/bottom boundary', () => {
    const rect = moveRect({ x: 1020, y: 760 }, { x: 0, y: 0 }, noteSize, boardSize);
    expect(rect).toEqual({ x: 904, y: 688, width: 120, height: 80 });
  });
});

describe('resizeRect', () => {
  const boardSize = { width: 1024, height: 768 };
  const minimumSize = { width: 120, height: 80 };
  const original = { x: 100, y: 100, width: 200, height: 150 };

  it('grows the rect toward the current pointer', () => {
    const rect = resizeRect(
      original,
      { x: 300, y: 250 },
      { x: 350, y: 300 },
      boardSize,
      minimumSize,
    );
    expect(rect).toEqual({ x: 100, y: 100, width: 250, height: 200 });
  });

  it('enforces the minimum width', () => {
    const rect = resizeRect(
      original,
      { x: 300, y: 250 },
      { x: 0, y: 250 },
      boardSize,
      minimumSize,
    );
    expect(rect.width).toBe(120);
  });

  it('enforces the minimum height', () => {
    const rect = resizeRect(
      original,
      { x: 300, y: 250 },
      { x: 300, y: 0 },
      boardSize,
      minimumSize,
    );
    expect(rect.height).toBe(80);
  });

  it('prevents resizing past the right board edge', () => {
    const rect = resizeRect(
      original,
      { x: 300, y: 250 },
      { x: 5000, y: 250 },
      boardSize,
      minimumSize,
    );
    expect(rect.width).toBe(boardSize.width - original.x);
  });

  it('prevents resizing past the bottom board edge', () => {
    const rect = resizeRect(
      original,
      { x: 300, y: 250 },
      { x: 300, y: 5000 },
      boardSize,
      minimumSize,
    );
    expect(rect.height).toBe(boardSize.height - original.y);
  });
});

describe('containsPoint', () => {
  const rect = { x: 100, y: 100, width: 50, height: 50 };

  it('returns true for a point inside the rect', () => {
    expect(containsPoint(rect, { x: 120, y: 120 })).toBe(true);
  });

  it('returns false for a point outside the rect', () => {
    expect(containsPoint(rect, { x: 10, y: 10 })).toBe(false);
  });
});

describe('isNoteOverTrash', () => {
  const trash = { x: 900, y: 700, width: 96, height: 96 };

  it('is true when the note center is inside the trash zone', () => {
    const note = { x: 880, y: 680, width: 40, height: 40 };
    expect(isNoteOverTrash(note, trash)).toBe(true);
  });

  it('is false when the note only overlaps the trash zone without its center inside', () => {
    const note = { x: 850, y: 650, width: 40, height: 40 };
    expect(isNoteOverTrash(note, trash)).toBe(false);
  });
});
