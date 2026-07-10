# Homepage Split + Buyer Funnel — Design

**Date:** 2026-07-10
**Status:** Awaiting review
**Owner:** Shubham Datarkar

---

## Problem

The site attracts an audience and converts almost none of it into retainer inquiries. Traffic exists across the blog, games, and community. The `contacts` inbox is close to empty.

Three root causes, in order of severity:

1. **The homepage sells to people who cannot pay.** The hero reads "I build growth systems for startups that are just getting started." That segment has no budget. The contact form's budget dropdown runs from "Under ₹1L / mo" to "₹6L+ / mo". The positioning and the price point in opposite directions.

2. **There is no middle rung.** The commitment ladder has exactly two steps: read a blog post (zero commitment) and book a 30-minute call with a stranger (high commitment). "Book a discovery call" appears four times. The newsletter — the only low-commitment capture — sits in section 10 of 10 on the homepage.

3. **Nothing is attributed.** `submitContact` in `src/lib/contact/actions.ts` persists `name`, `email`, `project_type`, `budget`, `message`. No source, no referrer, no landing page. It is impossible to know which of ~35 public routes produces revenue, so it is impossible to invest in any of them deliberately.

A secondary cause: the site mixes two businesses behind one front door. Donations, games, a link-in-bio page, and a community feed sit alongside a ₹6L/mo service offering. A buyer evaluating a retainer re-categorizes the author from vendor to personality.

---

## Buyer

**Primary (this spec serves this buyer):** 0–10 Cr ARR businesses in India — SaaS founders, agency owners, growth-stage startups. They buy outcomes and pay ₹1L–6L+/mo.

**Secondary (served by the existing audience surface, out of scope here):** creators, solopreneurs, consultants, ambitious professionals building a personal brand. They pay at low ticket via `/members`, the newsletter, and the community.

Both are real. They cannot share a front door.

---

## Decisions (locked)

- **Lead offer:** the AEO/GEO wedge — *"Get your brand cited by AI."* Every other capability (SEO, content, branding, CRO, performance, AI automation) becomes a supporting offer. Rationale: it is the only line item on the list that competitors in India do not sell credibly, and the only one the buyer cannot self-evaluate.
- **`/me` scope:** personal-brand pages only. Games and Community keep their own top-level nav entries.
- **No redirects.** `/` never moves. `/me` is net-new. Zero 301s, zero broken inbound links.

### Flagged, then dropped

Keeping "Games" in the primary nav costs credibility with a ₹4L/mo buyer. Decision made to keep it. Recorded here once; not relitigated.

---

## Non-goals

- Lead scoring, auto-triage, and reply-speed SLAs. There is no pipeline to triage yet. Revisit once inquiries are non-zero.
- Qualification fields on the contact form. Same reason — you cannot filter an empty funnel.
- Migrating, gating, or monetizing the audience surface (games, community, support, link).
- Any change to `/members` or its Razorpay flow.

---

## Architecture

### `/me` — the personal-brand home

Today's `src/app/page.tsx`, moved almost verbatim to `src/app/me/page.tsx`.

Changes on move:

- `buildMetadata({ path: "/" })` becomes `buildMetadata({ path: "/me" })`.
- Hero CTA pair swaps: "Book a discovery call" + "See my work" becomes newsletter + community. A personal-brand page should not ask a reader for a sales call.
- `organizationSchema()` stays on `/` (it describes the business). `/me` carries `Person` / `ProfilePage` schema.
- Everything else — platforms, capabilities, case study rail, writing rail, tool stack, testimonial marquee, stats, newsletter — moves unchanged.

Discovery is filesystem-based (`src/lib/seo/discovery.ts` walks `src/app`), so `/me` enters the sitemap automatically. Add `/me` to `WEEKLY_PATHS` in `src/app/sitemap.ts`.

### `/` — the buyer home

A re-composition of components that already exist. No new components required.

| Section | Component | Purpose |
|---|---|---|
| Hero | new markup | Name the buyer and the broken thing. Primary CTA: free AEO/GEO audit. Secondary: book a call. |
| Client logos | `ClientsMarquee` | Proof of existence |
| Who this is for / isn't for | `Card` | Let the buyer disqualify themselves without talking to you |
| Three offers, with price | `ServiceCard` | AEO/GEO first. Render `startingAt`. |
| Two case studies | `CaseStudyCard` | Render `results: KpiRow[]` — the numbers, not the narrative |
| How it works | existing `how` array | Audit → Design → Build → Compound |
| Testimonials | `TestimonialCard` in a static grid | Legible, not a scrolling marquee |
| Who is Shubham | new strip | Two sentences plus a link to `/me`. Preserves brand-query relevance on `/`. |
| Booking | `CtaBand` (extended) | |

The "Who is Shubham" strip is not optional. Brand searches for the name currently land on `/`. Keeping `Person` schema and a short bio there means the split costs no brand-query equity.

---

## Phases

### Phase 1 — Attribution spine

Ship first so every later change is measurable from the hour it lands.

- Migration: add `first_landing_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `pages_seen` to `contacts`.
- A first-touch cookie set on first visit, read by `submitContact`.
- Surface the columns in `/admin/contacts`.

Written as a migration file and handed over as SQL to run manually, per the project's Supabase workflow. Never applied directly.

**Acceptance:** a contact submitted after arriving from a blog post records that post as `first_landing_page`.

### Phase 2 — `/me`

Pure move. Lowest risk. Prove nothing broke before rewriting anything.

**Acceptance:** `/me` renders today's homepage. `/` still renders it too (unchanged, temporarily duplicated). Sitemap contains `/me`. Publishing a post revalidates both.

### Phase 3 — `/` rewrite

The buyer page. Mostly copy.

Sub-changes:

- `ServiceCard` renders `startingAt`. Price becomes visible everywhere services appear.
- `CaseStudyCard` leads with its top `KpiRow`.
- `CtaBand` gains `primaryHref` and `secondaryHref` props, defaulting to today's hardcoded values so existing call sites are unaffected.

**Acceptance:** `/` no longer contains the phrase "startups that are just getting started". Price bands visible without clicking. Hero CTA points at `/contact` until Phase 4 lands, then switches to the audit tool.

### Phase 4 — The audit tool (the middle rung)

Public AEO/GEO audit: a visitor enters a URL, gets a real score, sees what an LLM sees. Email-gated for the full report. This is the first-touch capture, and it self-selects for people who own a site worth auditing.

**This is not free.** The existing engine (`analyzer.ts`, `scoring.ts`, `audit.ts`) reads TSX source from the local filesystem. Auditing a third party's URL requires fetching and parsing rendered HTML — a module that does not exist. A file named `src/lib/seo/fetch-html.ts` was present untracked at the start of this session and has since been deleted by a concurrent session. Do not assume it exists. Scope this phase as: build the fetcher, adapt the analyzer to accept HTML rather than a source tree, then wrap it in a public route.

Because Phase 3's hero CTA depends on this, Phase 3 ships with the CTA pointed at `/contact` and is switched to the audit tool when Phase 4 lands.

**Acceptance:** a stranger's URL returns a score and a report. Email captured. Row appears in `contacts` or `people` with attribution.

### Phase 5 — Contextual CTA

`CtaBand` selects its case study and its copy from the current post's category. An SEO essay ends with the SEO case study and the audit tool.

### Phase 6 (was "B") — Bottom-of-funnel content

Money pages targeting what a buyer with budget actually types: "AEO agency India", "GEO optimisation for SaaS", "get cited by ChatGPT", and neighbours. Compounds over 3–6 months.

Deliberately last. Sending qualified buyers into a funnel that offers them a donation button and a word game wastes the traffic.

---

## Gotchas

**Stale `/me`.** `src/lib/blog/actions.ts:16` and `src/lib/content/actions.ts:17,30` call `revalidatePath("/")` on publish, because the homepage renders featured posts, case studies, and the testimonial marquee. After the split `/me` renders the same content and nothing revalidates it — it would silently freeze at build time. Both actions must revalidate `/me` as well. This is the single most likely bug in the whole change.

**`site.ts` nav.** `primaryNav` and `footerNav` need a `/me` entry. `footerNav` "Explore" currently starts with `Home → /`, which now means something different.

**Concurrent sessions.** Another Claude session is active in this working tree and has already added and deleted files under `src/lib/seo/` during this conversation. Re-check `git status` and `origin/main` before any branch operation. Branch from `origin/main`, not local `HEAD`.

**Testimonial marquee.** Fine on `/me`. On `/`, proof must sit still long enough to be read.

---

## Open questions

1. **The hero sentence.** Direction is locked ("Get your brand cited by AI"); the exact copy is not. It must name the buyer and the broken thing.
2. **Do the case studies carry numbers strong enough to lead with?** `results: KpiRow[]` exists in the type. Whether the published rows contain compelling values has not been verified — the project database is not reachable from this session.
3. **Audit tool depth.** Does the public audit run the full internal scoring rubric, or a deliberately reduced version that leaves the buyer wanting the paid engagement?

---

## Verification

- `next build` must be confirmed by its own exit code; piping masks failure.
- `/me` and `/` both render, both revalidate on publish.
- No route returns 404 that returned 200 before.
- Sitemap contains `/` and `/me`, and `/` retains priority 1.
