/**
 * Template pools for auto-posts to /community. >=10 per kind so the feed reads
 * human, not robotic. Pure (only node:crypto) — unit-testable directly. Mirrors
 * the structure of src/lib/support/thankyou-messages.ts. No emojis (house style).
 */
import { randomInt } from "node:crypto";

export type AutoKind = "blog" | "caseStudy" | "update" | "supporter" | "supporterMilestone" | "pr";

const BLOG: readonly string[] = [
  "New on the blog: {title}. {url}",
  "Just published: {title}. Read it here — {url}",
  "Fresh post is live: {title}. {url}",
  "Wrote something new: {title}. {url}",
  "New writing up now: {title}. {url}",
  "Out today on the blog: {title}. {url}",
  "Latest post: {title}. Have a read — {url}",
  "Published a new one: {title}. {url}",
  "New article live: {title}. {url}",
  "Hot off the keyboard: {title}. {url}",
] as const;

const CASE_STUDY: readonly string[] = [
  "New case study: {title}. {url}",
  "Just shipped a case study: {title}. {url}",
  "Behind a recent project: {title}. {url}",
  "New work written up: {title}. {url}",
  "Case study live now: {title}. {url}",
  "How it actually went: {title}. {url}",
  "New breakdown up: {title}. {url}",
  "Latest case study: {title}. {url}",
  "Published a project deep-dive: {title}. {url}",
  "New results, documented: {title}. {url}",
] as const;

const UPDATE: readonly string[] = [
  "From the build log: {title} {url}",
  "Small update from behind the scenes: {title} {url}",
  "Building in public: {title} {url}",
  "Progress note: {title} {url}",
  "What I shipped recently: {title} {url}",
  "Quick update: {title} {url}",
  "Latest from the workshop: {title} {url}",
  "Build-in-public log: {title} {url}",
  "New update posted: {title} {url}",
  "Here is where things are: {title} {url}",
] as const;

const SUPPORTER: readonly string[] = [
  "Someone just supported the work. Thank you. You can too: {url}",
  "A new supporter just backed the work. Grateful. Join them: {url}",
  "Just got some support from a kind stranger. Thank you. {url}",
  "Another quiet supporter stepped up today. You can too: {url}",
  "Someone believed enough to chip in. Thank you. {url}",
  "Fresh support just landed. Deeply grateful. Back the work: {url}",
  "A generous someone just supported this. Thank you. {url}",
  "New backer on board today. Grateful. Support here: {url}",
  "Someone just kept the lights on a little longer. Thank you. {url}",
  "Just received support from one of you. It means a lot. {url}",
] as const;

const SUPPORTER_MILESTONE: readonly string[] = [
  "{n} people have now supported the work. Thank you, all of you. {url}",
  "Just crossed {n} supporters. Grateful for every one. {url}",
  "{n} supporters and counting. You keep this going. {url}",
  "Milestone: {n} people have backed the work. Thank you. {url}",
  "We just hit {n} supporters. Humbled. Join them: {url}",
  "{n} of you have supported this so far. Thank you. {url}",
  "Officially past {n} supporters. Grateful beyond words. {url}",
  "{n} supporters strong. Every one matters. {url}",
  "Just reached {n} people backing the work. Thank you. {url}",
  "{n} supporters in. This community is something else. {url}",
] as const;

// Not corporate. Solo-founder voice: self-roasting, gaslighting, ragebait,
// the occasional dig. {title} is the humanized PR subject.
const PR: readonly string[] = [
  // self-roast
  "Shipped {title}. Only took me embarrassingly long to admit it needed doing.",
  "{title} is live. Past me left this for future me. Future me is not thrilled.",
  "Fixed {title}. Was it broken this whole time? Yes. Did anyone notice but me? No.",
  // gaslighting
  "{title} is live. It's always been like this. You must be misremembering.",
  "Pushed {title}. This was never a bug. It was a feature you weren't ready for.",
  "{title}. Nothing changed. Everything changed. You'll be fine.",
  // ragebait
  "Shipped {title} solo while your favourite platform is still 'gathering requirements'.",
  "{title}. If the agency you're paying still can't do this in 2026, ask for the invoice back.",
  "Just shipped {title}. No standup, no ticket, no permission. Try that at your job.",
  // dig / flex
  "{title} — done before most SaaS finishes loading its cookie banner.",
  "Shipped {title}. The big platforms will 'innovate' this next year and want applause.",
  // dry
  "{title} is live. Clap if you must.",
] as const;

const POOLS: Record<AutoKind, readonly string[]> = {
  blog: BLOG,
  caseStudy: CASE_STUDY,
  update: UPDATE,
  supporter: SUPPORTER,
  supporterMilestone: SUPPORTER_MILESTONE,
  pr: PR,
};

/** Random template for `kind`, placeholders filled. Trimmed, never > 500 chars. */
export function pick(kind: AutoKind, vars: { title?: string; url?: string; n?: number } = {}): string {
  const pool = POOLS[kind];
  const out = pool[randomInt(0, pool.length)]
    .replaceAll("{title}", vars.title ?? "")
    .replaceAll("{url}", vars.url ?? "")
    .replaceAll("{n}", vars.n === undefined ? "" : String(vars.n))
    .trim();
  return out.slice(0, 500);
}
