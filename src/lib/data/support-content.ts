/**
 * Static content for the Support module — profile + projects.
 *
 * Supporters, tiers, and stats are now LIVE from Supabase
 * (see `src/lib/support/queries.ts`), no longer mocked here.
 * Updates feed is now LIVE from Supabase via `src/lib/support/updates.ts`.
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
  key: string;
  name: string;
  /** Square logo `{PROJECT_LOGO_BASE}/{key}.png`. */
  logo: string;
  /** One-line "what it is". PLACEHOLDER copy — replace with real blurbs. */
  blurb: string;
  /** Internal link to the project's page (coming-soon shell until built). */
  href: string;
};

// key = image filename = url slug (single source; logo + href derived below).
// marketing-bug + shubham-datarkar have no PNG yet — logo 404s until uploaded.
const PROJECT_LIST: { key: string; name: string }[] = [
  { key: "nnawca", name: "NNAWCA" },
  { key: "coffee-and-toffee", name: "Coffee and Toffee" },
  { key: "parliament", name: "The Parliament" },
  { key: "marketing-bug", name: "Marketing Bug" },
  { key: "book-a-sloth", name: "Book A Sloth" },
  { key: "rajmudra", name: "Rajmudra Media" },
  { key: "corporate-puppets", name: "Corporate Puppets" },
  { key: "shubham-datarkar", name: "Shubham Datarkar" },
];

export const supportProjects: SupportProject[] = PROJECT_LIST.map((p) => ({
  ...p,
  logo: `${PROJECT_LOGO_BASE}/${p.key}.png`,
  blurb: "Project overview coming soon.",
  href: `/projects/${p.key}`,
}));

export const getSupportProject = (key: string) => supportProjects.find((p) => p.key === key);


