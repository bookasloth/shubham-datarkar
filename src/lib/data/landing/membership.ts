/**
 * Copy for /membership. Single source of truth so the hero, benefit grid,
 * pricing, and FAQ never drift. `benefits[].icon` is a string key mapped to a
 * lucide glyph in the page — kept as data (no JSX) so this stays a plain module.
 *
 * `status: "soon"` tiles render a "Coming soon" tag instead of overpromising.
 * Edit prices/perks here; the page recomputes the annual saving from them.
 */

export type MembershipIcon =
  | "community"
  | "tools"
  | "games"
  | "goodies"
  | "os"
  | "content";

export type MembershipContent = {
  path: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  subhead: string;
  benefits: {
    icon: MembershipIcon;
    title: string;
    blurb: string;
    status?: "live" | "soon";
    wide?: boolean; // spans two columns in the bento grid
  }[];
  plans: {
    name: string;
    price: number; // rupees
    cadence: "month" | "year";
    features: string[];
    highlight?: boolean;
    badge?: string;
  }[];
  steps: { step: string; detail: string }[];
  faqs: { question: string; answer: string }[];
  updatedAt: string;
};

export const membership: MembershipContent = {
  path: "/membership",
  h1: "Join the Community",
  metaTitle: "Membership",
  metaDescription:
    "Membership gets you the tools, games, exclusive drops, and the room where I build in public — ₹99/month or ₹999/year. Here's everything inside.",
  subhead:
    "One membership, everything I build. Get inside the community, use the tools I ship, play the games, grab member-only drops — from ₹99 a month, or ₹999 for the whole year.",
  benefits: [
    {
      icon: "community",
      title: "The community",
      blurb:
        "The room where I build in public. Ask questions, watch the work happen, and swap what's working with other builders and marketers who ship.",
      status: "live",
      wide: true,
    },
    {
      icon: "tools",
      title: "Access to the tools",
      blurb:
        "Member access to the tools I build — the SEO/AEO research and writing tools that normally sit behind a paywall.",
      status: "live",
    },
    {
      icon: "games",
      title: "The games",
      blurb:
        "Alfazy, Hit & Blow, and more — with member leaderboards and podiums. The fun break between the work.",
      status: "live",
    },
    {
      icon: "goodies",
      title: "Exclusive goodies",
      blurb:
        "Member-only drops — templates, checklists, and swipe files I don't hand out anywhere else.",
      status: "soon",
    },
    {
      icon: "os",
      title: "The Marketing OS",
      blurb:
        "Your command center — everything a member gets, organized in one place you actually log into.",
      status: "live",
    },
    {
      icon: "content",
      title: "The full archive",
      blurb:
        "Every build-in-public breakdown, playbook, and case study in one place — the receipts, not the highlight reel.",
      status: "live",
    },
  ],
  plans: [
    {
      name: "Monthly",
      price: 99,
      cadence: "month",
      features: [
        "Everything in the membership",
        "Cancel anytime",
        "Billed month to month",
      ],
    },
    {
      name: "Annual",
      price: 999,
      cadence: "year",
      highlight: true,
      badge: "Best value",
      features: [
        "Everything in the membership",
        "Two months cheaper than monthly",
        "One payment for the whole year",
      ],
    },
  ],
  steps: [
    {
      step: "Create your account",
      detail: "Takes a few seconds — email and a password, or a one-tap sign-in link.",
    },
    {
      step: "Pick monthly or annual",
      detail: "₹99 a month, or ₹999 once for the whole year. Switch or cancel whenever.",
    },
    {
      step: "You're in",
      detail: "Tools, games, drops, and the community unlock the moment you join.",
    },
  ],
  faqs: [
    {
      question: "What do I actually get for ₹999?",
      answer:
        "Everything above: the community, member access to the tools I build, the games and leaderboards, exclusive member-only drops, and the full archive of build-in-public breakdowns and case studies. ₹999 covers the whole year; ₹99 covers a single month.",
    },
    {
      question: "Is it ₹999 a year or ₹99 a month?",
      answer:
        "Your choice. ₹99/month is billed month to month and you can cancel anytime. ₹999/year is a single payment for twelve months — cheaper than paying monthly across the year.",
    },
    {
      question: "Can I cancel?",
      answer:
        "Yes. The monthly plan cancels anytime and stops at the end of the current month. The annual plan runs for the year you paid for.",
    },
    {
      question: "Do I need an account first?",
      answer:
        "Yes — creating your free account is the first step. It takes a few seconds, and it's where your membership, tools, and community access all live.",
    },
    {
      question: "What's still coming?",
      answer:
        "Anything tagged \"Coming soon\" above is in progress — you get it the moment it ships, at no extra cost, for as long as you're a member.",
    },
  ],
  updatedAt: "2026-07-12",
};
