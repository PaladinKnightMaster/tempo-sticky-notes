# Tempo Sticky Notes

A single-page sticky notes board built with React and TypeScript. Supports all four core
interactions: create a note by dragging on empty board space, move a note by dragging its
body, resize it from a bottom-right handle, and delete it by dropping it on the trash zone.

## Requirements

- Node.js 20+ (developed and tested on Node 22)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in Chrome, Firefox, or Edge. The app targets a minimum viewport of
1024×768.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run typecheck` | Type-check with `tsc` (no emit) |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run validate` | Lint, typecheck, test, and build in sequence |

## Usage

- **Create**: drag on empty board space; release to commit the note.
- **Move**: drag a note's body.
- **Resize**: drag the small handle in a note's bottom-right corner.
- **Delete**: drag a note so it overlaps the trash zone (bottom-right) — it flashes red to
  confirm — and release.
- **Cancel**: press `Escape` at any point during a drag to discard it.

## Bonus features

- **Move to front**: picking up a note (to move or resize it) brings it to the top of the
  stack, so overlapping notes stay reachable.
- **Persistence**: notes are saved to `localStorage` on every change and restored on page load.
- **Colors**: click a color dot in a note's top-left corner to pick from 5 colors.

## Architecture

The board's renderable state — committed notes and the currently active interaction — lives
in a single `useReducer`. Creating, moving, and resizing are modeled as a TypeScript
discriminated union (`Interaction`), so the reducer can express start, update, commit, delete,
and cancel as explicit, exhaustively-checked transitions, and invalid combinations (e.g.
resizing and moving at once) are unrepresentable. Native Pointer Events with pointer capture
drive the interaction: the element that begins a drag captures the pointer, so subsequent
`pointermove`/`pointerup` events keep targeting it even if the cursor leaves the element or the
board.

Geometry — rectangle normalization for any drag direction, movement/resize clamping to the
board, minimum-size enforcement, and trash-zone hit testing (rectangle intersection, so a note
of any size can always be dropped on the trash zone once it's clamped against the board's
corner) — is implemented as small, pure, framework-independent functions,
tested directly with Vitest. Browser mechanics that don't need to trigger a render (the board's
DOM node, the latest raw pointer sample, the id of a scheduled animation frame, and the id of
the pointer currently driving an interaction) live in refs rather than reducer state, keeping
the reducer pure and the component free of stale-closure bugs around which pointer is active.

For performance, rapid `pointermove` samples are coalesced into at most one dispatched update
per animation frame, while the final `pointerup` position is always applied directly and
synchronously so a pending frame can never commit a stale position. Inactive notes keep stable
object references across renders (only the active note's preview changes), and note position
is rendered with a CSS `transform` rather than reflow-triggering `top`/`left` changes.

## Notes for reviewers

- No drag-and-drop library, UI component library, or state-management library is used, per the
  assessment's "no stock components" requirement — only React, TypeScript, Vite, and Vitest.
- Strict TypeScript is enabled (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`); there are no
  `any` types.
