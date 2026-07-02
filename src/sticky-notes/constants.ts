import type { NoteColor, Size } from './types';

export const MIN_NOTE_SIZE: Size = { width: 120, height: 80 };

export const MIN_CREATION_THRESHOLD: Size = { width: 40, height: 40 };

export const TRASH_ZONE_SIZE: Size = { width: 96, height: 96 };

export const TRASH_ZONE_MARGIN = 24;

// A move must travel at least this far before releasing over the trash zone deletes,
// so clicking a note that already rests on the trash corner cannot destroy it.
export const MIN_DELETE_DRAG_DISTANCE = 8;

export const NOTE_COLORS: readonly NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple'];

export const DEFAULT_NOTE_COLOR: NoteColor = 'yellow';
