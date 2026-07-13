import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and de-dupe conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as e.g. "Jun 13, 2026". Stable across server/client. */
export function formatDate(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Rough reading time in minutes from a word count (~220 wpm). */
export function readingTime(words: number) {
  return Math.max(1, Math.round(words / 220));
}

/** Compact number formatting: 1200 -> "1.2K", 1500000 -> "1.5M". */
export function compactNumber(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Slugify a string for URLs. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Deterministic HSL background for an initials avatar, derived from a seed. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 42%)`; // mid-saturation so white initials stay legible
}

// Member avatars: one of 12 fixed CDN icons + a milk/off-white backdrop, both
// assigned deterministically from a stable seed (the username). Same seed →
// same icon + bg forever, so the assignment is random-looking but unchangeable
// with no DB column, migration, or backfill.
const AVATAR_ICONS = [
  "sd-amber", "sd-blue", "sd-coral", "sd-indigo", "sd-lime", "sd-magenta",
  "sd-orange", "sd-purple", "sd-sky", "sd-taupe", "sd-teal", "sd-violet",
] as const;
const AVATAR_BGS = ["#faf8f5", "#f7f4ee", "#faf9f6", "#f6f3ec", "#fbf8f2"] as const;
const AVATAR_BASE =
  "https://website-assets.shubhamdatarkar.com/images/sd/website/icons/avatar-icons";

/** Stable hash → bucket in [0, mod). `salt` decorrelates the icon and bg picks. */
function avatarBucket(seed: string, mod: number, salt = 0): number {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** CDN URL of the avatar icon assigned to `seed`. */
export function avatarUrl(seed: string): string {
  return `${AVATAR_BASE}/${AVATAR_ICONS[avatarBucket(seed, AVATAR_ICONS.length)]}.png`;
}

/** Off-white / milk-white backdrop assigned to `seed` (independent of the icon). */
export function avatarBg(seed: string): string {
  return AVATAR_BGS[avatarBucket(seed, AVATAR_BGS.length, 7)];
}

/** Short relative time: "now", "5m", "3h", "2d", "4w", else a formatted date. */
export function timeAgo(input: string | Date): string {
  const then = new Date(input).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return formatDate(input);
}
