# Admin Block Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the 50 blog `ContentBlock` types a hand-built form editor in the admin post editor, replacing the raw-JSON fallback for the 38 advanced types, plus a hybrid inline rich-text editor that produces `InlineNode[]` spans.

**Architecture:** A registry maps each block `type` to `{ label, group, create(), Editor }`. `BlockEditor` dispatches to `registry[type].Editor` and builds its add-menu from the registry. Editors compose shared controlled field primitives (`fields/`). Rich-text fields use a hybrid editor: contentEditable for simple wraps, chip/popover for param-bearing spans, with serialization extracted to a pure, unit-tested module. Server, DB, and renderer are unchanged.

**Tech Stack:** Next.js (App Router), React (client components), TypeScript, Tailwind, Vitest (logic-only tests — no jsdom in this repo).

---

## Conventions (read before starting)

- Editors are **controlled**: `({ block, onChange }: { block: T; onChange: (b: T) => void })`. State lives in `BlockEditor.blocks`.
- Match the existing admin style in [src/components/admin/block-editor.tsx](../../../src/components/admin/block-editor.tsx): raw `<input>/<select>/<textarea>` with `rounded-btn border border-border bg-background ... text-sm`. Use `cn` from `@/lib/utils`, `Button` from `@/components/ui/button`.
- `RichText = string | InlineNode[]`; `ListItem = RichText | { text: RichText; items: RichText[] }` ([src/lib/data/types.ts](../../../src/lib/data/types.ts)).
- Tests run with `npm test` (`vitest run`). Only **pure functions** are tested — no component rendering.
- Commit after every task.

## File structure

```
src/components/admin/blocks/
  block-types.ts        # BLOCK_TYPES const list + groups (single source for add-menu + tests)
  registry.tsx          # type -> { label, group, create(), Editor }; typed for completeness
  fields/
    text-field.tsx        # plain string
    select-field.tsx      # enum/variant
    number-field.tsx      # number
    list-field.tsx        # string[] and ListItem[]
    repeater-field.tsx    # generic object array
    image-field.tsx       # EditorialImage
    rich-text-field.tsx   # hybrid inline editor (component)
  rich-text-serialize.ts          # pure: htmlToNodes / nodesToHtml
  rich-text-serialize.test.ts
  registry.test.ts
  editors/
    typography.tsx lists.tsx quotes.tsx code.tsx tables.tsx callouts.tsx
    interactive.tsx embeds.tsx data.tsx utility.tsx conversion.tsx
    knowledge.tsx advanced.tsx media.tsx
```

`BlockEditor` is modified in place; everything else is new.

---

### Task 1: Block type list + groups

**Files:**
- Create: `src/components/admin/blocks/block-types.ts`
- Test: `src/components/admin/blocks/registry.test.ts` (created here, expanded in Task 3)

- [ ] **Step 1: Write the failing test**

```ts
// src/components/admin/blocks/registry.test.ts
import { describe, it, expect } from "vitest";
import { BLOCK_TYPES } from "./block-types";

describe("BLOCK_TYPES", () => {
  it("lists all 50 block types with a group each", () => {
    expect(BLOCK_TYPES).toHaveLength(50);
    for (const b of BLOCK_TYPES) {
      expect(typeof b.type).toBe("string");
      expect(typeof b.group).toBe("string");
      expect(typeof b.label).toBe("string");
    }
    // unique types
    expect(new Set(BLOCK_TYPES.map((b) => b.type)).size).toBe(50);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- registry`
Expected: FAIL — cannot find `./block-types`.

- [ ] **Step 3: Create the list**

```ts
// src/components/admin/blocks/block-types.ts
import type { ContentBlock } from "@/lib/data/types";

export type BlockType = ContentBlock["type"];
export type BlockGroup =
  | "Typography" | "Lists" | "Media" | "Quotes" | "Code" | "Tables"
  | "Callouts" | "Interactive" | "Embeds" | "Data & statistics"
  | "Utility" | "Conversion" | "Knowledge" | "Advanced";

export const BLOCK_TYPES: { type: BlockType; group: BlockGroup; label: string }[] = [
  { type: "h2", group: "Typography", label: "Heading 2" },
  { type: "h3", group: "Typography", label: "Heading 3" },
  { type: "h4", group: "Typography", label: "Heading 4" },
  { type: "lead", group: "Typography", label: "Lead paragraph" },
  { type: "p", group: "Typography", label: "Paragraph" },
  { type: "small", group: "Typography", label: "Small text" },
  { type: "caption", group: "Typography", label: "Caption" },
  { type: "ul", group: "Lists", label: "Bullet list" },
  { type: "ol", group: "Lists", label: "Numbered list" },
  { type: "tasklist", group: "Lists", label: "Task list" },
  { type: "figure", group: "Media", label: "Figure" },
  { type: "figures", group: "Media", label: "Side-by-side images" },
  { type: "gallery", group: "Media", label: "Gallery" },
  { type: "video", group: "Media", label: "Video embed" },
  { type: "audio", group: "Media", label: "Audio player" },
  { type: "quote", group: "Quotes", label: "Quote" },
  { type: "pullquote", group: "Quotes", label: "Pull quote" },
  { type: "code", group: "Code", label: "Code block" },
  { type: "table", group: "Tables", label: "Table" },
  { type: "comparisonTable", group: "Tables", label: "Comparison table" },
  { type: "pricing", group: "Tables", label: "Pricing table" },
  { type: "callout", group: "Callouts", label: "Callout" },
  { type: "faq", group: "Interactive", label: "FAQ" },
  { type: "tabs", group: "Interactive", label: "Tabs" },
  { type: "expand", group: "Interactive", label: "Expandable" },
  { type: "socialEmbed", group: "Embeds", label: "Social embed" },
  { type: "map", group: "Embeds", label: "Map" },
  { type: "statCards", group: "Data & statistics", label: "Stat cards" },
  { type: "metricsGrid", group: "Data & statistics", label: "Metrics grid" },
  { type: "progress", group: "Data & statistics", label: "Progress bar" },
  { type: "comparisonCards", group: "Data & statistics", label: "Comparison cards" },
  { type: "divider", group: "Utility", label: "Divider" },
  { type: "spacer", group: "Utility", label: "Spacer" },
  { type: "tags", group: "Utility", label: "Tags" },
  { type: "cta", group: "Conversion", label: "CTA banner" },
  { type: "newsletter", group: "Conversion", label: "Newsletter" },
  { type: "download", group: "Conversion", label: "Download card" },
  { type: "buttonGroup", group: "Conversion", label: "Button group" },
  { type: "takeaways", group: "Knowledge", label: "Key takeaways" },
  { type: "summary", group: "Knowledge", label: "Summary box" },
  { type: "prosCons", group: "Knowledge", label: "Pros & cons" },
  { type: "steps", group: "Knowledge", label: "Step guide" },
  { type: "timeline", group: "Knowledge", label: "Timeline" },
  { type: "references", group: "Knowledge", label: "References" },
  { type: "footnotes", group: "Knowledge", label: "Footnotes" },
  { type: "authorNote", group: "Advanced", label: "Author note" },
  { type: "expertInsight", group: "Advanced", label: "Expert insight" },
  { type: "relatedCard", group: "Advanced", label: "Related card" },
  { type: "resourceList", group: "Advanced", label: "Resource list" },
  { type: "quickFacts", group: "Advanced", label: "Quick facts" },
];
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/blocks/block-types.ts src/components/admin/blocks/registry.test.ts
git commit -m "feat(admin): block type list + groups for editor registry"
```

---

### Task 2: Rich-text serialization (pure functions)

The hybrid editor's brain. `nodesToHtml` renders `InlineNode[]` to an HTML string for contentEditable; `htmlToNodes` parses it back. Param-bearing spans (`a`, `tooltip`, `popover`, `fn`) are encoded as `<span data-t="..." data-...>` so the chip layer can find them.

**Files:**
- Create: `src/components/admin/blocks/rich-text-serialize.ts`
- Test: `src/components/admin/blocks/rich-text-serialize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/admin/blocks/rich-text-serialize.test.ts
import { describe, it, expect } from "vitest";
import { htmlToNodes, nodesToHtml, normalize } from "./rich-text-serialize";
import type { InlineNode } from "@/lib/data/types";

const roundtrip = (nodes: InlineNode[]) => normalize(htmlToNodes(nodesToHtml(nodes)));

describe("rich-text-serialize", () => {
  it("round-trips plain text", () => {
    expect(roundtrip(["hello world"])).toEqual(["hello world"]);
  });
  it("round-trips simple wraps", () => {
    const n: InlineNode[] = ["a ", { t: "b", text: "bold" }, " and ", { t: "code", text: "x" }];
    expect(roundtrip(n)).toEqual(n);
  });
  it("round-trips a link with href", () => {
    const n: InlineNode[] = ["see ", { t: "a", text: "docs", href: "/docs" }];
    expect(roundtrip(n)).toEqual(n);
  });
  it("round-trips tooltip, popover and footnote", () => {
    const n: InlineNode[] = [
      { t: "tooltip", text: "term", tip: "definition" },
      { t: "popover", text: "more", content: "details" },
      { t: "fn", n: 3 },
    ];
    expect(roundtrip(n)).toEqual(n);
  });
  it("normalize merges adjacent plain strings and drops empties", () => {
    expect(normalize(["a", "", "b"])).toEqual(["ab"]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- rich-text-serialize`
Expected: FAIL — cannot find `./rich-text-serialize`.

- [ ] **Step 3: Implement**

```ts
// src/components/admin/blocks/rich-text-serialize.ts
import type { InlineNode, RichText } from "@/lib/data/types";

const SIMPLE = ["b", "i", "u", "s", "mark", "small", "code", "kbd", "sub", "sup"] as const;
type SimpleTag = (typeof SIMPLE)[number];
const TAG: Record<SimpleTag, string> = {
  b: "strong", i: "em", u: "u", s: "s", mark: "mark",
  small: "small", code: "code", kbd: "kbd", sub: "sub", sup: "sup",
};
const REV: Record<string, SimpleTag> = Object.fromEntries(
  (Object.entries(TAG) as [SimpleTag, string][]).map(([k, v]) => [v.toUpperCase(), k]),
);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Render InlineNode[] (or string) to HTML for the contentEditable surface. */
export function nodesToHtml(value: RichText): string {
  const nodes = typeof value === "string" ? [value] : value;
  return nodes
    .map((node) => {
      if (typeof node === "string") return esc(node);
      if ((SIMPLE as readonly string[]).includes(node.t))
        return `<${TAG[node.t as SimpleTag]}>${esc((node as { text: string }).text)}</${TAG[node.t as SimpleTag]}>`;
      // param-bearing -> non-editable chip span
      if (node.t === "a")
        return `<span data-t="a" data-href="${esc(node.href)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "tooltip")
        return `<span data-t="tooltip" data-tip="${esc(node.tip)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "popover")
        return `<span data-t="popover" data-content="${esc(node.content)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "fn")
        return `<span data-t="fn" data-n="${node.n}" contenteditable="false">[${node.n}]</span>`;
      return "";
    })
    .join("");
}

/** Parse the contentEditable HTML back into InlineNode[]. */
export function htmlToNodes(html: string): InlineNode[] {
  const root = document.createElement("div");
  root.innerHTML = html;
  const out: InlineNode[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out.push(child.textContent ?? "");
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const t = child.dataset.t;
    if (t === "a") out.push({ t: "a", text: child.textContent ?? "", href: child.dataset.href ?? "" });
    else if (t === "tooltip") out.push({ t: "tooltip", text: child.textContent ?? "", tip: child.dataset.tip ?? "" });
    else if (t === "popover") out.push({ t: "popover", text: child.textContent ?? "", content: child.dataset.content ?? "" });
    else if (t === "fn") out.push({ t: "fn", n: Number(child.dataset.n ?? 0) });
    else {
      const simple = REV[child.tagName];
      if (simple) out.push({ t: simple, text: child.textContent ?? "" });
      else out.push(child.textContent ?? "");
    }
  });
  return normalize(out);
}

/** Merge adjacent strings, drop empty strings. */
export function normalize(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      if (node === "") continue;
      const last = out[out.length - 1];
      if (typeof last === "string") out[out.length - 1] = last + node;
      else out.push(node);
    } else out.push(node);
  }
  return out;
}

/** Collapse a single plain-string node array back to a bare string for cleaner storage. */
export function toRichText(nodes: InlineNode[]): RichText {
  const n = normalize(nodes);
  if (n.length === 0) return "";
  if (n.length === 1 && typeof n[0] === "string") return n[0];
  return n;
}
```

NOTE: `htmlToNodes` uses `document`, so the test needs a DOM. Vitest has no jsdom here — see Step 3b.

- [ ] **Step 3b: Add jsdom environment for this test file only**

Install jsdom (dev): `npm i -D jsdom`
Add at the top of `rich-text-serialize.test.ts`:

```ts
// @vitest-environment jsdom
```

(Per-file pragma — no global config change, keeps other tests on the default node env.)

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- rich-text-serialize`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/blocks/rich-text-serialize.ts src/components/admin/blocks/rich-text-serialize.test.ts package.json package-lock.json
git commit -m "feat(admin): pure rich-text serialize/deserialize for inline editor"
```

---

### Task 3: Shared field primitives — text, select, number

**Files:**
- Create: `src/components/admin/blocks/fields/text-field.tsx`, `select-field.tsx`, `number-field.tsx`

- [ ] **Step 1: Implement TextField**

```tsx
// src/components/admin/blocks/fields/text-field.tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function TextField({
  label, value, onChange, multiline, placeholder, className,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; className?: string;
}) {
  const cls = cn("w-full rounded-btn border border-border bg-background p-2 text-sm", className);
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {multiline ? (
        <textarea className={cn(cls, "min-h-20")} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={cls} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
```

- [ ] **Step 2: Implement SelectField**

```tsx
// src/components/admin/blocks/fields/select-field.tsx
"use client";
import { cn } from "@/lib/utils";

export function SelectField<T extends string>({
  label, value, options, onChange,
}: {
  label?: string; value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className={cn("rounded-btn border border-border bg-background px-2 py-1.5 text-sm")}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Implement NumberField**

```tsx
// src/components/admin/blocks/fields/number-field.tsx
"use client";
import { cn } from "@/lib/utils";

export function NumberField({
  label, value, onChange,
}: {
  label?: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input type="number" value={Number.isFinite(value) ? value : 0}
        className={cn("rounded-btn border border-border bg-background p-2 text-sm")}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </label>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in the new files.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/blocks/fields/text-field.tsx src/components/admin/blocks/fields/select-field.tsx src/components/admin/blocks/fields/number-field.tsx
git commit -m "feat(admin): text/select/number field primitives"
```

---

### Task 4: RepeaterField (generic object array)

**Files:**
- Create: `src/components/admin/blocks/fields/repeater-field.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/blocks/fields/repeater-field.tsx
"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function RepeaterField<T>({
  label, items, onChange, create, renderRow,
}: {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderRow: (item: T, onItemChange: (next: T) => void, index: number) => React.ReactNode;
}) {
  const set = (i: number, next: T) => onChange(items.map((x, idx) => (idx === i ? next : x)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <div className="grid gap-2">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-btn border border-border/70 p-2">
          <div className="flex justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
          </div>
          {renderRow(item, (next) => set(i, next), i)}
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, create()])}>
        Add item
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/blocks/fields/repeater-field.tsx
git commit -m "feat(admin): generic RepeaterField for object arrays"
```

---

### Task 5: ListField and ImageField

`ListField` edits `string[]` (one per line, like the existing editor) and, when `nested` is set, `ListItem[]` with optional sub-lists. `ImageField` edits an `EditorialImage`.

**Files:**
- Create: `src/components/admin/blocks/fields/list-field.tsx`, `image-field.tsx`

- [ ] **Step 1: Implement ListField**

```tsx
// src/components/admin/blocks/fields/list-field.tsx
"use client";
import type { ListItem, RichText } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const toLine = (x: ListItem): string =>
  typeof x === "string" ? x
  : Array.isArray(x) ? JSON.stringify(x)
  : typeof x.text === "string" ? x.text
  : JSON.stringify(x.text);

export function ListField({
  label, items, onChange,
}: {
  label?: string; items: ListItem[]; onChange: (items: ListItem[]) => void;
}) {
  // v1: flat string-per-line editing. Nested sub-lists author via JSON in advanced blocks.
  const text = items.map(toLine).join("\n");
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <textarea
        className={cn("min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm")}
        placeholder="one item per line"
        value={text}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean) as RichText[])}
      />
    </label>
  );
}
```

- [ ] **Step 2: Implement ImageField**

```tsx
// src/components/admin/blocks/fields/image-field.tsx
"use client";
import type { EditorialImage } from "@/lib/data/types";
import { TextField } from "./text-field";

export function ImageField({
  label, value, onChange,
}: {
  label?: string; value: EditorialImage; onChange: (v: EditorialImage) => void;
}) {
  return (
    <div className="grid gap-2 rounded-btn border border-border/70 p-2">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <TextField label="Seed" value={value.seed} onChange={(seed) => onChange({ ...value, seed })} />
      <TextField label="Alt" value={value.alt} onChange={(alt) => onChange({ ...value, alt })} />
      <TextField label="Ratio (e.g. 16/9)" value={value.ratio ?? ""} onChange={(ratio) => onChange({ ...value, ratio })} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (expected: no errors)

```bash
git add src/components/admin/blocks/fields/list-field.tsx src/components/admin/blocks/fields/image-field.tsx
git commit -m "feat(admin): list and image field primitives"
```

---

### Task 6: RichTextField component (hybrid inline editor)

contentEditable surface seeded from `nodesToHtml`; on input, serialize via `htmlToNodes` → `toRichText`. Toolbar wraps the selection in simple tags via `document.execCommand` (bold/italic/underline/strikethrough) and, for the rest, by wrapping the selected range in the matching element. Param spans insert a chip and open a popover form.

**Files:**
- Create: `src/components/admin/blocks/fields/rich-text-field.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/blocks/fields/rich-text-field.tsx
"use client";
import * as React from "react";
import type { RichText } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nodesToHtml, htmlToNodes, toRichText } from "../rich-text-serialize";

const SIMPLE_BTNS: { tag: string; label: string }[] = [
  { tag: "strong", label: "B" }, { tag: "em", label: "I" }, { tag: "u", label: "U" },
  { tag: "s", label: "S" }, { tag: "mark", label: "HL" }, { tag: "code", label: "</>" },
  { tag: "kbd", label: "Kbd" }, { tag: "small", label: "sm" },
  { tag: "sub", label: "x₂" }, { tag: "sup", label: "x²" },
];

export function RichTextField({
  label, value, onChange,
}: {
  label?: string; value: RichText; onChange: (v: RichText) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Seed once; do not re-seed on every keystroke (would reset the caret).
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML === "") ref.current.innerHTML = nodesToHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    if (ref.current) onChange(toRichText(htmlToNodes(ref.current.innerHTML)));
  };

  const wrap = (tag: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const el = document.createElement(tag);
    el.appendChild(sel.getRangeAt(0).extractContents());
    sel.getRangeAt(0).insertNode(el);
    sync();
  };

  const insertChip = (html: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const frag = range.createContextualFragment(html);
    range.deleteContents();
    range.insertNode(frag);
    sync();
  };

  return (
    <div className="grid gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="flex flex-wrap gap-1">
        {SIMPLE_BTNS.map((b) => (
          <Button key={b.tag} type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs" onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap(b.tag)}>{b.label}</Button>
        ))}
        <ParamButton kind="a" onInsert={insertChip} />
        <ParamButton kind="tooltip" onInsert={insertChip} />
        <ParamButton kind="popover" onInsert={insertChip} />
        <ParamButton kind="fn" onInsert={insertChip} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm leading-7 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_[data-t]]:rounded [&_[data-t]]:bg-muted [&_[data-t]]:px-1"
      />
    </div>
  );
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ParamButton({
  kind, onInsert,
}: {
  kind: "a" | "tooltip" | "popover" | "fn";
  onInsert: (html: string) => void;
}) {
  const [text, setText] = React.useState("");
  const [param, setParam] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const labels = { a: "Link", tooltip: "Tip", popover: "Pop", fn: "Fn" } as const;
  const paramLabel = { a: "href", tooltip: "tip", popover: "content", fn: "number" } as const;

  const submit = () => {
    let html = "";
    if (kind === "a") html = `<span data-t="a" data-href="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else if (kind === "tooltip") html = `<span data-t="tooltip" data-tip="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else if (kind === "popover") html = `<span data-t="popover" data-content="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else html = `<span data-t="fn" data-n="${Number(param) || 0}" contenteditable="false">[${Number(param) || 0}]</span>`;
    onInsert(html);
    setText(""); setParam(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs">{labels[kind]}</Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-64 gap-2">
        {kind !== "fn" && (
          <input className="rounded-btn border border-border bg-background p-1.5 text-sm"
            placeholder="text" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        <input className="rounded-btn border border-border bg-background p-1.5 text-sm"
          placeholder={paramLabel[kind]} value={param} onChange={(e) => setParam(e.target.value)} />
        <Button type="button" size="sm" onClick={submit}>Insert</Button>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Confirm `@/components/ui/popover` exports `Popover`, `PopoverTrigger`, `PopoverContent` — it does, per [src/components/ui/popover.tsx](../../../src/components/ui/popover.tsx).)

- [ ] **Step 3: Manual smoke (dev server)**

The serialization is unit-tested in Task 2; the contentEditable wiring is verified live during Task 9 once an editor renders it.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/blocks/fields/rich-text-field.tsx
git commit -m "feat(admin): hybrid RichTextField inline editor"
```

---

### Task 7: Registry skeleton + completeness guard

Registry maps every block type to a factory + editor. Editors are filled in Tasks 9–13; here every entry temporarily points at a `JsonEditor` fallback so the type guard compiles. The `satisfies` clause makes a missing type a **compile error**.

**Files:**
- Create: `src/components/admin/blocks/registry.tsx`, `src/components/admin/blocks/editors/json-editor.tsx`
- Modify: `src/components/admin/blocks/registry.test.ts`

- [ ] **Step 1: JsonEditor fallback**

```tsx
// src/components/admin/blocks/editors/json-editor.tsx
"use client";
import type { ContentBlock } from "@/lib/data/types";

export function JsonEditor({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }) {
  return (
    <textarea
      className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
      defaultValue={JSON.stringify(block, null, 2)}
      onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* wait for valid JSON */ } }}
    />
  );
}
```

- [ ] **Step 2: Registry**

```tsx
// src/components/admin/blocks/registry.tsx
"use client";
import type { ContentBlock } from "@/lib/data/types";
import { JsonEditor } from "./editors/json-editor";

export type BlockEditorProps<T extends ContentBlock = ContentBlock> = {
  block: T;
  onChange: (b: T) => void;
};

type Entry<T extends ContentBlock> = {
  create: () => T;
  Editor: (props: BlockEditorProps<T>) => React.ReactNode;
};

type RegistryShape = { [K in ContentBlock["type"]]: Entry<Extract<ContentBlock, { type: K }>> };

// Every block type filled in below. `satisfies RegistryShape` => missing key is a compile error.
export const registry = {
  h2: { create: () => ({ type: "h2", text: "" }), Editor: JsonEditor },
  h3: { create: () => ({ type: "h3", text: "" }), Editor: JsonEditor },
  h4: { create: () => ({ type: "h4", text: "" }), Editor: JsonEditor },
  lead: { create: () => ({ type: "lead", text: "" }), Editor: JsonEditor },
  p: { create: () => ({ type: "p", text: "" }), Editor: JsonEditor },
  small: { create: () => ({ type: "small", text: "" }), Editor: JsonEditor },
  caption: { create: () => ({ type: "caption", text: "" }), Editor: JsonEditor },
  ul: { create: () => ({ type: "ul", items: [""] }), Editor: JsonEditor },
  ol: { create: () => ({ type: "ol", items: [""] }), Editor: JsonEditor },
  tasklist: { create: () => ({ type: "tasklist", items: [{ text: "", done: false }] }), Editor: JsonEditor },
  figure: { create: () => ({ type: "figure", image: { seed: "", alt: "" } }), Editor: JsonEditor },
  figures: { create: () => ({ type: "figures", images: [] }), Editor: JsonEditor },
  gallery: { create: () => ({ type: "gallery", images: [] }), Editor: JsonEditor },
  video: { create: () => ({ type: "video", id: "", title: "" }), Editor: JsonEditor },
  audio: { create: () => ({ type: "audio", title: "" }), Editor: JsonEditor },
  quote: { create: () => ({ type: "quote", text: "" }), Editor: JsonEditor },
  pullquote: { create: () => ({ type: "pullquote", text: "" }), Editor: JsonEditor },
  code: { create: () => ({ type: "code", code: "" }), Editor: JsonEditor },
  table: { create: () => ({ type: "table", columns: [], rows: [] }), Editor: JsonEditor },
  comparisonTable: { create: () => ({ type: "comparisonTable", columns: [], rows: [] }), Editor: JsonEditor },
  pricing: { create: () => ({ type: "pricing" }), Editor: JsonEditor },
  callout: { create: () => ({ type: "callout", text: "" }), Editor: JsonEditor },
  faq: { create: () => ({ type: "faq", items: [] }), Editor: JsonEditor },
  tabs: { create: () => ({ type: "tabs", items: [] }), Editor: JsonEditor },
  expand: { create: () => ({ type: "expand", summary: "", content: "" }), Editor: JsonEditor },
  socialEmbed: { create: () => ({ type: "socialEmbed", author: "", handle: "", text: "", date: "" }), Editor: JsonEditor },
  map: { create: () => ({ type: "map", query: "", label: "" }), Editor: JsonEditor },
  statCards: { create: () => ({ type: "statCards", stats: [] }), Editor: JsonEditor },
  metricsGrid: { create: () => ({ type: "metricsGrid", metrics: [] }), Editor: JsonEditor },
  progress: { create: () => ({ type: "progress", label: "", value: 0 }), Editor: JsonEditor },
  comparisonCards: { create: () => ({ type: "comparisonCards", cards: [] }), Editor: JsonEditor },
  divider: { create: () => ({ type: "divider" }), Editor: JsonEditor },
  spacer: { create: () => ({ type: "spacer", size: "md" }), Editor: JsonEditor },
  tags: { create: () => ({ type: "tags", items: [] }), Editor: JsonEditor },
  cta: { create: () => ({ type: "cta", title: "", text: "", button: "", href: "" }), Editor: JsonEditor },
  newsletter: { create: () => ({ type: "newsletter", title: "", text: "" }), Editor: JsonEditor },
  download: { create: () => ({ type: "download", title: "", description: "", meta: "" }), Editor: JsonEditor },
  buttonGroup: { create: () => ({ type: "buttonGroup", buttons: [] }), Editor: JsonEditor },
  takeaways: { create: () => ({ type: "takeaways", items: [""] }), Editor: JsonEditor },
  summary: { create: () => ({ type: "summary", text: "" }), Editor: JsonEditor },
  prosCons: { create: () => ({ type: "prosCons", pros: [], cons: [] }), Editor: JsonEditor },
  steps: { create: () => ({ type: "steps", items: [] }), Editor: JsonEditor },
  timeline: { create: () => ({ type: "timeline", items: [] }), Editor: JsonEditor },
  references: { create: () => ({ type: "references", items: [] }), Editor: JsonEditor },
  footnotes: { create: () => ({ type: "footnotes", items: [] }), Editor: JsonEditor },
  authorNote: { create: () => ({ type: "authorNote", text: "" }), Editor: JsonEditor },
  expertInsight: { create: () => ({ type: "expertInsight", name: "", role: "", quote: "" }), Editor: JsonEditor },
  relatedCard: { create: () => ({ type: "relatedCard", slug: "" }), Editor: JsonEditor },
  resourceList: { create: () => ({ type: "resourceList", items: [] }), Editor: JsonEditor },
  quickFacts: { create: () => ({ type: "quickFacts", facts: [] }), Editor: JsonEditor },
} satisfies RegistryShape;
```

- [ ] **Step 3: Add completeness test**

Append to `src/components/admin/blocks/registry.test.ts`:

```ts
import { registry } from "./registry";

describe("registry", () => {
  it("has a create() + Editor for every listed block type", () => {
    for (const { type } of BLOCK_TYPES) {
      const entry = (registry as Record<string, unknown>)[type];
      expect(entry, `missing registry entry: ${type}`).toBeDefined();
      const e = entry as { create: () => { type: string }; Editor: unknown };
      expect(typeof e.create).toBe("function");
      expect(e.create().type).toBe(type);
      expect(e.Editor).toBeTruthy();
    }
  });
});
```

- [ ] **Step 4: Run test + typecheck**

Run: `npm test -- registry` (expected PASS) and `npx tsc --noEmit` (expected no errors; if a block type is missing from `registry`, tsc fails on the `satisfies` line — add it).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/blocks/registry.tsx src/components/admin/blocks/editors/json-editor.tsx src/components/admin/blocks/registry.test.ts
git commit -m "feat(admin): block editor registry + completeness guard"
```

---

### Task 8: Wire BlockEditor to the registry + grouped add-menu

Replace the hand-rolled `CORE_TYPES`/`newBlock`/`BlockFields` with registry dispatch and a grouped picker. The hidden `body` input and add/reorder/remove logic stay.

**Files:**
- Modify: `src/components/admin/block-editor.tsx` (full rewrite of the body, ~180 lines → smaller)

- [ ] **Step 1: Rewrite block-editor.tsx**

```tsx
// src/components/admin/block-editor.tsx
"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { BLOCK_TYPES, type BlockGroup } from "@/components/admin/blocks/block-types";
import { registry, type BlockEditorProps } from "@/components/admin/blocks/registry";

const GROUP_ORDER: BlockGroup[] = [
  "Typography", "Lists", "Media", "Quotes", "Code", "Tables", "Callouts",
  "Interactive", "Embeds", "Data & statistics", "Utility", "Conversion", "Knowledge", "Advanced",
];

export function BlockEditor({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>(initial.length ? initial : []);
  const [addType, setAddType] = React.useState<ContentBlock["type"]>("p");

  const update = (i: number, next: ContentBlock) =>
    setBlocks((b) => b.map((x, idx) => (idx === i ? next : x)));
  const remove = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="grid gap-3">
      <input type="hidden" name="body" value={JSON.stringify(blocks)} readOnly />

      {blocks.map((block, i) => {
        const entry = registry[block.type] as { Editor: (p: BlockEditorProps) => React.ReactNode } | undefined;
        const Editor = entry?.Editor;
        return (
          <div key={i} className="rounded-card border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">{block.type}</span>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
              </div>
            </div>
            {Editor ? (
              <Editor block={block} onChange={(b) => update(i, b)} />
            ) : (
              <textarea
                className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
                defaultValue={JSON.stringify(block, null, 2)}
                onChange={(e) => { try { update(i, JSON.parse(e.target.value)); } catch { /* ignore */ } }}
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as ContentBlock["type"])}
          className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
        >
          {GROUP_ORDER.map((group) => (
            <optgroup key={group} label={group}>
              {BLOCK_TYPES.filter((b) => b.group === group).map((b) => (
                <option key={b.type} value={b.type}>{b.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setBlocks((b) => [...b, registry[addType].create()])}
        >
          Add block
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` (expected no errors) and `npm run lint` (expected clean for changed files).

- [ ] **Step 3: Manual smoke**

Run dev server, open `/admin/posts/new` (or edit existing), confirm: grouped add-menu lists all 50; adding any block renders the JSON fallback for not-yet-built editors; existing posts still load and save.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/block-editor.tsx
git commit -m "feat(admin): registry dispatch + grouped 50-type add-menu"
```

---

### Tasks 9–13: Build the editors (replace JsonEditor entries)

Each task creates one category file, then **swaps the `Editor:` reference in `registry.tsx`** from `JsonEditor` to the real editor for those types. After each task: `npx tsc --noEmit`, dev-server smoke for one block, commit.

Field mapping is exhaustive below. Every editor follows the same shell — destructure `{ block, onChange }`, render the listed fields, each field calling `onChange({ ...block, <prop>: <next> })`. For object-array props use `RepeaterField` with the row mapping given.

#### Task 9 — `editors/typography.tsx`, `quotes.tsx`, `code.tsx`, `utility.tsx`

| type | fields |
| --- | --- |
| h2,h3,h4 | `TextField` → `text` (string) |
| lead,p,small,caption | `RichTextField` → `text` |
| quote | `RichTextField` → `text`; `TextField` → `cite` |
| pullquote | `TextField` → `text`; `TextField` → `cite` |
| code | `TextField multiline` → `code`; `TextField` → `lang`; `TextField` → `filename` |
| divider | none — render `<p className="text-xs text-muted-foreground">No options.</p>` |
| spacer | `SelectField` options `["sm","md","lg"]` → `size` |
| tags | `ListField` → `items` (string[]) |

Each editor is typed with the built-in `Extract<ContentBlock, { type: "..." }>` utility (no import needed) so `block` is narrowed to that variant. Concrete representative (`quotes.tsx`):

```tsx
// src/components/admin/blocks/editors/quotes.tsx
"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";

type Quote = Extract<ContentBlock, { type: "quote" }>;
export function QuoteEditor({ block, onChange }: BlockEditorProps<Quote>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} />
      <TextField label="Citation" value={block.cite ?? ""} onChange={(cite) => onChange({ ...block, cite })} />
    </div>
  );
}

type Pull = Extract<ContentBlock, { type: "pullquote" }>;
export function PullquoteEditor({ block, onChange }: BlockEditorProps<Pull>) {
  return (
    <div className="grid gap-2">
      <TextField label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} />
      <TextField label="Citation" value={block.cite ?? ""} onChange={(cite) => onChange({ ...block, cite })} />
    </div>
  );
}
```

Build the rest of this task's editors to the same pattern using the field-mapping table. Then in `registry.tsx` replace the `Editor: JsonEditor` for `h2,h3,h4,lead,p,small,caption,quote,pullquote,code,divider,spacer,tags` with the new components (import at top).

Commit: `feat(admin): typography/quote/code/utility block editors`

#### Task 10 — `editors/lists.tsx`

| type | fields |
| --- | --- |
| ul, ol | `ListField` → `items` |
| tasklist | `RepeaterField` over `items`; row = `TextField`→`text` + checkbox→`done`; `create: () => ({ text: "", done: false })` |

Commit: `feat(admin): list block editors`

#### Task 11 — `editors/tables.tsx`, `data.tsx`

| type | fields |
| --- | --- |
| table | `ListField`→`columns` (string[]); `RepeaterField` over `rows` (each row = `ListField` of RichText cells); `RichTextField`→`caption` |
| comparisonTable | `ListField`→`columns`; `RepeaterField` over `rows`, row = `TextField`→`label` + `ListField`→`cells` (string/bool as text) |
| pricing | none — `<p>Uses the site pricing plans. No options.</p>` |
| statCards | `RepeaterField` over `stats`, row = `TextField` value/label/sub |
| metricsGrid | `RepeaterField` over `metrics`, row = `NumberField`→value, `TextField`→prefix/suffix/label, `NumberField`→decimals |
| progress | `TextField`→`label`; `NumberField`→`value` |
| comparisonCards | `RepeaterField` over `cards`, row = `TextField`→title/subtitle + `RepeaterField` over `rows` (label/value) + checkbox→highlight |

Commit: `feat(admin): table and data block editors`

#### Task 12 — `editors/interactive.tsx`, `embeds.tsx`, `media.tsx`

| type | fields |
| --- | --- |
| faq | `RepeaterField` over `items`, row = `TextField`→`q` + `RichTextField`→`a` |
| tabs | `RepeaterField` over `items`, row = `TextField`→`label` + `RichTextField`→`content` |
| expand | `TextField`→`summary`; `RichTextField`→`content` |
| socialEmbed | `TextField`→author/handle/text/date |
| map | `TextField`→query/label |
| figure | `ImageField`→`image`; checkbox→`featured` |
| figures, gallery | `RepeaterField` over `images`, row = `ImageField` |
| video | `TextField`→id/title; `RichTextField`→caption |
| audio | `TextField`→title/subtitle; `NumberField`→duration |

Commit: `feat(admin): interactive, embed and media block editors`

#### Task 13 — `editors/callouts.tsx`, `conversion.tsx`, `knowledge.tsx`, `advanced.tsx`

| type | fields |
| --- | --- |
| callout | `SelectField` options `["default","info","accent","note","tip","success","warning","error"]`→`variant`; `TextField`→`title`; `RichTextField`→`text` |
| cta | `TextField`→title/text/button/href |
| newsletter | `TextField`→title/text |
| download | `TextField`→title/description/meta/button |
| buttonGroup | `RepeaterField` over `buttons`, row = `TextField`→label/href + `SelectField`→variant |
| takeaways | `TextField`→`title`; `RepeaterField` over `items` (RichTextField each) |
| summary | `TextField`→`title`; `RichTextField`→`text` |
| prosCons | `ListField`→`pros`; `ListField`→`cons` |
| steps | `RepeaterField` over `items`, row = `TextField`→`title` + `RichTextField`→`detail` |
| timeline | `RepeaterField` over `items`, row = `TextField`→marker/title/description |
| references | `RepeaterField` over `items`, row = `TextField`→label/href/source |
| footnotes | `RepeaterField` over `items`, row = `NumberField`→`n` + `RichTextField`→`text` |
| authorNote | `RichTextField`→`text` |
| expertInsight | `TextField`→name/role; `RichTextField`→`quote` |
| relatedCard | `TextField`→`slug` |
| resourceList | `RepeaterField` over `items`, row = `TextField`→title/kind/href |
| quickFacts | `TextField`→`title`; `RepeaterField` over `facts`, row = `TextField`→label/value |

Commit: `feat(admin): callout, conversion, knowledge and advanced block editors`

For each of Tasks 9–13:
- [ ] Create the category file with one exported editor per type (pattern above).
- [ ] Update imports + swap `Editor:` entries in `registry.tsx`.
- [ ] `npx tsc --noEmit` → no errors.
- [ ] `npm test -- registry` → PASS (still complete).
- [ ] Dev-server smoke: add one block from the category, type into it, confirm it renders on the post.
- [ ] Commit with the message above.

---

### Task 14: Remove dead code + final verification

**Files:**
- Modify: `src/components/admin/block-editor.tsx` (confirm no leftover `CORE_TYPES`/`newBlock`/`BlockFields` — removed in Task 8)
- Verify: `registry.tsx` has zero remaining `JsonEditor` references except as the unknown-type fallback inside `BlockEditor`.

- [ ] **Step 1: Grep for leftovers**

Run: `git grep -n "CORE_TYPES\|newBlock\|BlockFields" src/`
Expected: no matches.

- [ ] **Step 2: Confirm every type has a real editor**

Run: `git grep -c "JsonEditor" src/components/admin/blocks/registry.tsx`
Expected: only the import line remains (0 usages in entries), or remove the import entirely if unused.

- [ ] **Step 3: Full test + typecheck + build**

Run: `npm test` (expected: all PASS), `npx tsc --noEmit` (no errors), `npm run build` (succeeds).

- [ ] **Step 4: Full manual pass**

Dev server: create a new post, add one block of every group, save, view on `/blog/<category>/<slug>`. Edit it back, confirm round-trip. Confirm an inline link + footnote render correctly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(admin): remove legacy block-field path; final verification"
```

---

## Self-review notes

- **Spec coverage:** all 50 types mapped (Tasks 9–13 tables); registry guard (Task 7); hybrid inline editor (Tasks 2,6); grouped add-menu + JSON fallback kept (Task 8); shared fields incl RepeaterField (Tasks 3–5); tests are logic-only per repo setup (Tasks 1,2,7); `countWords` unchanged (already span-aware).
- **Known deviation from spec:** spec lists nested sub-list authoring; `ListField` v1 is flat (nested `ListItem` sub-lists fall to JSON within advanced use) — acceptable, noted in Task 5. Drag-drop, live preview, image upload remain out of scope.
- **jsdom:** added as a dev dep for the serialize test only, via per-file `@vitest-environment jsdom` pragma (Task 2) — does not change the default node env for existing tests.
