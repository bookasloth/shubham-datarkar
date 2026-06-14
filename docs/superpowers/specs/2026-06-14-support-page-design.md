# Support Page (`/support`) — Design Spec

**Status:** Approved (design) — 2026-06-14
**Owner:** Shubham Datarkar
**Source:** Adapted from the "Coffee and Toffee" creator-support PRD, re-skinned to this site's locked monochrome system.

---

## 1. Summary

A single-creator support module at `domain.com/support` where visitors buy virtual **Coffees** and **Toffees** to support Shubham, read **Updates**, and see a ranked **Supporters** wall. Real payments via **Zoho Payments (sandbox first)**; real supports persisted to **Supabase**.

This is *not* a multi-creator platform — the profile is fixed (Shubham). The reference PRD's color system, emojis, and "start your own page" platform CTAs are removed.

### Hard constraints (inherited from site)
- **Pure monochrome.** Black / white / gray only — no chromatic color anywhere. Accent only via hover/focus, exactly as the rest of the site.
- **No emojis.** Use `lucide-react` SVG glyphs only. Coffee = `Coffee`, Toffee = `Candy`.
- **Theme-aware.** Light/dark via the existing `next-themes` toggle in the site header; all colors come from `globals.css` tokens.
- **Fonts:** Plus Jakarta Sans (headings), Poppins (body). **Radii:** btn 4 / input 8 / card 12. **Spacing:** 8px system.
- **Next.js note:** This is a modified Next.js — read `node_modules/next/dist/docs/` before writing route/handler code (per `AGENTS.md`). Tailwind v4 tokens via `@theme` in `globals.css`.

---

## 2. Information architecture

Pages, **not** client-side tabs. A nested layout holds the persistent profile sidebar + sub-nav.

```
/support              → Support  (default)
/support/updates      → Updates
/support/supporters   → Supporters
```

- `src/app/support/layout.tsx` — renders inside the site's global header/footer. Contains the persistent **ProfileCard** (sticky on desktop ≥920px, stacks above content below that) + **SupportNav** (3 links, active = ink label + 3px underline) + `{children}`.
- Sub-nav is link-based navigation between routes (not `role=tab`). Active state derived from pathname.

### API routes
- `src/app/api/support/session/route.ts` — `POST`: validate input, insert a **pending** `supports` row, create a Zoho Payment Session, return `{ payment_session_id, supportId }`.
- `src/app/api/support/webhook/route.ts` — `POST`: verify Zoho signature, mark the row **paid**/**failed**, store the Zoho payment id.

---

## 3. Amount model (single source of truth)

**Quantity × fixed unit price.** The supporter chooses *quantity*; unit prices are fixed config.

| Item | Unit price | Qty presets | Default qty | Units input range |
|------|-----------|-------------|-------------|-------------------|
| Coffee | ₹20 | 1 / 3 / 5 | 5 | 1–1000 |
| Toffee | ₹5 | 2 / 5 / 10 | 5 | 1–1000 |

- `base = coffeeUnits*20 + toffeeUnits*5`. Default = 5×20 + 5×5 = **₹125**.
- **Cover-fees checkbox** (default ON): adds `feePct` (~2%) to the **charged** amount only. Displayed support total stays `base`.
  - `charged = covers_fee ? round(base * (1 + feePct)) : base`.
- Button label shows live `base` total: "Support with ₹{base}". Disabled when `base === 0`.
- Currency: **INR (₹)**, no decimals for whole amounts. All currency/copy tokenized for future locales.

`feePct`, unit prices, presets, defaults, and currency live in `src/lib/data/support.ts` as config (single edit point).

---

## 4. Components (monochrome)

Reuse existing UI primitives (`button`, `card`, `badge`, `avatar`, `avatar-group`, `checkbox`, `input`, `textarea`) — do not reinvent.

| Component | Purpose | Notes |
|-----------|---------|-------|
| `ProfileCard` | Persistent identity sidebar | Data from `site-content.ts` (name, role, bio, socials, Nagpur, verified badge). Avatar fallback = initials. Shows supporter count (from DB). |
| `SupportNav` | 3-link sub-nav | Active underline; keyboard accessible; not a tablist. |
| `ItemPicker` | One per item (Coffee, Toffee) | lucide icon + name + unit price; single-select qty chips; units number input (custom qty); chips and input stay in sync. |
| `SupportForm` | Capture details | **Email required** (receipt), name optional, message ≤250 + live counter, "cover fees (~2%)" checkbox (default on), "appear anonymously" checkbox. |
| `SupportButton` | Commit support | Live ₹ total; states: default / hover-lift / active / loading / success ("Thank you") / disabled(0). On click → session → open Zoho widget. |
| `SupporterStrip` | Light social proof | Stacked avatars + overflow count + "X and N others supported recently" — from latest **paid** rows. |
| `UpdatePost` | One update | Variants: text, text+image, text+checklist. Header = avatar/name/date. |
| `StatsBar` | Headline metrics | Supporters total · Coffees received · Toffees received · Top this month. Wraps 2×2 on mobile. |
| `TierSection` | Ranked wall | Tiers **Pillars / Guardians / Torchbearers**. Distinguished by ring weight + lucide icon (crown on Pillars), **never color**. "View all" link; capped preview grid; initials fallback; long names truncate with title on hover/focus. |
| `ClosingCTA` | Convert | Headline + sub + primary CTA → `/about`. |

---

## 5. Tier engine

`src/lib/support/tiers.ts` maps a supporter's **lifetime contribution (₹)** → tier. Thresholds (configurable):

| Tier | Min lifetime ₹ | Icon | Ring |
|------|----------------|------|------|
| Pillars | ≥ 2500 | crown/star | heaviest |
| Guardians | ≥ 1000 | shield | medium |
| Torchbearers | ≥ 100 | flame | light |

(Below ₹100 = still a supporter, shown in strip/stats but not tiered, or grouped — decide in plan.)

---

## 6. Data model (Supabase — Shubham's OWN project, ref `oyzzgjrefkppqkxjccot`. NOT the BAS project `xwvciqkayammbvsidqig`.)

### Table `supports`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid pk | |
| created_at | timestamptz | default now() |
| name | text null | optional |
| email | text not null | receipt |
| message | text null | ≤250 |
| coffee_units | int | ≥0 |
| toffee_units | int | ≥0 |
| currency | text | 'INR' |
| base_amount | numeric | display total |
| fee_amount | numeric | cover-fee delta |
| total_amount | numeric | charged |
| covers_fee | bool | |
| anonymous | bool | wall display |
| status | text | pending / paid / failed |
| zoho_session_id | text null | |
| zoho_payment_id | text null | set on webhook |

- **Supporters / tiers / stats are derived** from `status='paid'` rows, grouped by `email` → `SUM(total_amount)` = lifetime, `SUM(coffee_units)` / `SUM(toffee_units)` for stats. Recent strip = latest N paid. (A SQL view or query helper — decide in plan.)
- **RLS:** public can read only paid rows, and only anonymized fields (no email; name hidden when `anonymous`). Inserts/updates server-only via service-role key. Never expose email publicly.

---

## 7. Payment flow (Zoho Payments)

Server creates a session; client widget collects payment; webhook confirms. Card data never touches our server (PCI delegated to Zoho).

1. **Click "Support with ₹X"** → client `POST /api/support/session` with `{ coffeeUnits, toffeeUnits, email, name?, message?, coversFee, anonymous }`.
2. **Server**: validate (email format, units in range, base>0); compute `base/fee/total`; insert **pending** `supports` row; call Zoho **Payment Session Create** (OAuth token from refresh token, server-side) → `payment_session_id`; return it + `supportId`.
3. **Client**: load Zoho checkout **widget** script, init with `ZOHO_ACCOUNT_ID` + `ZOHO_API_KEY`, open with `payment_session_id`. Supporter pays (UPI / card / netbanking).
4. **Webhook** `POST /api/support/webhook`: verify signature (`ZOHO_WEBHOOK_SECRET`); on success mark row `paid` + store `zoho_payment_id`; on failure mark `failed`.
5. **Client**: success state "Thank you"; the support appears on the wall once the webhook has confirmed.

Build against **sandbox** (`https://paymentssandbox.zoho.in`, scopes `ZohoPaySandbox.*`); flip to live by swapping env. Follow Zoho dev docs for exact endpoints/params at build time:
- https://www.zoho.com/in/payments/api/v1/introduction/
- https://www.zoho.com/in/payments/developerdocs/web-integration/integrate-widget/
- https://www.zoho.com/us/payments/faq/general/sandbox/

### Env (`.env.local`, gitignored — user fills, never pasted in chat)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ZOHO_ACCOUNT_ID=
ZOHO_API_KEY=
ZOHO_OAUTH_CLIENT_ID=
ZOHO_OAUTH_CLIENT_SECRET=
ZOHO_OAUTH_REFRESH_TOKEN=
ZOHO_WEBHOOK_SECRET=
ZOHO_API_BASE=https://paymentssandbox.zoho.in
```

---

## 8. Updates page content

`src/lib/data/support.ts` (or `support-updates.ts`) holds a mock-authored feed: variants **text**, **text+image**, **text+checklist**. Newest-first. Friendly empty state ("No updates yet") when none.

---

## 9. UX rules (inherited + module-specific)

- **Responsive:** ≥920px = sticky 340px sidebar + content; 640–920px = single column, sidebar stacks (not sticky); <640px = reduced padding, pickers/fields full width, stats bar 2×2.
- **Interaction states** on every interactive element: hover lift/tint (no layout shift), visible focus ring (monochrome, the site's existing `:focus-visible`), active baseline, loading (button → spinner, inputs lock), success transient, disabled (not focusable as action).
- **Empty/error/edge:** friendly empty states; inline email error ("Enter a valid email so we can send your receipt"); block submit on invalid/zero; payment failure preserves entered amount + message; long names truncate with full-on-hover.
- **A11y (WCAG AA):** never color-alone (selection changes fill/weight, not hue); full keyboard; labels on all inputs + icon-only buttons; respect `prefers-reduced-motion`; touch targets ≥44px.
- **Motion:** page nav + reveal short fade/rise; button hover 2px lift fast. Minimal.
- **Voice:** conversational, sentence case, active voice; "Support with ₹125" → success "Thank you"; ₹ no decimals.

---

## 10. Non-functional

- **Performance:** total feels instant — amount computed client-side, no round-trip to recompute.
- **Security/PCI:** no card data on our server; email only for receipt/recognition; secrets server-only; webhook signature verified.
- **Privacy:** anonymous display option; no personal data in URLs; email never exposed in public reads.
- **Resilience:** profile + nav render even if supporters/updates data is slow (skeletons / progressive load).

---

## 11. File map (proposed)

```
src/app/support/layout.tsx
src/app/support/page.tsx                 (Support)
src/app/support/updates/page.tsx
src/app/support/supporters/page.tsx
src/app/api/support/session/route.ts
src/app/api/support/webhook/route.ts
src/components/support/profile-card.tsx
src/components/support/support-nav.tsx
src/components/support/item-picker.tsx
src/components/support/support-form.tsx
src/components/support/support-button.tsx
src/components/support/supporter-strip.tsx
src/components/support/update-post.tsx
src/components/support/stats-bar.tsx
src/components/support/tier-section.tsx
src/components/support/closing-cta.tsx
src/lib/data/support.ts                  (item config, fee, tiers, mock updates)
src/lib/support/amount.ts                (amount engine)
src/lib/support/tiers.ts                 (tier engine)
src/lib/supabase/server.ts | browser.ts  (clients)
src/lib/zoho/session.ts | webhook.ts | oauth.ts
supabase migration: create table supports + RLS
```

---

## 12. Out of scope (v1)

Creator dashboard/editor, onboarding/signup, payouts/withdrawals, DMs, native apps, memberships/recurring, goals/progress bars, multi-creator. Video update variant deferred (text/image/checklist only in v1).
