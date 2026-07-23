/**
 * Static content for the Support module — profile + projects.
 *
 * Supporters, tiers, and stats are now LIVE from Supabase
 * (see `src/lib/support/queries.ts`), no longer mocked here.
 * Updates feed is now LIVE from Supabase via `src/lib/support/updates.ts`.
 *
 * The `projects` list is the single source for BOTH the /support showcase grid
 * (uses key/name/logo/tagline/href) AND the public /projects index + detail
 * pages (which use the full record — overview, what-I-did, live URL). Keep it
 * honest: `status: "building"` projects carry no live `url` and are labelled as
 * concepts, not shipped products.
 */

import { site, socials } from "@/lib/site";

export const supportProfile = {
  name: site.name,
  role: site.role,
  /** Shubham's portrait — used by the profile sidebar and the auto thank-you feed post. */
  photo: "https://company-assets.bookasloth.in/images/sd/website/profile.webp",
  bio: "Founder, marketer, and copywriter from Nagpur. I build brands, ads, and software — and write about all of it. Your coffees and toffees keep the free tools, writing, and experiments coming.",
  location: site.location,
  isVerified: true,
  socials,
  /** Fallback only; the live count comes from `getSupportStats()`. */
  supporterCount: 0,
  achievements: ["3 companies building", "200+ pieces shipped", "Builders List weekly"],
};

/** Website-assets base for project logos. Files: `{key}.png`. */
const PROJECT_LOGO_BASE = "https://website-assets.shubhamdatarkar.com/images/sd/website/project";

export type SupportProject = {
  /** key = image filename = url slug (single source; logo + href derived below). */
  key: string;
  name: string;
  /** Square logo `{PROJECT_LOGO_BASE}/{key}.png`. */
  logo: string;
  /** One-line "what it is" — shown on cards, the support grid modal, and the hero. */
  tagline: string;
  /** Kept for the support grid, which reads `blurb`; mirrors `tagline`. */
  blurb: string;
  /** Short type label, e.g. "Booking SaaS". */
  category: string;
  /** Shubham's relationship to the project. */
  role: string;
  /** "live" projects link out to `url`; "building" ones are honest concepts. */
  status: "live" | "building";
  /** Live product/site URL — only on `status: "live"` projects. */
  url?: string;
  /** 1–3 paragraph overview for the detail page. */
  overview: string[];
  /** "What I did / what it does" bullets. */
  did: string[];
  /** Internal link to the project's page. */
  href: string;
};

type ProjectSeed = Omit<SupportProject, "logo" | "blurb" | "href">;

// marketing-bug + shubham-datarkar have no PNG yet — logo 404s until uploaded.
const PROJECT_SEEDS: ProjectSeed[] = [
  {
    key: "nnawca",
    name: "NNAWCA Alumni Portal",
    tagline: "A private social OS for the JNV Nagpur alumni ecosystem.",
    category: "Alumni Network · SaaS",
    role: "Product & Build",
    status: "live",
    url: "https://nnawca.org",
    overview: [
      "The NNAWCA Alumni Portal is the digital headquarters for the JNV Nagpur alumni ecosystem — not another association website or directory, but a private social operating system that connects alumni across batches, houses, professions, and locations while supporting networking, engagement, and sustainable revenue.",
      "Every alumnus gets a digital identity — batch, house, profession, company, location, achievements, badges, and eventually karma. From there they can discover other alumni through a searchable directory, follow a community feed, attend events, promote alumni-owned businesses, join groups, and message privately. The simplest way to picture it: LinkedIn for connections, Facebook Groups for community, and Meetup for events — built entirely around the shared identity of JNV Nagpur.",
      "It ships in phases — profiles and auth, directory, feed, and memberships first; then events and a business directory; then groups and DMs — so identity leads to discovery, conversation, sustainability, and deeper relationships. It's designed to be financially self-sustaining through memberships, events, business promotions, and sponsorships.",
    ],
    did: [
      "Profiles & authentication, searchable alumni directory, and a community feed",
      "Memberships & payments, built to make the network self-sustaining",
      "Phased roadmap: events, business directory, groups, and direct messaging",
      "A CMS-driven public homepage admins can edit without a developer",
    ],
  },
  {
    key: "coffee-and-toffee",
    name: "Coffee and Toffee",
    tagline: "A playful, India-first way to support creators, causes, and communities.",
    category: "Creator Support Platform",
    role: "Founder & Builder",
    status: "building",
    overview: [
      "Coffee and Toffee is a simple way for people to financially support creators, individuals, causes, and communities through small contributions, memberships, and donations — the territory of Patreon and Buy Me a Coffee, but with a more Indian, playful, accessible identity.",
      "A creator gets a personal page where their audience can leave a one-time tip, become a recurring supporter, back a specific goal or cause, and unlock exclusive content — paid through India-friendly methods. It leans into the cultural idea of chai-paani: here, have your chai-paani on me.",
    ],
    did: [
      "Personal support pages with one-time tips and recurring memberships",
      "Goal- and cause-based support, with optional exclusive benefits",
      "India-friendly payment methods, built for accessibility",
    ],
  },
  {
    key: "parliament",
    name: "The Parliament",
    tagline: "A Community Operating System — where communities govern, not just chat.",
    category: "Community OS · SaaS",
    role: "Founder & Builder · Timewheel Internet",
    status: "building",
    overview: [
      "The Parliament is a Community Operating System — not another Discord, WhatsApp group, or social network, but the actual infrastructure a community uses to organize, govern, engage, and operate. The metaphor is literal: community members are Members of Parliament.",
      "It's built to handle memberships and recurring payments, access control, discussions, committees, voting and polls, governance, roles, and representation — a multi-tenant SaaS where any organized community (alumni networks, professional associations, clubs, startup communities) gets its own Parliament. The distinction that matters: WhatsApp is where a community talks; The Parliament is where it operates.",
    ],
    did: [
      "Memberships, subscriptions, and recurring payments",
      "Committees, voting, polls, and governance workflows",
      "Roles, permissions, and member access control",
      "Multi-tenant architecture — one Parliament per organization",
    ],
  },
  {
    key: "marketing-bug",
    name: "Marketing Bug",
    tagline: "Operator-level marketing knowledge — free and paid.",
    category: "Marketing Publication · SaaS",
    role: "Founder & Builder",
    status: "building",
    overview: [
      "Marketing Bug is where marketers, founders, and creators read practical marketing insights, strategies, experiments, breakdowns, and case studies — something between a marketing publication and a Medium-style platform, with monetization built directly into the product (₹99/month or ₹999/year).",
      "The content is deliberately operator-level — advertising breakdowns, SEO insights, growth experiments, campaign analyses, and real learnings people can actually apply — not generic \"10 social media tips.\" The funnel is simple: discover a free article, follow, hit a premium insight, become a paid member. Unlike a support platform, Marketing Bug sells the knowledge itself.",
    ],
    did: [
      "Freemium content model with practical, applicable marketing knowledge",
      "Paid membership at ₹99/month or ₹999/year",
      "Discover → subscribe → premium → member conversion funnel",
    ],
  },
  {
    key: "book-a-sloth",
    name: "Book A Sloth",
    tagline: "India's calmest booking platform — scheduling, payments, and reminders in one place.",
    category: "Booking SaaS",
    role: "CMO & Builder",
    status: "live",
    url: "https://bookasloth.com",
    overview: [
      "Book A Sloth is a booking and scheduling platform that helps small businesses manage appointments — a tool and plugin that replaces \"appointment milega kya?\" with a simple \"Booked.\" It handles scheduling, payments, reminders, and the day-to-day of running a booked calendar.",
      "I'm CMO and a builder on it — shaping the product and owning how it goes to market.",
    ],
    did: [
      "Booking tool and embeddable plugin for small businesses",
      "Appointments, payments, and automated reminders",
      "Go-to-market and positioning as CMO",
    ],
  },
  {
    key: "rajmudra",
    name: "Rajmudra Media",
    tagline: "A small, hands-on marketing agency.",
    category: "Marketing Agency",
    role: "Founder",
    status: "live",
    url: "https://rajmudramedia.com",
    overview: [
      "Rajmudra Media is my small marketing agency — hands-on work for clients across web, content, and campaigns. The agency site itself is built to showcase the work and bring in the right clients.",
    ],
    did: [
      "Client marketing across web, content, and campaigns",
      "An agency site built to display work and capture leads",
    ],
  },
  {
    key: "corporate-puppets",
    name: "Corporate Puppets",
    tagline: "The internet's unofficial break room for corporate employees.",
    category: "Media & Community",
    role: "Founder & Builder",
    status: "building",
    overview: [
      "Corporate Puppets is a media and community platform for corporate employees, built around the unfiltered reality of working a 9-to-5 — a place to talk about work the way it's actually experienced, not the way it's described on LinkedIn.",
      "It combines media, an anonymous community, and workplace intelligence: workplace stories and confessions, office politics, managers and HR, layoffs and notice periods, burnout, interviews, and the memes in between — with a satirical, rebellious personality. The name captures the feeling of being controlled by deadlines, managers, and KPIs while smiling through another \"quick sync.\" LinkedIn shows corporate life from the outside; Corporate Puppets shows what happens after the meeting ends.",
    ],
    did: [
      "Media + anonymous community + workplace intelligence in one platform",
      "Anonymous stories, discussions, and company/culture insight",
      "A satirical, India-first brand voice for corporate employees",
    ],
  },
  {
    key: "shubham-datarkar",
    name: "Shubham Datarkar",
    tagline: "This site — my founder HQ: work, writing, free tools, and experiments.",
    category: "Personal Site · Founder HQ",
    role: "Founder & Builder",
    status: "live",
    url: "https://shubhamdatarkar.com",
    overview: [
      "This is the site you're on — my founder HQ. It pulls everything into one place: the work I've shipped, case studies, essays and playbooks, free marketing tools, games, a build-in-public community, and the experiments I run in the open.",
      "It's built end to end on Next.js and engineered for search and AI answer engines — the front door for anyone who wants to see the work, read the writing, or work together.",
    ],
    did: [
      "The full site, built end to end on Next.js",
      "SEO / AEO / GEO engineering across every page",
      "Free tools, a build-in-public community, and daily games",
    ],
  },
];

export const supportProjects: SupportProject[] = PROJECT_SEEDS.map((p) => ({
  ...p,
  logo: `${PROJECT_LOGO_BASE}/${p.key}.png`,
  blurb: p.tagline,
  href: `/projects/${p.key}`,
}));

export const getSupportProject = (key: string) => supportProjects.find((p) => p.key === key);
