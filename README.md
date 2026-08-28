<div align="center">

# shubhamdatarkar.com

**The founder HQ — a personal platform, not a landing page.**

Public site, gated member area, community feed, browser games, an AI writing tool,
and a full admin backoffice — one Next.js app, one Supabase database.

<br />

![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-087EA4?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?style=flat-square&logo=vercel)

</div>

---

## What this is

A single app that wears many hats. Not a template — a living product with real users,
real auth, and real content pipelines.

| Surface | What lives there |
|---|---|
| **Public** | Home, my-story, work, case studies, speaking, blog, roadmap, changelog |
| **Community** | X/Tumblr-style feed — notes, replies, reblogs, @mentions, follows, bookmarks |
| **Games** | Three daily browser games (Alfazy, Hit & Blow, Integra) — archives, leaderboards, share-as-image |
| **Members** | Gated Marketing OS — resources, tools, downloads, bookmarks, upgrade flow |
| **KalamAI** | One-click AI article discovery + generation (Anthropic SDK) |
| **Support** | Supporter tiers, updates feed, confetti ProfileCard |
| **Admin** | Backoffice for every surface — posts, people, SEO, email inbox, games, payments |

## Stack

- **Framework** — Next.js `16.2` (App Router, React `19.2` Server Components)
- **Styling** — Tailwind CSS `4` + Radix UI primitives + Framer Motion
- **Data** — Supabase (Postgres + Row Level Security + security-definer RPCs)
- **AI** — `@anthropic-ai/sdk` (KalamAI pipeline, auto community notes)
- **Email** — Nodemailer (SMTP) + ImapFlow (live admin inbox)
- **Content** — `@mozilla/readability` + `linkedom` + `sanitize-html` for extraction
- **Icons** — Lucide + Phosphor
- **Tests** — Vitest
- **Host** — Vercel (env vars managed manually)

> Design language: monochrome, no emojis, **Plus Jakarta Sans** + **Poppins**, velocity-first.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Supabase + service keys are wired manually (the Vercel Supabase integration is
intentionally removed). Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Conventions

- **Every change ships via a PR** — never commit direct to `main`.
- **Every announceable PR auto-posts a note to `/community`.** Add a `Tweet:` line
  to the PR body per [`docs/PR-TWEET.md`](docs/PR-TWEET.md), or the fallback template pool posts instead.
- **Migrations are hand-written SQL.** Write the file, run it against Supabase manually.
- **This is not the Next.js you know** — read the guides in `node_modules/next/dist/docs/`
  before writing framework code (see [`AGENTS.md`](AGENTS.md)).

## Structure

```
src/
  app/          # App Router — 140+ routes across every surface
  components/   # Shared UI, app-shell, per-surface components
  lib/          # Supabase clients, auth, content pipelines
docs/           # PR-TWEET voice guide, open items
```

---

<div align="center">
<sub>Built by <a href="https://shubhamdatarkar.com">Shubham Datarkar</a>.</sub>
</div>
