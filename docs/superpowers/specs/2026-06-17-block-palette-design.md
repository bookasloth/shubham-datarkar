# Block Palette — Visual Component Inserter

**Date:** 2026-06-17
**Branch:** `feat/admin-blog-post-ui`
**Status:** Approved design

## Problem

The admin blog editor (`src/components/admin/block-editor.tsx`) adds blocks via a
single `<select>` dropdown + "Add block" button at the bottom. New blocks always
append to the end; to place one mid-document you append then reorder with ↑↓.
With 50 block types the dropdown is slow to scan and gives no visual preview.

## Goal

Insert any of the 50 block types **anywhere** in the document via a **+ button**
that opens a **visual palette modal** (grid of icons + labels), in roughly two
clicks.

## Design

### 1. Block metadata — `src/components/admin/blocks/block-types.ts`

Extend each `BLOCK_TYPES` entry with two fields:

- `icon`: a `lucide-react` icon component for the tile.
- `rank`: a number for blog-popularity ordering (lower = more popular = shown
  first). Drives modal order instead of the current group ordering.

Indicative rank order (most → least popular for a blog post):
`p, h2, h3, lead, ul, ol, figure, quote, callout, code, takeaways, pullquote,
divider, h4, small, caption, tasklist, table, faq, cta, ...` down through the
rarer blocks (`pricing, map, audio, footnotes, references, comparisonTable`).
Exact numbers chosen during implementation; trivially editable later.

The existing `group` + `label` fields stay (group still used elsewhere / future).

### 2. Palette modal — `src/components/admin/blocks/block-palette.tsx` (new)

Client component built on existing `src/components/ui/dialog.tsx`.

Props:

```ts
{
  open: boolean;
  onClose: () => void;
  onPick: (type: BlockType) => void;
}
```

Contents:

- **Search box** (`src/components/ui/input.tsx`) at top — case-insensitive
  filter on `label`.
- **Grid** of rounded-square tiles, ordered by `rank` (filtered list preserves
  rank order). Each tile: big lucide icon + small label beneath.
- **Interaction:**
  - Single-click a tile → highlights it + reveals an **Insert** button in the
    modal's top-right corner.
  - Double-click a tile → inserts immediately.
  - Clicking **Insert** inserts the highlighted tile.
  - Any insert calls `onPick(type)` then closes the modal.
- Monochrome styling consistent with the rest of admin (no color, no emoji).

### 3. Editor wiring — `src/components/admin/block-editor.tsx`

- Remove the bottom `<select>` + "Add block" row.
- Render a thin **+** divider button between every block and at the very top.
- Render a larger **+** card at the bottom for append.
- Track palette state: `{ open: boolean; index: number | null }`. Clicking any +
  sets `index` to the target insert position and opens the modal.
- New helper:

  ```ts
  const insertAt = (index: number, type: BlockType) =>
    setBlocks((b) => {
      const copy = [...b];
      copy.splice(index, 0, registry[type].create());
      return copy;
    });
  ```

- `onPick` → `insertAt(index, type)` → reset palette state.
- Existing per-block ↑ ↓ ✕ controls and the hidden `body` JSON input are
  unchanged.

## Data flow

`click + (at index)` → set `{ open: true, index }` → modal → pick type →
`insertAt(index, type)` → `{ open: false, index: null }`.

Pure client-side React state. The serialized output (hidden `body` input =
`JSON.stringify(blocks)`) is byte-identical in shape to today, so **no changes**
to save actions, `ContentBlock` types, the registry's `create()`/`Editor`
contract, or front-end rendering.

## Out of scope

- Drag-and-drop reordering (keep ↑↓).
- Backend, schema, or migration changes (none needed).
- Changing any block's editor or rendered output.
- Categorized/grouped modal view (ordering is by popularity rank, plus search).

## Files

| File | Change |
|------|--------|
| `src/components/admin/blocks/block-types.ts` | add `icon` + `rank` per entry |
| `src/components/admin/blocks/block-palette.tsx` | new modal component |
| `src/components/admin/block-editor.tsx` | + buttons, modal wiring, `insertAt` |

## Testing

- Existing `registry.test.ts` must still pass (every type creatable).
- Add a check that every `BLOCK_TYPES` entry has an `icon` and a unique `rank`
  (parallels the registry-completeness guarantee).
