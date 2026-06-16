/**
 * Static content for the Support module — profile + the mock-authored Updates
 * feed (no DB table for updates in v1).
 *
 * Supporters, tiers, and stats are now LIVE from Supabase
 * (see `src/lib/support/queries.ts`), no longer mocked here.
 */

import { site, socials } from "@/lib/site";

export const supportProfile = {
  name: site.name,
  role: site.role,
  bio: "Founder, marketer, and copywriter from Nagpur. I build brands, ads, and software — and write about all of it. Your coffees and toffees keep the free tools, writing, and experiments coming.",
  location: site.location,
  isVerified: true,
  socials,
  /** Fallback only; the live count comes from `getSupportStats()`. */
  supporterCount: 0,
  achievements: ["3 companies building", "200+ pieces shipped", "Builders List weekly"],
};

export type UpdatePost =
  | { id: string; date: string; variant: "text"; title: string; body: string }
  | { id: string; date: string; variant: "image"; title: string; body: string; imageAlt: string }
  | {
      id: string;
      date: string;
      variant: "checklist";
      title: string;
      body: string;
      items: { label: string; done: boolean }[];
    };

export const supportUpdates: UpdatePost[] = [
  {
    id: "u4",
    date: "2026-06-12",
    variant: "checklist",
    title: "What I'm shipping this month",
    body: "Three things on the bench. Supporters help decide what jumps the queue — reply on the Builders List to vote.",
    items: [
      { label: "Free headline-tester tool (v1)", done: true },
      { label: "Case study: the Khiladi Adda growth loop", done: false },
      { label: "Open-source the monochrome component kit", done: false },
    ],
  },
  {
    id: "u3",
    date: "2026-06-05",
    variant: "image",
    title: "Behind the new homepage",
    body: "Spent the week tearing down and rebuilding the hero. Centered logo, calmer type, dark-by-default. Here's the before/after wall from my desk.",
    imageAlt: "Wireframe sketches of the homepage hero pinned to a wall.",
  },
  {
    id: "u2",
    date: "2026-05-28",
    variant: "text",
    title: "Why I started taking coffees and toffees",
    body: "Not for the money — for the signal. Every coffee tells me a piece of writing or a free tool actually landed. That feedback is worth more than the rupees. Thank you for being here.",
  },
  {
    id: "u1",
    date: "2026-05-20",
    variant: "text",
    title: "Builders List crossed 1,000",
    body: "One signal every Tuesday, and a thousand of you now read it. Onwards. If you have a topic you want torn apart, hit reply — I read every one.",
  },
];
