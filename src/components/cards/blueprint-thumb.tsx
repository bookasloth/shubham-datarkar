import {
  Braces,
  Calendar,
  CreditCard,
  Database,
  FlaskConical,
  Gauge,
  Hammer,
  Layers,
  type LucideIcon,
  Mail,
  NotebookPen,
  PenLine,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Triangle,
  Users,
} from "lucide-react";

/**
 * Generated "blueprint" cover for blog cards — dark base, faint grid/dots, and
 * white icon-chips wired together like a schematic. Deterministic from the post
 * slug + tags, in the site's orange accent. No assets, deps, or uploads.
 *
 * Icons come from the post's (enriched) tags so the cover hints at the topic;
 * falls back to the category when a post has no mapped tags.
 */

const BRAND = "#ff4800";
const BASE = "#0a0a0a";
const HAIR = "rgba(255,255,255,0.14)";

// tag/category slug -> icon. Order-independent; first matches win per post.
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

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function pickIcons(tags: string[], category: string): LucideIcon[] {
  const picked: LucideIcon[] = [];
  const seen = new Set<LucideIcon>();
  for (const key of [...tags, category]) {
    const Icon = ICONS[key];
    if (Icon && !seen.has(Icon)) {
      seen.add(Icon);
      picked.push(Icon);
    }
    if (picked.length === 3) break;
  }
  if (picked.length === 0) picked.push(Hammer);
  return picked;
}

// Chip layouts by icon count, in the 600x338 (16/9) viewBox.
const LAYOUTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 260, y: 129 }],
  2: [
    { x: 205, y: 129 },
    { x: 315, y: 129 },
  ],
  3: [
    { x: 200, y: 88 },
    { x: 320, y: 88 },
    { x: 260, y: 178 },
  ],
};
const CHIP = 80;
const ICON = 46;

export function BlueprintThumb({
  seed,
  tags = [],
  category,
  alt,
}: {
  seed: string;
  tags?: string[];
  category: string;
  alt: string;
}) {
  const h = hash(seed);
  const icons = pickIcons(tags, category);
  const chips = LAYOUTS[icons.length];
  const pid = `bp-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 10)}-${h % 1000}`;
  const dots = h % 2 === 0;

  return (
    <div
      className="relative w-full overflow-hidden rounded-img border border-border"
      style={{ aspectRatio: "16/9" }}
      role="img"
      aria-label={alt}
    >
      <svg viewBox="0 0 600 338" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id={pid} width={dots ? 22 : 26} height={dots ? 22 : 26} patternUnits="userSpaceOnUse">
            {dots ? (
              <circle cx={11} cy={11} r={0.9} fill={HAIR} />
            ) : (
              <>
                <line x1={26} y1={0} x2={26} y2={26} stroke={HAIR} strokeWidth={0.4} />
                <line x1={0} y1={26} x2={26} y2={26} stroke={HAIR} strokeWidth={0.4} />
              </>
            )}
          </pattern>
        </defs>
        <rect width={600} height={338} fill={BASE} />
        <rect width={600} height={338} fill={`url(#${pid})`} />

        {/* connector lines between chip centers, drawn behind the chips */}
        {chips.map((c, i) => {
          const n = chips[(i + 1) % chips.length];
          if (chips.length < 2) return null;
          return (
            <line
              key={`l-${i}`}
              x1={c.x + CHIP / 2}
              y1={c.y + CHIP / 2}
              x2={n.x + CHIP / 2}
              y2={n.y + CHIP / 2}
              stroke={HAIR}
              strokeWidth={1.2}
            />
          );
        })}

        {chips.map((c, i) => {
          const Icon = icons[i];
          const pad = (CHIP - ICON) / 2;
          return (
            <g key={`c-${i}`}>
              <rect x={c.x} y={c.y} width={CHIP} height={CHIP} rx={13} fill="#fff" />
              <Icon
                x={c.x + pad}
                y={c.y + pad}
                width={ICON}
                height={ICON}
                color={BRAND}
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
