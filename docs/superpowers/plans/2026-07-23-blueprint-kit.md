# Blueprint Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4-primitive monochrome "blueprint" component kit (Phase 0 of the Blueprint Design System) and prove it by rebuilding the 404 page to match the reference.

**Architecture:** A pure-logic geometry module (`blueprint-geometry.ts`) holds all path math, grid coordinates, and reduced-motion draw state — unit-tested as `.test.ts` (repo convention: node-env, logic-only tests). Four thin React components consume it and render SVG, animating draw-in via framer-motion `pathLength` with a reduced-motion static fallback. All colors come from existing design tokens; nothing is hardcoded black.

**Tech Stack:** Next.js 16.2.9 (App Router), React, TypeScript, Tailwind (v4 `@theme` tokens), framer-motion v12 (already installed), vitest 4 (node env).

## Global Constraints

- Monochrome only. Lines → `var(--border)`; dim `+` markers → `var(--muted-foreground)`; fills/text → `var(--foreground)`. **Orange `--brand` must not appear** — it is interaction-only, never decorative.
- No new runtime dependencies. Use the installed `framer-motion`.
- No new fonts. No new design tokens. Card radius = existing `rounded-card` (12px).
- Theme-aware: primitives must be legible in light, dark, and torch themes (never hardcode `#000`/`#fff`).
- Reduced motion is a required path: when `useReducedMotion()` is true, render the final drawn state with no animation.
- Tests live in `*.test.ts` (vitest include glob is `src/**/*.test.ts`, environment `node`). Do **not** add a DOM-testing stack; test pure logic only.
- Client components that use framer-motion or `useReducedMotion` need `"use client"`.

---

## File Structure

- Create `src/components/blueprint/blueprint-geometry.ts` — pure functions: triangle points, grid line coords, draw variants. No React.
- Create `src/components/blueprint/blueprint-geometry.test.ts` — unit tests for the above.
- Create `src/components/blueprint/geometric-mark.tsx` — `<GeometricMark>` client component.
- Create `src/components/blueprint/crosshair-grid.tsx` — `<CrosshairGrid>` client component.
- Create `src/components/blueprint/blueprint-frame.tsx` — `<BlueprintFrame>` client component.
- Create `src/components/blueprint/bento-card.tsx` — `<BentoCard>` server-safe component.
- Create `src/components/blueprint/index.ts` — barrel export.
- Modify `src/app/not-found.tsx` — rebuild using the kit.

---

### Task 1: Geometry module (pure logic, TDD)

**Files:**
- Create: `src/components/blueprint/blueprint-geometry.ts`
- Test: `src/components/blueprint/blueprint-geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `EASE: readonly [number, number, number, number]` — `[0.22, 1, 0.36, 1]`.
  - `trianglePoints(size: number): string` — SVG `points` for an equilateral-ish triangle inside a `size`×`size` box.
  - `gridLines(width: number, height: number, cell: number): { v: number[]; h: number[] }` — interior vertical (x) and horizontal (y) line offsets.
  - `drawVariants(reduce: boolean): { initial: { pathLength: number; opacity: number }; visible: { pathLength: number; opacity: number } }` — framer-motion variants; when `reduce` is true, `initial` already equals the drawn state.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/blueprint/blueprint-geometry.test.ts
import { describe, it, expect } from "vitest";
import { EASE, trianglePoints, gridLines, drawVariants } from "./blueprint-geometry";

describe("blueprint-geometry", () => {
  it("EASE matches the system ease-out-quint", () => {
    expect(EASE).toEqual([0.22, 1, 0.36, 1]);
  });

  it("trianglePoints returns three scaled x,y pairs", () => {
    const pts = trianglePoints(100).trim().split(/\s+/);
    expect(pts).toHaveLength(3);
    for (const p of pts) {
      const [x, y] = p.split(",").map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it("gridLines returns interior offsets only (excludes 0 and edges)", () => {
    const { v, h } = gridLines(200, 100, 50);
    expect(v).toEqual([50, 100, 150]);
    expect(h).toEqual([50]);
  });

  it("drawVariants animates 0->1 normally", () => {
    const dv = drawVariants(false);
    expect(dv.initial.pathLength).toBe(0);
    expect(dv.visible.pathLength).toBe(1);
  });

  it("drawVariants renders final state under reduced motion", () => {
    const dv = drawVariants(true);
    expect(dv.initial.pathLength).toBe(1);
    expect(dv.initial.opacity).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/blueprint/blueprint-geometry.test.ts`
Expected: FAIL — cannot resolve `./blueprint-geometry`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/blueprint/blueprint-geometry.ts
/** Shared motion + geometry helpers for the blueprint kit. Pure, no React. */

/** System ease-out-quint (matches --ease-out-quint). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** SVG `points` for a triangle inscribed in a size×size box: apex top-center. */
export function trianglePoints(size: number): string {
  const apex = `${size * 0.5},${size * 0.14}`;
  const left = `${size * 0.14},${size * 0.72}`;
  const right = `${size * 0.86},${size * 0.72}`;
  return `${apex} ${left} ${right}`;
}

/** Interior grid line offsets for a width×height box on a `cell` grid. */
export function gridLines(
  width: number,
  height: number,
  cell: number,
): { v: number[]; h: number[] } {
  const v: number[] = [];
  for (let x = cell; x < width; x += cell) v.push(x);
  const h: number[] = [];
  for (let y = cell; y < height; y += cell) h.push(y);
  return { v, h };
}

/** framer-motion draw-in variants; reduced motion → final drawn state. */
export function drawVariants(reduce: boolean) {
  return {
    initial: reduce
      ? { pathLength: 1, opacity: 1 }
      : { pathLength: 0, opacity: 0.5 },
    visible: { pathLength: 1, opacity: 1 },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/blueprint/blueprint-geometry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/blueprint/blueprint-geometry.ts src/components/blueprint/blueprint-geometry.test.ts
git commit -m "feat(blueprint): geometry + draw-in helpers"
```

---

### Task 2: GeometricMark component

**Files:**
- Create: `src/components/blueprint/geometric-mark.tsx`

**Interfaces:**
- Consumes: `trianglePoints`, `drawVariants`, `EASE` from `./blueprint-geometry`.
- Produces: `GeometricMark` — `export function GeometricMark(props: { size?: number; draw?: boolean; className?: string })`. Default `size = 96`, `draw = true`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/blueprint/geometric-mark.tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { trianglePoints, drawVariants, EASE } from "./blueprint-geometry";

/**
 * Signature construction mark: a dashed triangle overlaid by a filled circle
 * with a triangular notch. Draws itself in on reveal. Monochrome, token-driven.
 */
export function GeometricMark({
  size = 96,
  draw = true,
  className,
}: {
  size?: number;
  draw?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  const v = drawVariants(!!reduce || !draw);
  const cx = size * 0.62;
  const cy = size * 0.6;
  const r = size * 0.17;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <motion.polygon
        points={trianglePoints(size)}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeDasharray="4 4"
        variants={v}
        initial="initial"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: animate ? 0.9 : 0, ease: EASE }}
      />
      <circle cx={cx} cy={cy} r={r} fill="var(--foreground)" />
      {/* notch: quarter cut so the circle reads as the geometric mark */}
      <path
        d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`}
        fill="var(--background)"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `geometric-mark.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/blueprint/geometric-mark.tsx
git commit -m "feat(blueprint): GeometricMark primitive"
```

---

### Task 3: CrosshairGrid component

**Files:**
- Create: `src/components/blueprint/crosshair-grid.tsx`

**Interfaces:**
- Consumes: `gridLines`, `drawVariants`, `EASE` from `./blueprint-geometry`.
- Produces: `CrosshairGrid` — `export function CrosshairGrid(props: { cell?: number; circles?: boolean; draw?: boolean; className?: string })`. Default `cell = 50`, `circles = true`, `draw = true`. Renders an absolutely-positioned, `aria-hidden` background layer sized to its parent (parent must be `relative`).

- [ ] **Step 1: Write the component**

```tsx
// src/components/blueprint/crosshair-grid.tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gridLines, drawVariants, EASE } from "./blueprint-geometry";

// Fixed viewBox; SVG scales to fill the parent via width/height 100%.
const W = 1000;
const H = 600;

/**
 * Faint blueprint background: interior grid lines plus optional circle
 * intersections. Absolutely fills a `relative` parent. Draws in on reveal.
 */
export function CrosshairGrid({
  cell = 50,
  circles = true,
  draw = true,
  className,
}: {
  cell?: number;
  circles?: boolean;
  draw?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  const v = drawVariants(!!reduce || !draw);
  const scaled = cell * (W / 200); // keep ~visual density independent of viewBox
  const { v: vx, h: hy } = gridLines(W, H, scaled);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      {vx.map((x, i) => (
        <motion.line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={H}
          stroke="var(--border)"
          strokeWidth={1}
          variants={v}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: animate ? 0.8 : 0, ease: EASE, delay: animate ? i * 0.03 : 0 }}
        />
      ))}
      {hy.map((y, i) => (
        <motion.line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={W}
          y2={y}
          stroke="var(--border)"
          strokeWidth={1}
          variants={v}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: animate ? 0.8 : 0, ease: EASE, delay: animate ? i * 0.03 : 0 }}
        />
      ))}
      {circles && (
        <>
          <circle cx={W * 0.25} cy={H * 0.5} r={H * 0.28} fill="none" stroke="var(--border)" strokeWidth={1} />
          <circle cx={W * 0.75} cy={H * 0.5} r={H * 0.28} fill="none" stroke="var(--border)" strokeWidth={1} />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `crosshair-grid.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/blueprint/crosshair-grid.tsx
git commit -m "feat(blueprint): CrosshairGrid background primitive"
```

---

### Task 4: BlueprintFrame component

**Files:**
- Create: `src/components/blueprint/blueprint-frame.tsx`

**Interfaces:**
- Consumes: nothing from siblings (self-contained corner markers).
- Produces: `BlueprintFrame` — `export function BlueprintFrame(props: { variant?: "dashed" | "solid"; markers?: boolean; className?: string; children?: React.ReactNode })`. Default `variant = "dashed"`, `markers = true`. Renders a bordered box with `+` markers at the four outer corners; wraps `children`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/blueprint/blueprint-frame.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/** A `+` corner tick, positioned by the parent. */
function Corner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute select-none text-[var(--muted-foreground)] leading-none",
        className,
      )}
    >
      +
    </span>
  );
}

/**
 * Bordered blueprint box with optional corner `+` markers. The workhorse
 * wrapper for heroes, sections, and the 404 canvas. Server-safe (no client JS).
 */
export function BlueprintFrame({
  variant = "dashed",
  markers = true,
  className,
  children,
}: {
  variant?: "dashed" | "solid";
  markers?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative border border-border",
        variant === "dashed" && "border-dashed",
        className,
      )}
    >
      {markers && (
        <>
          <Corner className="-left-2 -top-2.5" />
          <Corner className="-right-2 -top-2.5" />
          <Corner className="-bottom-3.5 -left-2" />
          <Corner className="-bottom-3.5 -right-2" />
        </>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `blueprint-frame.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/blueprint/blueprint-frame.tsx
git commit -m "feat(blueprint): BlueprintFrame wrapper primitive"
```

---

### Task 5: BentoCard component

**Files:**
- Create: `src/components/blueprint/bento-card.tsx`

**Interfaces:**
- Consumes: nothing from siblings.
- Produces: `BentoCard` — `export function BentoCard(props: { title: string; desc?: string; illustration?: React.ReactNode; className?: string; children?: React.ReactNode })`. When `illustration` is omitted, renders a default dot-grid panel.

- [ ] **Step 1: Write the component**

```tsx
// src/components/blueprint/bento-card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/** Default dot-grid illustration used when none is supplied. */
function DotGrid() {
  return (
    <div
      aria-hidden
      className="h-24 w-full rounded-input border border-border"
      style={{
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "10px 10px",
      }}
    />
  );
}

/**
 * Thin-border feature card with an illustration slot (dot-grid by default),
 * a title, and optional description. Server-safe. Uses the locked card radius.
 */
export function BentoCard({
  title,
  desc,
  illustration,
  className,
  children,
}: {
  title: string;
  desc?: string;
  illustration?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-5 transition-ui",
        className,
      )}
    >
      {illustration ?? <DotGrid />}
      <h3 className="mt-4 font-display text-base font-bold tracking-tight text-foreground">
        {title}
      </h3>
      {desc && <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `bento-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/blueprint/bento-card.tsx
git commit -m "feat(blueprint): BentoCard primitive"
```

---

### Task 6: Barrel export + 404 proof rebuild

**Files:**
- Create: `src/components/blueprint/index.ts`
- Modify: `src/app/not-found.tsx`

**Interfaces:**
- Consumes: all four primitives from `./blueprint`.
- Produces: barrel exports `BlueprintFrame`, `CrosshairGrid`, `GeometricMark`, `BentoCard` and the geometry helpers.

- [ ] **Step 1: Write the barrel**

```ts
// src/components/blueprint/index.ts
export { BlueprintFrame } from "./blueprint-frame";
export { CrosshairGrid } from "./crosshair-grid";
export { GeometricMark } from "./geometric-mark";
export { BentoCard } from "./bento-card";
export * from "./blueprint-geometry";
```

- [ ] **Step 2: Rebuild the 404 page**

```tsx
// src/app/not-found.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Container, Section } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { BlueprintFrame, CrosshairGrid, GeometricMark } from "@/components/blueprint";
import { cn } from "@/lib/utils";

const links = [
  { label: "Blog", href: "/blog" },
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Tools", href: "/tools" },
  { label: "About", href: "/about" },
];

export default function NotFound() {
  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <BlueprintFrame className="px-6 py-20 md:py-28">
          <CrosshairGrid className="opacity-70" />
          <div className="relative text-center">
            <GeometricMark size={104} className="mx-auto" />
            <p className="mt-8 font-display text-7xl font-extrabold tracking-tight md:text-8xl">
              404
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">This page wandered off</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              The link may be broken or the page moved. Let&apos;s get you back to something useful.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
                <BrandIcon name="Home" />
                Back home
              </Link>
              <Link href="/search" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                <BrandIcon name="Search" />
                Search the site
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
                >
                  {l.label}
                  <ArrowRight className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        </BlueprintFrame>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Verify the full suite + typecheck + build**

Run: `npm run test`
Expected: PASS (blueprint-geometry tests green, no regressions).

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; `/_not-found` compiles. (Trust the exit code — a client importing a server-only module can pass `tsc` but fail the build.)

- [ ] **Step 4: Visual verification (dev preview)**

Start the dev server (via the app's launch config, not raw shell). Navigate to any unknown URL (e.g. `/does-not-exist`). Confirm in light, dark, and torch:
- Corner `+` markers on the dashed frame.
- Faint crosshair grid + two circles behind the content.
- GeometricMark (dashed triangle + notched circle) draws in above `404`.
- With OS "reduce motion" on, the mark/grid appear fully drawn with no animation.

- [ ] **Step 5: Commit**

```bash
git add src/components/blueprint/index.ts src/app/not-found.tsx
git commit -m "feat(blueprint): rebuild 404 on the blueprint kit"
```

---

## Phase 1–3 Roadmap (each becomes its own plan)

Phase 0 above is independently shippable. The 12 features from the spec are **not** expanded here — each is its own plan (`docs/superpowers/plans/2026-…-<feature>.md`) so each ships working software on its own, and because several need their Next.js 16 API verified against `node_modules/next/dist/docs/` before code is written. Recommended order and the doc to read first:

| Feature | Depends on | Read first (in `node_modules/next/dist/docs/`) |
|---|---|---|
| F9 styled `loading.tsx` skeletons | Kit | app/loading conventions |
| F1 intercepting/parallel modals | Kit | routing (intercepting + parallel routes) |
| F2 View Transitions morph | Kit, F1 | app router View Transitions config |
| F6 dynamic OG blueprint cards | Kit | `ImageResponse` / opengraph-image |
| F3 Partial Prerendering | — | PPR / `experimental_ppr` flag |
| F4 middleware geo hero | — | middleware + geo headers on this deploy |
| F5 programmatic city pages | F4 | `generateStaticParams` |
| F8 Web Vitals proof strip | Kit | `useReportWebVitals` |
| F7 badge route handlers | Kit | route handlers returning `image/svg+xml` |
| F10 Draft Mode preview | Kit, admin auth | `draftMode()` enable/disable routes |
| F11 `use cache` | — | `use cache` / `dynamicIO` config |
| F12 streaming reveal | Kit, F9 | Suspense streaming |

Open questions to resolve before F5/F8 (carried from the spec): city list + copy source; whether vitals show always or only when "good".

## Self-Review

- **Spec coverage:** Phase 0 covers the 4 primitives + 404 proof + reduced-motion + theme-awareness + no-new-deps + token rules. The 12 features are explicitly deferred to per-feature plans (matches the spec's phased structure and the writing-plans scope-check). No Phase-0 requirement is unassigned.
- **Placeholder scan:** none — every code step contains full code; verification steps give exact commands + expected results.
- **Type consistency:** `drawVariants` returns `{ initial, visible }` and every component uses `initial="initial" whileInView="visible"` with those exact variant keys. `trianglePoints`/`gridLines` signatures match their call sites. Barrel re-exports match component export names.
