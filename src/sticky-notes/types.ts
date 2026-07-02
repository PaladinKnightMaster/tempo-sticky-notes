export type NoteId = string;

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export interface StickyNote {
  readonly id: NoteId;
  readonly rect: Rect;
  readonly color: NoteColor;
}

export type Interaction =
  | {
      readonly kind: 'creating';
      readonly pointerId: number;
      readonly draftId: NoteId;
      readonly origin: Point;
      readonly preview: Rect;
    }
  | {
      readonly kind: 'moving';
      readonly pointerId: number;
      readonly noteId: NoteId;
      readonly pointerOffset: Point;
      readonly originalRect: Rect;
      readonly preview: Rect;
      readonly deleteCandidate: boolean;
    }
  | {
      readonly kind: 'resizing';
      readonly pointerId: number;
      readonly noteId: NoteId;
      readonly originPointer: Point;
      readonly originalRect: Rect;
      readonly preview: Rect;
    };

export interface BoardState {
  readonly notes: readonly StickyNote[];
  readonly interaction: Interaction | null;
}

export type BoardAction =
  | {
      readonly type: 'creationStarted';
      readonly pointerId: number;
      readonly draftId: NoteId;
      readonly point: Point;
    }
  | {
      readonly type: 'movementStarted';
      readonly pointerId: number;
      readonly noteId: NoteId;
      readonly point: Point;
    }
  | {
      readonly type: 'resizeStarted';
      readonly pointerId: number;
      readonly noteId: NoteId;
      readonly point: Point;
    }
  | {
      readonly type: 'pointerFrameReceived';
      readonly pointerId: number;
      readonly point: Point;
      readonly boardSize: Size;
      readonly trashRect: Rect;
    }
  | {
      readonly type: 'pointerReleased';
      readonly pointerId: number;
      readonly point: Point;
      readonly boardSize: Size;
      readonly trashRect: Rect;
    }
  | {
      readonly type: 'interactionCancelled';
    }
  | {
      readonly type: 'colorChanged';
      readonly noteId: NoteId;
      readonly color: NoteColor;
    };
