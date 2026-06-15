# Admin Block Editors — Design

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Topic:** Friendly form editors for all blog block types in the admin post editor

## Problem

The blog renderer supports **50 `ContentBlock` types** ([src/components/content/article-body.tsx](../../../src/components/content/article-body.tsx)).
The admin authoring UI ([src/components/admin/block-editor.tsx](../../../src/components/admin/block-editor.tsx)) gives friendly
fields to only **12 core types** (`CORE_TYPES`). The other **38 fall through to a raw-JSON `<textarea>`** — authors
hand-write block JSON. Authoring fidelity lags rendering fidelity badly.

## Goal

Every block type gets a real, hand-built form editor. Add a true inline rich-text editor producing `InlineNode[]` spans.
Server, persistence, and renderer stay unchanged — the work is entirely client-side in the admin editor.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Coverage | All 50 block types (38 advanced + 12 core upgraded) |
| Build style | Hand-built editor component per block type |
| Rich-text fields | Real inline span editor → `InlineNode[]` (not plain string) |
| Inline editor mechanism | **Hybrid**: contentEditable for 10 simple wraps, chip/popover for 4 param-bearing spans |

## Architecture

Registry-driven. One source of truth maps each block `type` to its label, group, factory, and editor component.

```
src/components/admin/blocks/
  registry.tsx        # type -> { label, group, create(), Editor }. Drives add-menu + field dispatch.
  fields/             # shared controlled inputs, reused across all 50 editors
    text-field.tsx        # plain string input/textarea
    rich-text-field.tsx   # the hybrid inline span editor (RichText -> InlineNode[])
    list-field.tsx        # string[] and ListItem[] (incl. nested sub-lists)
    repeater-field.tsx    # generic array-of-objects editor (add/remove/reorder + row render-prop)
    select-field.tsx      # enum/variant pickers
    number-field.tsx
    image-field.tsx       # EditorialImage (seed/alt/caption/ratio)
  editors/            # 50 hand-built editor components, grouped into files by category
    typography.tsx lists.tsx media.tsx quotes.tsx code.tsx tables.tsx
    callouts.tsx interactive.tsx embeds.tsx data.tsx utility.tsx
    conversion.tsx knowledge.tsx advanced.tsx
```

### `BlockEditor` changes ([src/components/admin/block-editor.tsx](../../../src/components/admin/block-editor.tsx))
Keeps its existing role: list shell (add / reorder / remove, hidden `body` JSON input). Three edits:
1. `BlockFields` switch → registry dispatch: `registry[block.type]?.Editor`.
2. Flat 12-item `<select>` → **grouped picker over all 50 types**, grouped by the same 14 categories used in the
   renderer's section comments (Typography, Lists, Media, Quotes, Code, Tables, Callouts, Interactive, Embeds,
   Data & statistics, Utility, Conversion, Knowledge, Advanced).
3. **Raw-JSON `<textarea>` kept** as fallback for any unknown/legacy block type — escape hatch preserved.

### Unchanged
- Save flow: editor serializes `blocks` → hidden `body` input → `parseBody` → `ContentBlock[]`
  ([src/lib/blog/actions.ts](../../../src/lib/blog/actions.ts)).
- Renderer ([article-body.tsx](../../../src/components/content/article-body.tsx)), DB schema, server actions.
- `countWords` already walks `InlineNode[]` spans ([src/lib/blog/words.ts](../../../src/lib/blog/words.ts)) — no change needed.

## Component contracts

**Editor component:** `({ block, onChange }: { block: T; onChange: (b: T) => void }) => JSX`. Controlled. No local
persistence — state lives in `BlockEditor.blocks`, which serializes to JSON on every change (already wired).

**`RepeaterField<T>`:** owns add/remove/reorder for an object array; renders each row via a `renderRow(item, onChange)`
render-prop. Used by the ~15 blocks carrying object arrays (faq, tabs, table rows, comparisonCards, steps, timeline,
references, footnotes, statCards, metricsGrid, buttonGroup, resourceList, prosCons, quickFacts, figures/gallery).

**`RichTextField` (hybrid inline editor):**
- `InlineNode` simple wraps (10): `b, i, u, s, mark, small, code, kbd, sub, sup` — toolbar toggle over a selection in a
  contentEditable surface.
- Param-bearing spans (4): `a(href), tooltip(tip), popover(content), fn(n)` — rendered as styled, non-editable chips;
  clicking a chip opens a popover form to edit its params; a toolbar action inserts a new one over the selection.
- Source of truth is `InlineNode[]` (or plain `string` when unformatted). Serialize contentEditable DOM → `InlineNode[]`
  on input; chips carry their node data directly so param round-trip is deterministic.

## Registry completeness guard

Registry typed so every `ContentBlock["type"]` must have an entry — a missing editor is a **compile error**, not a silent
JSON fallback. Backed by a unit test asserting each block type resolves to a non-fallback editor.

## Error handling

- Unknown/legacy block type → raw-JSON fallback (unchanged behavior, never crashes the form).
- `RichTextField` always emits valid `RichText` (`string` or `InlineNode[]`); empty → `""`.
- Malformed JSON in the fallback textarea is ignored until valid (existing behavior).

## Testing

- `RichTextField` round-trip: `InlineNode[]` → render → serialize → identical `InlineNode[]` (the fragile part).
- Registry completeness: every `ContentBlock["type"]` maps to a real editor.
- `RepeaterField`: add / remove / reorder mutate the array correctly.
- `words.test.ts` already covers `countWords` over spans — keep green.

## Phasing (for the implementation plan)

1. **Spine:** `registry.tsx` skeleton + shared fields (`TextField`, `SelectField`, `NumberField`, `ListField`,
   `RepeaterField`, `ImageField`) + wire `BlockEditor` dispatch and grouped add-menu (editors still JSON-fallback).
2. **`RichTextField`:** hybrid inline editor + round-trip tests.
3. **Editors in category batches:** typography/lists/quotes/code first (simplest), then tables/data/knowledge/advanced
   (repeater-heavy), then media/embeds/interactive/conversion/utility.
4. Completeness guard test + cleanup of the old `CORE_TYPES`/`BlockFields` path.

## Out of scope

- Drag-and-drop block reordering (keep current ↑/↓ buttons).
- Live preview pane.
- Image upload (EditorialImage stays seed-based per current model).
