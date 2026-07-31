import {
  Braces,
  Bug,
  Calendar,
  Clock,
  CreditCard,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Hammer,
  KeyRound,
  Layers,
  type LucideIcon,
  Mail,
  NotebookPen,
  Palette,
  PenLine,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Triangle,
  Users,
} from "lucide-react";
import type { BlogCategory } from "@/lib/data/types";

/**
 * Generated "blueprint" cover for blog cards — dark schematic with white
 * icon-chips wired together. One system, every card distinct: a slug-seeded
 * PRNG varies the pattern, layout, connectors, chip size and stray wiring, and
 * the accent color comes from the post's category. Icons come from the post's
 * (enriched) tags. Deterministic — no assets, deps, or uploads.
 */

const BASE = "#0a0a0a";
const HAIR = "rgba(255,255,255,0.14)";
const W = 600;
const H = 338;

// Per-category accent. Cohesive mid-saturation set that reads on the white
// chips and as a glow on the dark base. SEO keeps the site's brand orange.
const CATEGORY_ACCENT: Record<BlogCategory, string> = {
  seo: "#ff4800",
  "build-in-public": "#3b82f6",
  updates: "#64748b",
  performance: "#f59e0b",
  content: "#8b5cf6",
  ai: "#06b6d4",
  saas: "#10b981",
  founder: "#ef4444",
};

const ICONS: Record<string, LucideIcon> = {
  supabase: Database,
  database: Database,
  "row-level-security": ShieldCheck,
  security: ShieldCheck,
  auth: ShieldCheck,
  seo: Search,
  performance: Gauge,
  payments: CreditCard,
  email: Mail,
  games: FlaskConical,
  community: Users,
  ai: Sparkles,
  vercel: Triangle,
  nextjs: Braces,
  typescript: Braces,
  "book-a-sloth": Calendar,
  "daily-log": NotebookPen,
  // category fallbacks
  "build-in-public": Hammer,
  updates: NotebookPen,
  content: PenLine,
  saas: Layers,
  founder: Rocket,
};

// Context match: substring in the lowercased title -> icon. Scanned after tags,
// so a post's actual subject shows up even when its tags are coarse buckets.
const KEYWORDS: [string, LucideIcon][] = [
  ["bug", Bug],
  ["error", Bug],
  ["test", FlaskConical],
  ["deploy", Rocket],
  ["ship", Rocket],
  ["launch", Rocket],
  ["email", Mail],
  ["otp", Mail],
  ["inbox", Mail],
  ["password", KeyRound],
  ["reset", KeyRound],
  ["login", KeyRound],
  ["auth", KeyRound],
  ["pric", CreditCard],
  ["discount", CreditCard],
  ["commission", CreditCard],
  ["pay", CreditCard],
  ["cache", Database],
  ["database", Database],
  ["design", Palette],
  ["css", Palette],
  ["theme", Palette],
  ["feed", Users],
  ["community", Users],
  ["comment", Users],
  ["seo", Search],
  ["search", Search],
  ["rank", TrendingUp],
  ["growth", TrendingUp],
  ["fast", Gauge],
  ["slow", Gauge],
  ["speed", Gauge],
  ["perf", Gauge],
  ["secur", ShieldCheck],
  ["permission", ShieldCheck],
  ["ai", Sparkles],
  ["claude", Sparkles],
  ["kalam", Sparkles],
  ["blog", PenLine],
  ["write", PenLine],
  ["post", PenLine],
  ["commit", GitBranch],
  ["repo", GitBranch],
  ["code", Braces],
  ["day", Clock],
  ["streak", Clock],
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic LCG seeded off the slug — same card, same draw, every render. */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickIcons(tags: string[], title: string, category: string): LucideIcon[] {
  const picked: LucideIcon[] = [];
  const seen = new Set<LucideIcon>();
  const add = (Icon?: LucideIcon) => {
    if (Icon && !seen.has(Icon) && picked.length < 3) {
      seen.add(Icon);
      picked.push(Icon);
    }
  };
  // tags first (topical), then title context, then category fallback.
  for (const key of tags) add(ICONS[key]);
  const lower = title.toLowerCase();
  for (const [kw, Icon] of KEYWORDS) if (lower.includes(kw)) add(Icon);
  add(ICONS[category]);
  if (picked.length === 0) picked.push(Hammer);
  return picked;
}

// Rough base positions per chip count; jittered per card below.
const BASES: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 300, y: 169 }],
  2: [
    { x: 232, y: 150 },
    { x: 368, y: 188 },
  ],
  3: [
    { x: 236, y: 120 },
    { x: 382, y: 150 },
    { x: 300, y: 214 },
  ],
};

export function BlueprintThumb({
  seed,
  tags = [],
  title,
  category,
  alt,
}: {
  seed: string;
  tags?: string[];
  title: string;
  category: BlogCategory;
  alt: string;
}) {
  const rng = makeRng(hash(seed));
  const accent = CATEGORY_ACCENT[category] ?? "#ff4800";
  const icons = pickIcons(tags, title, category);
  const uid = `${seed.replace(/[^a-z0-9]/gi, "").slice(0, 8)}${hash(seed) % 1000}`;

  // ---- varied knobs ----
  const pattern = Math.floor(rng() * 4); // 0 grid, 1 dots, 2 diagonal, 3 crosshatch
  const chip = Math.round(66 + rng() * 20); // 66–86
  const icon = Math.round(chip * 0.56);
  const rx = Math.round(chip * 0.17);
  const gx = Math.round(120 + rng() * 360); // glow center
  const gy = Math.round(60 + rng() * 220);

  // chip centers = base template + per-chip jitter
  const centers = BASES[icons.length].map((b) => ({
    cx: Math.max(chip, Math.min(W - chip, b.x + (rng() - 0.5) * 56)),
    cy: Math.max(chip * 0.7, Math.min(H - chip * 0.7, b.y + (rng() - 0.5) * 40)),
  }));

  // 1–2 stray schematic wires ending in a node dot
  const strays = Array.from({ length: 1 + Math.floor(rng() * 2) }, () => {
    const from = centers[Math.floor(rng() * centers.length)];
    const angle = rng() * Math.PI * 2;
    const len = 70 + rng() * 90;
    return {
      x1: from.cx,
      y1: from.cy,
      x2: Math.max(24, Math.min(W - 24, from.cx + Math.cos(angle) * len)),
      y2: Math.max(24, Math.min(H - 24, from.cy + Math.sin(angle) * len)),
    };
  });

  return (
    <div
      className="relative w-full overflow-hidden rounded-img border border-border"
      style={{ aspectRatio: "16/9" }}
      role="img"
      aria-label={alt}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id={`glow-${uid}`} cx={`${(gx / W) * 100}%`} cy={`${(gy / H) * 100}%`} r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </radialGradient>
          <pattern id={`pat-${uid}`} width={pattern === 1 ? 22 : 26} height={pattern === 1 ? 22 : 26} patternUnits="userSpaceOnUse">
            {pattern === 0 && (
              <>
                <line x1={26} y1={0} x2={26} y2={26} stroke={HAIR} strokeWidth={0.4} />
                <line x1={0} y1={26} x2={26} y2={26} stroke={HAIR} strokeWidth={0.4} />
              </>
            )}
            {pattern === 1 && <circle cx={11} cy={11} r={0.9} fill={HAIR} />}
            {pattern === 2 && <line x1={0} y1={26} x2={26} y2={0} stroke={HAIR} strokeWidth={0.5} />}
            {pattern === 3 && (
              <>
                <line x1={0} y1={13} x2={26} y2={13} stroke={HAIR} strokeWidth={0.35} />
                <line x1={13} y1={0} x2={13} y2={26} stroke={HAIR} strokeWidth={0.35} />
              </>
            )}
          </pattern>
        </defs>

        <rect width={W} height={H} fill={BASE} />
        <rect width={W} height={H} fill={`url(#glow-${uid})`} />
        <rect width={W} height={H} fill={`url(#pat-${uid})`} />

        {/* stray wires with end nodes */}
        {strays.map((s, i) => (
          <g key={`s-${i}`}>
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={HAIR} strokeWidth={1} />
            <circle cx={s.x2} cy={s.y2} r={3} fill="none" stroke={HAIR} strokeWidth={1} />
          </g>
        ))}

        {/* connectors chaining the chips */}
        {centers.map((c, i) =>
          centers.length > 1 ? (
            <line
              key={`c-${i}`}
              x1={c.cx}
              y1={c.cy}
              x2={centers[(i + 1) % centers.length].cx}
              y2={centers[(i + 1) % centers.length].cy}
              stroke={HAIR}
              strokeWidth={1.2}
            />
          ) : null,
        )}

        {/* icon chips */}
        {centers.map((c, i) => {
          const Icon = icons[i];
          return (
            <g key={`chip-${i}`}>
              <rect x={c.cx - chip / 2} y={c.cy - chip / 2} width={chip} height={chip} rx={rx} fill="#fff" />
              <Icon
                x={c.cx - icon / 2}
                y={c.cy - icon / 2}
                width={icon}
                height={icon}
                color={accent}
                strokeWidth={1.8}
                absoluteStrokeWidth
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
