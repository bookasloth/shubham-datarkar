# Blueprint Design System — Design

**Date:** 2026-07-23
**Status:** Approved for spec (awaiting final spec review)
**Branch:** `design/screenshot-inspiration`

## Summary

Adopt the Vercel / Next.js "engineering blueprint" visual language into
shubhamdatarkar.com, expressed through the site's existing locked design
system (pure monochrome, one interaction-only brand orange, Poppins + Jakarta,
locked radii). Deliver a small reusable **Blueprint Kit** of primitives, then
layer **12 genuinely-unused Next.js 16 capabilities** on top of it as creative,
use-case-driven features.

The aesthetic is already 90% compatible: the site's `torch` theme is pure black
`#000`, the system is monochrome, and orange is already "interaction only, never
decorative." The new work adds a *blueprint layer* — dashed crosshair grids,
corner `+` markers, geometric construction marks, thin-border bento cards — all
strictly monochrome, all theme-aware.

## Goals

- One coherent blueprint visual language, reused everywhere (not per-page drift).
- Prove it on the 404 page (matches the reference screenshot exactly).
- Use Next.js 16 features the site does not yet use, each tied to a real
  page/use-case, not tech for its own sake.
- Zero new runtime dependencies. `framer-motion` (v12) is already installed and
  already wraps reveal-on-scroll with reduced-motion safety.

## Non-Goals

- No change to the locked color rule: orange stays interaction-only; the entire
  blueprint layer is gray-on-canvas.
- No new fonts (Geist is *not* adopted; Poppins display + Jakarta body stay).
- No new radii or token names. Reuse `--border`, `--muted-foreground`,
  `--foreground`, `rounded-card`.
- CircuitDiagram and ShowcaseMosaic motifs are explicitly deferred (YAGNI) until
  a specific page needs them.

## Design Principles / Constraints

- **Theme-aware, not hardcoded black.** Primitives read design tokens so they
  render correctly in light (gray-on-white), dark, and torch (pure black). The
  Vercel look is the torch/dark expression; light mode degrades gracefully.
- **SVG for anything that draws.** Lines/marks are SVG so `stroke-dashoffset`
  can animate the draw-in reveal.
- **Reduced-motion is a first-class path,** never an afterthought: every
  animated primitive renders its final drawn state when
  `useReducedMotion()` is true.
- **Next.js API verification.** This repo runs Next.js 16.2.9 with documented
  breaking changes (see `AGENTS.md`). Before implementing the newer features
  (PPR flag, View Transitions config, `use cache`, Draft Mode, middleware),
  read the relevant guide in `node_modules/next/dist/docs/` — exact API surface
  may differ from prior versions.

---

## Phase 0 — Blueprint Kit (foundation)

Location: `src/components/blueprint/`

| Primitive | File | API (sketch) | Purpose |
|---|---|---|---|
| `BlueprintFrame` | `blueprint-frame.tsx` | `<BlueprintFrame variant="dashed"\|"solid" markers?={boolean} draw?={boolean}>` wraps children | Workhorse box: heroes, 404, section wrappers |
| `CrosshairGrid` | `crosshair-grid.tsx` | `<CrosshairGrid cell={50} circles?={boolean} draw?={boolean} />` absolute bg layer | Grid + circle-intersection background behind hero content |
| `GeometricMark` | `geometric-mark.tsx` | `<GeometricMark size={96} draw?={boolean} />` | Dashed triangle + filled circle; 404 / empty-state signature graphic |
| `BentoCard` | `bento-card.tsx` | `<BentoCard title desc illustration?={ReactNode}>` | Thin-border card; dot-grid illustration slot default |

**Tokens (no new ones):**
- Lines → `--border`
- Dim marks / `+` corners → `--muted-foreground`
- Fills / text → `--foreground`
- Card radius → existing `rounded-card` (12px)

**Motion (shared helper):**
- framer-motion `whileInView` (`viewport={{ once: true, margin: "-80px" }}`)
  drives SVG `strokeDashoffset: 1 → 0` over ~0.8s using the system ease
  `cubic-bezier(0.22, 1, 0.36, 1)`, staggered per line/segment.
- `useReducedMotion()` → render final drawn state (offset 0), no animation.
- Mirror the existing `src/components/motion/reveal.tsx` conventions so the
  patterns match.

**Proof page:** rebuild `src/app/not-found.tsx` to match reference screenshot 1:
`CrosshairGrid` background + outer `BlueprintFrame` (with corner markers) +
`GeometricMark` centered above the `404` numerals. Preserve the existing
"logged in as / sign in as different user" behavior and the quick-links row.

**Test:** `src/components/blueprint/blueprint.test.tsx` — asserts each primitive
renders its SVG, and that the reduced-motion code path emits final (drawn)
attributes (offset 0).

---

## Phase 1 — Visual delight (consumes the kit)

### F1 · Intercepting + Parallel routes → Blueprint modal preview
- **Where:** `/case-studies`, `/projects`, `/work` (showcase), `/media-kit`.
- **How:** `(.)`-intercepting route renders the target card inside a
  `BlueprintFrame` overlay modal. A hard refresh or deep-link on the same URL
  renders the full standalone page. Uses a parallel `@modal` slot in the layout.
- **Fallback:** JS-off / direct visit → full page (intercept simply doesn't fire).
- **Acceptance:** clicking a card opens a framed modal without a full nav; URL is
  shareable; refresh shows full page; ESC/back closes.

### F2 · View Transitions API → shared-element morph
- **Where:** `/blog` and `/case-studies` list ↔ detail.
- **How:** enable Next.js View Transitions; give the card container and the
  detail header the same `view-transition-name`; the `BlueprintFrame` persists
  and grows from card to header.
- **Fallback:** unsupported browsers / reduced-motion → instant navigation, no
  morph (feature-detected).
- **Acceptance:** navigating list→detail animates the shared frame; reduced-motion
  users get an instant cut.

### F9 · Styled `loading.tsx` → self-drawing skeletons
- **Where:** `/blog`, `/community`, `/dashboard`, and other heavy routes lacking
  a styled loader.
- **How:** route `loading.tsx` renders `CrosshairGrid` drawing itself as the
  skeleton; real content streams in and replaces it.
- **Fallback:** reduced-motion → static grid, no draw animation.
- **Acceptance:** navigating to the route shows the blueprint skeleton, then
  content; no blank flash.

---

## Phase 2 — SEO firepower

### F3 · Partial Prerendering (PPR) → static shell + live island
- **Where:** `/seo-expert-india`, `/services`, blog posts.
- **How:** `experimental_ppr` on the segment; page is statically prerendered,
  a Suspense-wrapped dynamic island renders live data ("N reading now" /
  "updated live"). Verify flag name against installed Next docs.
- **Fallback:** island suspends to a blueprint skeleton, then hydrates.
- **Acceptance:** page HTML is static/instant; the island updates without
  blocking first paint.

### F4 · Middleware (Proxy) → geo-personalized hero
- **Where:** home, `/seo-expert-india`.
- **How:** `middleware.ts` reads the geo header, injects a city hint (header or
  cookie); hero renders "SEO services in **{city}**" with a sensible default
  when geo is absent.
- **Privacy:** no personal data in URLs; city is coarse geo only; falls back to
  a neutral default.
- **Acceptance:** visitors from a known region see their city; unknown → default
  copy; no layout shift.

### F5 · Programmatic `generateStaticParams` → city SEO landing pages
- **Where:** new `/seo-expert-india/[city]` cluster.
- **How:** a curated city list drives `generateStaticParams`; each page is
  prerendered from one blueprint-framed template with city-specific copy +
  JSON-LD.
- **Acceptance:** each city URL is statically generated, unique title/meta/H1,
  framed layout; unlisted city → 404.

### F6 · Dynamic OG (`ImageResponse`) → blueprint OG cards
- **Where:** every shareable route missing a bespoke OG image — case-studies,
  projects, services, profile/`/me`, city pages.
- **How:** per-route `opengraph-image.tsx` builds a card with crosshair grid +
  `GeometricMark` + title/subtitle via `ImageResponse`.
- **Acceptance:** each route's OG image renders the blueprint card with correct
  dynamic text; validates in a card debugger.

### F8 · Instrumentation / Web Vitals → live performance proof strip
- **Where:** `/seo-expert-india`, `/me`, footer.
- **How:** `useReportWebVitals` collects this page's LCP/CLS/INP into a small
  client store; render them in blueprint stat tiles ("this page: LCP 0.8s,
  CLS 0.01").
- **Acceptance:** real measured values appear after load; no fabricated numbers;
  degrades to hidden if metrics unavailable.

---

## Phase 3 — Ops / tools

### F7 · Route Handlers as asset endpoints → embeddable live badges
- **Where:** `/api/badge/*`, footer, `/now`.
- **How:** `GET` route handlers return dynamic `image/svg+xml`: latest post,
  community member count, live "now" status, optionally a CWV badge. Blueprint-
  styled, cacheable.
- **Acceptance:** each badge endpoint returns valid SVG with current data and
  correct cache headers; embeddable via `<img>`.

### F10 · Draft Mode → live preview of unpublished content
- **Where:** `/admin`, KalamAI, `/blog` drafts.
- **How:** `draftMode()` cookie enables a preview route that renders unpublished
  DB content with a blueprint "DRAFT" corner frame; a disable route clears it.
- **Security:** enabling draft mode is gated behind existing admin auth only.
- **Acceptance:** admins preview a draft live; the DRAFT frame is visible;
  non-admins cannot enable it.

### F11 · `use cache` (Next 16) → cached expensive computes
- **Where:** `/tools/kalamai`, SEO-audit tool.
- **How:** `'use cache'` + `cacheTag` on heavy generated sections; invalidate via
  existing tag revalidation. Verify directive + config against installed Next
  docs (may require `dynamicIO` / cache config).
- **Acceptance:** repeat loads of an unchanged compute are instant; a source
  change invalidates the tag.

### F12 · Streaming + Suspense → progressive section reveal
- **Where:** `/blog` index, `/community`, `/me`.
- **How:** stream independent sections; each opens from a blueprint skeleton
  (reuses F9) into content as its data resolves.
- **Acceptance:** page paints top-down; slow sections don't block fast ones; no
  blank full-page wait.

---

## Sequencing & Dependencies

- **Phase 0 is a hard dependency** for F1, F2, F6, F7, F9, F10 (all consume kit
  primitives). Build and prove it first.
- Phases 1→3 are independently shippable after Phase 0. Recommended order:
  0 → 1 → 2 → 3, but each feature (F1…F12) is its own implementation slice with
  its own acceptance criteria and can be reordered by priority.

## Cross-Cutting Requirements

- **Reduced motion:** every animated surface has a static final-state fallback.
- **Theme-awareness:** every primitive and OG card is legible in light, dark,
  and torch.
- **No new deps:** reuse framer-motion; no animation/UI library additions.
- **Next 16 API check:** verify PPR, View Transitions, `use cache`, Draft Mode,
  and middleware APIs against `node_modules/next/dist/docs/` before coding each.
- **PR/announce:** any announce-eligible PR needs a `Tweet:` line per
  `docs/PR-TWEET.md` (repo convention).

## Testing Strategy

- Phase 0: unit test per primitive (renders SVG; reduced-motion final state).
- F1: intercept opens modal / direct URL renders full page.
- F5: each generated city route has unique metadata + returns 404 for unlisted.
- F6: OG route renders expected dynamic text.
- F8: proof strip shows measured (not hardcoded) values.
- F10: draft mode gated to admins.
- Others: acceptance criteria above become the smallest runnable check each.

## Open Questions (resolve during implementation)

1. City list for F5 — which cities, and copy source (static vs DB)?
2. F4 geo source — Vercel geo headers vs a lookup; confirm what this deploy
   exposes.
3. F8 — show vitals on public pages always, or only when they're "good"?
4. Whether F1 modals should also apply to `/blog` cards or stay list-only.
