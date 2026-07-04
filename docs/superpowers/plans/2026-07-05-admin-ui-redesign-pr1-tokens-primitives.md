# Admin UI Redesign — PR1: Tokens + Primitives + Feedback States — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the admin-scoped design-token layer and the foundational `components/admin/` primitives + feedback states that all later admin-redesign PRs consume — with zero change to routes, APIs, logic, or the public site.

**Architecture:** Admin tokens are declared under a `[data-admin]` CSS scope that layers on the existing base tokens in `globals.css` (which already flip light/dark via `.dark`). Only the accent (`#FE5100`) and interaction-border tokens are admin-specific; everything else references existing base vars, so dark mode is inherited for free. Primitives are fresh, admin-only CVA components that encode the admin interaction language (border → orange on hover/focus/active) and live in layered folders under `components/admin/`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@theme inline`, `@custom-variant dark`), class-variance-authority, `cn` (clsx + tailwind-merge), Radix primitives, lucide-react, Vitest + jsdom.

## Global Constraints

- **No changes** to routes, APIs, server actions, `src/lib/**/queries`, auth, permissions, or DB schema. (This PR is pure UI/token/component scaffolding — it touches no page yet.)
- **Public site frozen:** do NOT modify anything in `components/ui/*` or any non-admin route. Admin tokens MUST be scoped so orange never applies outside `[data-admin]`.
- **Accent value:** admin accent is exactly `#FE5100` (distinct from the existing public `--brand: #ff4800`; do not merge them).
- **Accent ratio:** ~95% monochrome / 5% orange. Orange only on interaction state (hover/focus/active/selected border, focus ring, primary CTA, important badge). Never a decorative fill.
- **Dark mode:** every admin token + primitive works in light and dark. Dark is driven by the existing `.dark` class (next-themes).
- **Motion:** transitions ≤150ms; border-color/opacity only; honor `prefers-reduced-motion` (already handled globally in `globals.css`).
- **Radius/utility reuse:** use existing utilities — `rounded-btn` (4px), `rounded-input` (8px), `rounded-card` (12px), `transition-ui`. Do not invent new radius scales.
- **Import conventions:** `import { cn } from "@/lib/utils";`, CVA via `class-variance-authority`, icons from `lucide-react`.
- **Branch:** create from `origin/main` tip; PR title `feat(admin): design tokens + admin primitives (redesign PR1)`.

---

## File Structure

**Modify:**
- `src/app/globals.css` — add `[data-admin]` token block + `@theme inline` `--color-admin-*` mappings + one admin utility. (No existing lines changed; additions only.)

**Create (primitives — `components/admin/ui/`):**
- `src/components/admin/ui/admin-button.tsx` — CVA button, admin interaction language.
- `src/components/admin/ui/admin-card.tsx` — surface card with orange hover border option.
- `src/components/admin/ui/status-badge.tsx` — subtle tonal status pill.
- `src/components/admin/ui/search-input.tsx` — icon+input search field.

**Create (feedback — `components/admin/feedback/`):**
- `src/components/admin/feedback/empty-state.tsx` — icon + title + description + CTA.
- `src/components/admin/feedback/loading-state.tsx` — skeleton block presets.
- `src/components/admin/feedback/error-state.tsx` — error surface with retry slot.

**Create (barrel):**
- `src/components/admin/index.ts` — re-exports for ergonomic imports.

**Create (tests — colocated under `src/components/admin/__tests__/`):**
- `src/components/admin/__tests__/admin-button.test.ts`
- `src/components/admin/__tests__/status-badge.test.ts`

Tests target the exported **CVA variant functions** (pure string builders) — no DOM/RTL needed, matching the repo's existing Vitest style (`registry.test.ts`, `rich-text-serialize.test.ts`). Visual/interaction correctness is verified via the preview server in the final task.

---

## Task 1: Admin design tokens in globals.css

**Files:**
- Modify: `src/app/globals.css` (append new blocks; change no existing line)

**Interfaces:**
- Produces (CSS custom props, available under any `[data-admin]` subtree):
  `--admin-bg`, `--admin-surface`, `--admin-surface-hover`, `--admin-border`, `--admin-border-hover`, `--admin-border-active`, `--admin-text`, `--admin-text-muted`, `--admin-accent`, `--admin-accent-fg`, `--admin-success`, `--admin-warning`, `--admin-danger`, `--admin-info`.
- Produces (Tailwind utilities via `@theme inline`): `bg-admin-bg`, `bg-admin-surface`, `bg-admin-surface-hover`, `border-admin-border`, `border-admin-border-hover`, `border-admin-border-active`, `text-admin-text`, `text-admin-text-muted`, `bg-admin-accent` / `text-admin-accent` / `border-admin-accent`, `text-admin-accent-fg`, `text-admin-success`, `text-admin-warning`, `text-admin-danger`, `text-admin-info`.

- [ ] **Step 1: Add the `[data-admin]` token scope**

Append to the END of `src/app/globals.css` (after the last block; do not edit existing content):

```css
/* ================================================================== */
/*  ADMIN SCOPE — internal tool. Layers on base tokens; overrides only  */
/*  the accent + interaction borders. #FE5100 is admin-only and never   */
/*  applies outside [data-admin]. Dark inherits via base tokens.        */
/* ================================================================== */
[data-admin] {
  /* Surfaces — reuse base so light/dark come for free */
  --admin-bg: var(--background);
  --admin-surface: var(--card);
  --admin-surface-hover: var(--muted);

  /* Text */
  --admin-text: var(--foreground);
  --admin-text-muted: var(--muted-foreground);

  /* Borders — default gray; hover/active become accent */
  --admin-border: var(--border);
  --admin-accent: #fe5100;
  --admin-accent-fg: #ffffff;
  --admin-border-hover: var(--admin-accent);
  --admin-border-active: var(--admin-accent);

  /* Status — reuse desaturated base functional tones */
  --admin-success: var(--success);
  --admin-warning: var(--warning);
  --admin-danger: var(--danger);
  --admin-info: #3b6ea5;
}

.dark [data-admin] {
  /* Accent holds on dark (orange reads on black + white). Only override
     info to a lighter tone for AA on dark surfaces. */
  --admin-info: #6ea8dc;
}
```

- [ ] **Step 2: Map tokens to Tailwind utilities**

Inside the existing `@theme inline { ... }` block in `src/app/globals.css`, add these lines just before the `/* Fonts */` comment (append to the color group — do not remove any existing mapping):

```css
  /* Admin scope colors (only used under [data-admin]) */
  --color-admin-bg: var(--admin-bg);
  --color-admin-surface: var(--admin-surface);
  --color-admin-surface-hover: var(--admin-surface-hover);
  --color-admin-border: var(--admin-border);
  --color-admin-border-hover: var(--admin-border-hover);
  --color-admin-border-active: var(--admin-border-active);
  --color-admin-text: var(--admin-text);
  --color-admin-text-muted: var(--admin-text-muted);
  --color-admin-accent: var(--admin-accent);
  --color-admin-accent-fg: var(--admin-accent-fg);
  --color-admin-success: var(--admin-success);
  --color-admin-warning: var(--admin-warning);
  --color-admin-danger: var(--admin-danger);
  --color-admin-info: var(--admin-info);
```

- [ ] **Step 3: Verify the build compiles the CSS**

Run: `npm run build`
Expected: build completes with no CSS/PostCSS error. (If the full build is slow, `npx tsc --noEmit` is not sufficient for CSS — the token check happens at the preview step in Task 8; a successful `next build` here confirms `@theme` parses.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(admin): scoped design tokens (#FE5100 accent, layered on base)"
```

---

## Task 2: AdminButton primitive

**Files:**
- Create: `src/components/admin/ui/admin-button.tsx`
- Test: `src/components/admin/__tests__/admin-button.test.ts`

**Interfaces:**
- Consumes: admin token utilities from Task 1; `cn` from `@/lib/utils`; `Slot` from `@radix-ui/react-slot`.
- Produces:
  - `adminButtonVariants(opts?: { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "default" | "icon"; className?: string }): string`
  - `AdminButton` — `React.forwardRef<HTMLButtonElement, AdminButtonProps>`; props extend `React.ButtonHTMLAttributes<HTMLButtonElement>` + `VariantProps<typeof adminButtonVariants>` + `{ asChild?: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/__tests__/admin-button.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { adminButtonVariants } from "@/components/admin/ui/admin-button";

describe("adminButtonVariants", () => {
  it("primary uses the accent fill", () => {
    const cls = adminButtonVariants({ variant: "primary" });
    expect(cls).toContain("bg-admin-accent");
    expect(cls).toContain("text-admin-accent-fg");
  });

  it("secondary is outline with accent hover border", () => {
    const cls = adminButtonVariants({ variant: "secondary" });
    expect(cls).toContain("border-admin-border");
    expect(cls).toContain("hover:border-admin-border-hover");
  });

  it("danger uses the danger token", () => {
    expect(adminButtonVariants({ variant: "danger" })).toContain("bg-admin-danger");
  });

  it("defaults to primary + default size", () => {
    const cls = adminButtonVariants();
    expect(cls).toContain("bg-admin-accent");
    expect(cls).toContain("h-9");
  });

  it("merges caller className last", () => {
    expect(adminButtonVariants({ className: "w-full" })).toContain("w-full");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/__tests__/admin-button.test.ts`
Expected: FAIL — cannot resolve module `@/components/admin/ui/admin-button`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/ui/admin-button.tsx`:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Admin interaction language: hover/focus/active shift the BORDER to
 * accent (#FE5100) rather than moving or scaling. Transitions ≤150ms,
 * border-color only. Primary is the one accent-filled control per view.
 */
const adminButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn border text-sm font-medium " +
    "transition-[color,background-color,border-color] duration-150 select-none outline-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent " +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-admin-accent text-admin-accent-fg hover:opacity-90",
        secondary:
          "border-admin-border bg-admin-surface text-admin-text hover:border-admin-border-hover",
        ghost:
          "border-transparent bg-transparent text-admin-text hover:bg-admin-surface-hover",
        danger:
          "border-transparent bg-admin-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        default: "h-9 px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof adminButtonVariants> {
  asChild?: boolean;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(adminButtonVariants({ variant, size, className }))} {...props} />
    );
  },
);
AdminButton.displayName = "AdminButton";

export { adminButtonVariants };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/__tests__/admin-button.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/admin-button.tsx src/components/admin/__tests__/admin-button.test.ts
git commit -m "feat(admin): AdminButton primitive"
```

---

## Task 3: StatusBadge primitive

**Files:**
- Create: `src/components/admin/ui/status-badge.tsx`
- Test: `src/components/admin/__tests__/status-badge.test.ts`

**Interfaces:**
- Consumes: admin token utilities; `cn`.
- Produces:
  - `statusBadgeVariants(opts?: { tone?: "neutral" | "success" | "warning" | "info" | "danger"; className?: string }): string`
  - `StatusBadge` — function component; props extend `React.HTMLAttributes<HTMLSpanElement>` + `VariantProps<typeof statusBadgeVariants>`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/__tests__/status-badge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { statusBadgeVariants } from "@/components/admin/ui/status-badge";

describe("statusBadgeVariants", () => {
  it("neutral is the default tone", () => {
    expect(statusBadgeVariants()).toContain("text-admin-text-muted");
  });

  it("success uses a subtle tinted background (no bright fill)", () => {
    const cls = statusBadgeVariants({ tone: "success" });
    expect(cls).toContain("bg-admin-success/12");
    expect(cls).toContain("text-admin-success");
  });

  it("danger maps to the danger token", () => {
    expect(statusBadgeVariants({ tone: "danger" })).toContain("text-admin-danger");
  });

  it("merges caller className", () => {
    expect(statusBadgeVariants({ className: "ml-2" })).toContain("ml-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/__tests__/status-badge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/admin/ui/status-badge.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Subtle tonal status pill — tinted background at 12% + solid token text.
 *  Never a bright/saturated fill (per admin design rules). */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-btn border border-transparent px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-admin-surface-hover text-admin-text-muted",
        success: "bg-admin-success/12 text-admin-success",
        warning: "bg-admin-warning/12 text-admin-warning",
        info: "bg-admin-info/12 text-admin-info",
        danger: "bg-admin-danger/12 text-admin-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />;
}

export { statusBadgeVariants };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/__tests__/status-badge.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/status-badge.tsx src/components/admin/__tests__/status-badge.test.ts
git commit -m "feat(admin): StatusBadge primitive"
```

---

## Task 4: AdminCard primitive

**Files:**
- Create: `src/components/admin/ui/admin-card.tsx`

**Interfaces:**
- Consumes: admin token utilities; `cn`.
- Produces: `AdminCard` — `React.forwardRef<HTMLDivElement, AdminCardProps>`; `AdminCardProps` extends `React.HTMLAttributes<HTMLDivElement>` + `{ interactive?: boolean }`. When `interactive`, the border transitions to accent on hover (used by clickable stat/link cards).

- [ ] **Step 1: Write the implementation**

Create `src/components/admin/ui/admin-card.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, the border shifts to accent on hover (for clickable cards). */
  interactive?: boolean;
}

/** The one admin surface: shared radius (rounded-card), gray border,
 *  optional accent-on-hover for clickable cards. Border transition only. */
export const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-admin-border bg-admin-surface p-4 " +
          "transition-[border-color] duration-150",
        interactive && "cursor-pointer hover:border-admin-border-hover",
        className,
      )}
      {...props}
    />
  ),
);
AdminCard.displayName = "AdminCard";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ui/admin-card.tsx
git commit -m "feat(admin): AdminCard primitive"
```

---

## Task 5: SearchInput primitive

**Files:**
- Create: `src/components/admin/ui/search-input.tsx`

**Interfaces:**
- Consumes: admin tokens; `cn`; `Search` icon from `lucide-react`.
- Produces: `SearchInput` — `React.forwardRef<HTMLInputElement, SearchInputProps>`; `SearchInputProps` extends `React.InputHTMLAttributes<HTMLInputElement>` (all native input props incl. `value`, `onChange`, `placeholder`). Renders a leading search icon inside a bordered field whose border becomes accent on focus-within.

- [ ] **Step 1: Write the implementation**

Create `src/components/admin/ui/search-input.tsx`:

```tsx
import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Bordered search field; icon leading; border → accent on focus-within.
 *  Uses rounded-input (8px) per the shared radius scale. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-input border border-admin-border bg-admin-surface px-3 " +
          "transition-[border-color] duration-150 focus-within:border-admin-border-active",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-admin-text-muted" aria-hidden />
      <input
        ref={ref}
        type="search"
        className="min-w-0 flex-1 bg-transparent text-sm text-admin-text outline-none placeholder:text-admin-text-muted"
        {...props}
      />
    </div>
  ),
);
SearchInput.displayName = "SearchInput";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ui/search-input.tsx
git commit -m "feat(admin): SearchInput primitive"
```

---

## Task 6: Feedback states (EmptyState, LoadingState, ErrorState)

**Files:**
- Create: `src/components/admin/feedback/empty-state.tsx`
- Create: `src/components/admin/feedback/loading-state.tsx`
- Create: `src/components/admin/feedback/error-state.tsx`

**Interfaces:**
- Consumes: admin tokens; `cn`; `AlertTriangle` from `lucide-react`.
- Produces:
  - `AdminEmptyState(props: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string })`
  - `AdminLoadingState(props: { rows?: number; className?: string })` — renders `rows` (default 5) skeleton bars.
  - `AdminErrorState(props: { title?: string; description?: string; action?: React.ReactNode; className?: string })` — default title `"Something went wrong"`.

- [ ] **Step 1: Create AdminEmptyState**

Create `src/components/admin/feedback/empty-state.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-admin-border " +
          "bg-admin-surface px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-card bg-admin-surface-hover text-admin-text-muted [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-admin-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-admin-text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create AdminLoadingState**

Create `src/components/admin/feedback/loading-state.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/** Skeleton placeholder rows. Pure CSS pulse — reduced-motion safe via the
 *  global prefers-reduced-motion rule in globals.css. */
export function AdminLoadingState({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-full animate-pulse rounded-input bg-admin-surface-hover"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create AdminErrorState**

Create `src/components/admin/feedback/error-state.tsx`:

```tsx
import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-admin-border " +
          "bg-admin-surface px-6 py-16 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-card bg-admin-danger/12 text-admin-danger [&_svg]:size-6">
        <AlertTriangle aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-admin-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-admin-text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/feedback/
git commit -m "feat(admin): feedback states (empty, loading, error)"
```

---

## Task 7: Barrel export

**Files:**
- Create: `src/components/admin/index.ts`

**Interfaces:**
- Consumes: all components from Tasks 2–6.
- Produces: a single import surface — `import { AdminButton, StatusBadge, AdminCard, SearchInput, AdminEmptyState, AdminLoadingState, AdminErrorState } from "@/components/admin";`

- [ ] **Step 1: Write the barrel**

Create `src/components/admin/index.ts`:

```ts
export { AdminButton, adminButtonVariants } from "./ui/admin-button";
export type { AdminButtonProps } from "./ui/admin-button";
export { StatusBadge, statusBadgeVariants } from "./ui/status-badge";
export type { StatusBadgeProps } from "./ui/status-badge";
export { AdminCard } from "./ui/admin-card";
export type { AdminCardProps } from "./ui/admin-card";
export { SearchInput } from "./ui/search-input";
export type { SearchInputProps } from "./ui/search-input";
export { AdminEmptyState } from "./feedback/empty-state";
export { AdminLoadingState } from "./feedback/loading-state";
export { AdminErrorState } from "./feedback/error-state";
```

- [ ] **Step 2: Typecheck + full test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (existing suite + the 2 new admin test files).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/index.ts
git commit -m "feat(admin): barrel export for admin primitives"
```

---

## Task 8: Visual smoke-test via a scratch harness

Goal: prove tokens render (light + dark) and orange is scoped to admin — without adding a permanent route. Use a throwaway page rendered under a `data-admin` wrapper, verify via DOM inspection, then delete it.

**Files:**
- Create (temporary): `src/app/admin-token-preview/page.tsx`

- [ ] **Step 1: Create the throwaway preview page**

Create `src/app/admin-token-preview/page.tsx`:

```tsx
import {
  AdminButton,
  StatusBadge,
  AdminCard,
  SearchInput,
  AdminEmptyState,
  AdminLoadingState,
  AdminErrorState,
} from "@/components/admin";
import { Inbox } from "lucide-react";

export default function AdminTokenPreview() {
  return (
    <div data-admin className="min-h-screen bg-admin-bg p-8 text-admin-text">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap gap-3">
          <AdminButton variant="primary">Primary</AdminButton>
          <AdminButton variant="secondary">Secondary</AdminButton>
          <AdminButton variant="ghost">Ghost</AdminButton>
          <AdminButton variant="danger">Danger</AdminButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="neutral">Draft</StatusBadge>
          <StatusBadge tone="success">Published</StatusBadge>
          <StatusBadge tone="warning">Scheduled</StatusBadge>
          <StatusBadge tone="info">Info</StatusBadge>
          <StatusBadge tone="danger">Failed</StatusBadge>
        </div>
        <SearchInput placeholder="Search…" />
        <AdminCard interactive>Hover me — border goes orange.</AdminCard>
        <AdminEmptyState icon={<Inbox />} title="No items yet" description="Create your first." action={<AdminButton size="sm">New</AdminButton>} />
        <AdminLoadingState rows={3} />
        <AdminErrorState description="Try again in a moment." action={<AdminButton size="sm" variant="secondary">Retry</AdminButton>} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and load the page**

Use the preview tooling (per project convention — no screenshots): start the dev server, navigate to `/admin-token-preview`.

- [ ] **Step 3: Verify via DOM inspection (light)**

Using `preview_inspect` / `preview_eval`, confirm:
- `[data-admin]` wrapper computed `--admin-accent` resolves to `rgb(254, 81, 0)` (#FE5100).
- A primary `AdminButton` background computes to that orange.
- `StatusBadge` success text/background use the success token (not a bright fill).
Expected: values match; no console errors (`preview_console_logs`).

- [ ] **Step 4: Verify dark + scope isolation**

- `preview_resize` with `colorScheme: "dark"` (or toggle the site theme): surfaces flip to zinc; accent stays `rgb(254, 81, 0)`.
- Navigate to any public route (e.g. `/`) and confirm NO element resolves `--admin-accent` (token is undefined outside `[data-admin]`), proving scope isolation.
Expected: public site unchanged; orange confined to admin.

- [ ] **Step 5: Delete the throwaway page**

```bash
git rm -r src/app/admin-token-preview
git commit -m "chore(admin): remove token-preview scratch page"
```

(Removing the route leaves the primitives + tokens as the only PR1 additions.)

---

## Task 9: Open PR

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin <branch>
gh pr create --base main \
  --title "feat(admin): design tokens + admin primitives (redesign PR1)" \
  --body "PR1 of the admin UI redesign (spec: docs/superpowers/specs/2026-07-05-admin-ui-redesign-design.md). Adds admin-scoped #FE5100 tokens layered on existing base tokens, and the foundational components/admin primitives + feedback states. No routes/APIs/logic/schema touched; public site frozen; orange scoped to [data-admin]. No pages consume these yet — that begins in PR2 (shell)."
```

Expected: PR URL returned.

---

## Self-Review

**1. Spec coverage (PR1 slice of the spec):**
- Semantic token set (§4) → Task 1 ✓ (full `--admin-*` set + `@theme` mappings, light+dark, scoped).
- Accent admin-only, scoped, `#FE5100`, never leaks (§3) → Task 1 + Task 8 Step 4 isolation check ✓.
- Fresh `components/admin/{ui,feedback}` layers (§5) → Tasks 2–6 ✓ (layout/data/widgets/forms layers come in later PRs, correctly out of PR1 scope).
- Buttons primary/secondary/ghost/danger (§11) → Task 2 ✓.
- StatusBadge subtle tones neutral/success/warning/info/danger (§11) → Task 3 ✓.
- AdminCard one radius/padding, accent-on-hover (§11, §3) → Task 4 ✓.
- Feedback: empty/loading(skeleton)/error (§5, §12) → Task 6 ✓.
- Animation rules ≤150ms, border-color only, reduced-motion (§13) → encoded in every primitive (`duration-150`, `transition-[border-color]`); reduced-motion inherited from global rule ✓.
- Component quality: disabled/dark/RTL-safe (§12) → AdminButton `disabled:`, all use tokens (dark), logical spacing utilities ✓. (loading/empty/error are the feedback components; per-component `loading` prop on richer components arrives with DataTable/forms in later PRs.)

**2. Placeholder scan:** No TBD/TODO; every code step contains full source. ✓

**3. Type consistency:** `adminButtonVariants`/`statusBadgeVariants` names match between component, test, and barrel. Props types (`AdminButtonProps`, `StatusBadgeProps`, `AdminCardProps`, `SearchInputProps`) exported and re-exported consistently. Token utility names in tests (`bg-admin-accent`, `bg-admin-success/12`, etc.) match those produced by Task 1's `@theme` mappings. ✓

**4. Deferred correctly:** layout/data/widgets/forms primitives, DataTable, real pages — all later PRs, not PR1. ✓
