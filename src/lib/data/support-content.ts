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

/** Company-assets base for project logos. */
const PROJECT_LOGO_BASE = "https://company-assets.bookasloth.in/images/sd/website/projects";

export type SupportProject = {
  key: string;
  name: string;
  /** Square logo, sourced from company-assets. */
  logo: string;
  /** One-line "what it is". PLACEHOLDER copy — replace with real blurbs. */
  blurb: string;
  /** External link. PLACEHOLDER "#" — replace with real URLs. */
  href: string;
};

export const supportProjects: SupportProject[] = [
  { key: "nnawca", name: "NNAWCA", logo: `${PROJECT_LOGO_BASE}/nnawca.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "coffee-and-toffee", name: "Coffee and Toffee", logo: `${PROJECT_LOGO_BASE}/coffee-and-toffee.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "the-parliament", name: "The Parliament", logo: `${PROJECT_LOGO_BASE}/the-parliament.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "marketing-bug", name: "Marketing Bug", logo: `${PROJECT_LOGO_BASE}/marketing-bug.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "book-a-sloth", name: "Book A Sloth", logo: `${PROJECT_LOGO_BASE}/book-a-sloth.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "rajmudra-media", name: "Rajmudra Media", logo: `${PROJECT_LOGO_BASE}/rajmudra-media.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "corporate-puppets", name: "Corporate Puppets", logo: `${PROJECT_LOGO_BASE}/corporate-puppets.webp`, blurb: "Project overview coming soon.", href: "#" },
  { key: "shubham-datarkar", name: "Shubham Datarkar", logo: `${PROJECT_LOGO_BASE}/shubham-datarkar.webp`, blurb: "Project overview coming soon.", href: "#" },
];


