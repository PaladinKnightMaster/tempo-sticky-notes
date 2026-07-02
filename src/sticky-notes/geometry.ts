import type { Point, Rect, Size } from './types';

export function normalizeRect(origin: Point, current: Point): Rect {
  return {
    x: Math.min(origin.x, current.x),
    y: Math.min(origin.y, current.y),
    width: Math.abs(current.x - origin.x),
    height: Math.abs(current.y - origin.y),
  };
}

export function clampPoint(point: Point, boardSize: Size): Point {
  return {
    x: Math.min(Math.max(point.x, 0), boardSize.width),
    y: Math.min(Math.max(point.y, 0), boardSize.height),
  };
}

export function moveRect(
  pointer: Point,
  pointerOffset: Point,
  noteSize: Size,
  boardSize: Size,
): Rect {
  const maxX = Math.max(boardSize.width - noteSize.width, 0);
  const maxY = Math.max(boardSize.height - noteSize.height, 0);

  return {
    x: Math.min(Math.max(pointer.x - pointerOffset.x, 0), maxX),
    y: Math.min(Math.max(pointer.y - pointerOffset.y, 0), maxY),
    width: noteSize.width,
    height: noteSize.height,
  };
}

export function resizeRect(
  original: Rect,
  originPointer: Point,
  currentPointer: Point,
  boardSize: Size,
  minimumSize: Size,
): Rect {
  const deltaX = currentPointer.x - originPointer.x;
  const deltaY = currentPointer.y - originPointer.y;

  const maxWidth = Math.max(boardSize.width - original.x, minimumSize.width);
  const maxHeight = Math.max(boardSize.height - original.y, minimumSize.height);

  const width = Math.min(Math.max(original.width + deltaX, minimumSize.width), maxWidth);
  const height = Math.min(Math.max(original.height + deltaY, minimumSize.height), maxHeight);

  return {
    x: original.x,
    y: original.y,
    width,
    height,
  };
}

export function fitRectToBoard(rect: Rect, boardSize: Size): Rect {
  const width = Math.min(rect.width, boardSize.width);
  const height = Math.min(rect.height, boardSize.height);

  return {
    x: Math.min(Math.max(rect.x, 0), boardSize.width - width),
    y: Math.min(Math.max(rect.y, 0), boardSize.height - height),
    width,
    height,
  };
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function isNoteOverTrash(noteRect: Rect, trashRect: Rect): boolean {
  return (
    noteRect.x < trashRect.x + trashRect.width &&
    noteRect.x + noteRect.width > trashRect.x &&
    noteRect.y < trashRect.y + trashRect.height &&
    noteRect.y + noteRect.height > trashRect.y
  );
}
