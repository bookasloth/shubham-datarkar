import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Building2,
  Cake,
  CalendarDays,
  Check,
  Coffee,
  Compass,
  Dumbbell,
  Globe,
  GraduationCap,
  Hammer,
  Lightbulb,
  Link as LinkIcon,
  MapPin,
  Monitor,
  Music,
  Package,
  Plane,
  Rocket,
  Target,
  Tv,
  Zap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  profile,
  headlineStats,
  currently,
  currentlyNote,
  lifeStats,
  building,
  business,
  timeSplit,
  yearProgress,
  shipped,
  experiments,
  journey,
  focus,
} from "@/lib/dashboard/content";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: "A public founder HQ — life, business, projects, goals and experiments at a glance.",
  path: "/dashboard",
});

const icons: Record<string, LucideIcon> = {
  building: Building2, package: Package, monitor: Monitor, rocket: Rocket, calendar: CalendarDays,
  hammer: Hammer, book: BookOpen, graduation: GraduationCap, music: Music, tv: Tv, brain: Brain,
  compass: Compass, cake: Cake, pin: MapPin, zap: Zap, dumbbell: Dumbbell, coffee: Coffee,
  globe: Globe, plane: Plane, lightbulb: Lightbulb, link: LinkIcon,
};
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const C = icons[name];
  return C ? <C className={className} /> : null;
};

// Brand icons — lucide dropped these glyphs, so inline the official marks.
const brandIcons: Record<string, string> = {
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  youtube: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z",
};
const BrandIcon = ({ name, className }: { name: string; className?: string }) => {
  const d = brandIcons[name];
  if (d) return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d={d} /></svg>;
  const C = icons[name];
  return C ? <C className={className} /> : null;
};

function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-xl font-extrabold tracking-tight">{children}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand">
          View all <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

const expDot: Record<string, string> = {
  Running: "var(--success)",
  Testing: "var(--warning)",
  Killed: "var(--danger)",
};

export default function DashboardPage() {
  return (
    <>
      <PageHero
        eyebrow="Founder HQ"
        title="Shubham's command center"
        description="Life, business, projects, goals and experiments — all in one public view. Build in the open."
        crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
      />
      <Section>
        <Container className="space-y-6">
          {/* ===== Profile + headline stats ===== */}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="relative overflow-hidden p-6 md:p-8">
              <div className="flex items-start gap-5">
                <div
                  className="flex size-20 shrink-0 items-center justify-center rounded-card font-display text-2xl font-extrabold text-brand-foreground"
                  style={{ background: "var(--brand)" }}
                  aria-hidden
                >
                  SD
                </div>
                <div>
                  <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                    {profile.name}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {profile.roles.join(" · ")}
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-md text-[15px] text-muted-foreground">{profile.bio}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {profile.location}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex size-9 items-center justify-center rounded-btn border border-border text-muted-foreground transition-ui hover:border-brand hover:text-brand"
                  >
                    <BrandIcon name={s.icon} className="size-4" />
                  </a>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
              {headlineStats.map((s) => (
                <Card key={s.label} className="flex flex-col justify-between p-4">
                  <Icon name={s.icon} className="size-5 text-muted-foreground" />
                  <div className="mt-3">
                    <div className="font-display text-2xl font-extrabold tracking-tight">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* ===== Currently + Life at a glance ===== */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative p-6">
              <SectionTitle>Currently</SectionTitle>
              <dl className="space-y-3">
                {currently.map((c) => (
                  <div key={c.label} className="flex items-center gap-3 text-sm">
                    <Icon name={c.icon} className="size-4 shrink-0 text-muted-foreground" />
                    <dt className="w-28 shrink-0 text-muted-foreground">{c.label}</dt>
                    <dd className="font-medium">{c.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 inline-block max-w-[16rem] -rotate-1 rounded-card border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                “{currentlyNote}”
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle>Life at a glance</SectionTitle>
              <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                {lifeStats.map((s) => (
                  <div key={s.label}>
                    <Icon name={s.icon} className="mb-1.5 size-4 text-muted-foreground" />
                    <div className="font-display text-lg font-extrabold leading-none tracking-tight">{s.value}</div>
                    <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ===== What I'm building ===== */}
          <div>
            <SectionTitle href="/projects">What I’m building</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {building.map((b) => {
                const max = Math.max(...b.spark);
                return (
                  <Card key={b.name} interactive className="flex flex-col p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold tracking-tight">{b.name}</h3>
                      <Badge variant={b.status === "LIVE" ? "success" : b.status === "BUILDING" ? "warning" : "muted"}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{b.blurb}</p>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div className="flex gap-4">
                        {b.stats.map((st) => (
                          <div key={st.label}>
                            <div className="font-display text-xl font-extrabold tracking-tight">{st.value}</div>
                            <div className="text-xs text-muted-foreground">{st.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex h-10 items-end gap-0.5" aria-hidden>
                        {b.spark.map((v, i) => (
                          <div
                            key={i}
                            className="w-1.5 rounded-sm"
                            style={{ height: `${(v / max) * 100}%`, background: "var(--brand)", opacity: 0.4 + (i / b.spark.length) * 0.6 }}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ===== Business snapshot ===== */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Business snapshot</h2>
              <Badge variant="muted">This year</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {business.stats.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-2xl font-extrabold tracking-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-end justify-between">
              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {business.growthLabel}
              </span>
              <span className="text-right">
                <span className="inline-flex items-center gap-1 font-display text-lg font-extrabold text-success">
                  <ArrowUpRight className="size-4" /> {business.growthDelta}
                </span>
                <span className="block text-xs text-muted-foreground">{business.growthRange}</span>
              </span>
            </div>
            <LineChart data={[...business.growth]} />
          </Card>

          {/* ===== Time + Progress + Shipped ===== */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Where my time goes */}
            <Card className="p-6">
              <SectionTitle>Where my time goes</SectionTitle>
              <div className="flex items-center gap-5">
                <Donut data={[...timeSplit]} />
                <ul className="flex-1 space-y-2 text-sm">
                  {timeSplit.map((t) => (
                    <li key={t.label} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                        {t.label}
                      </span>
                      <span className="font-semibold text-muted-foreground">{t.value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Year progress */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold tracking-tight">{yearProgress.year} progress</h2>
                <span className="font-display text-lg font-extrabold">{yearProgress.percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${yearProgress.percent}%`, background: "var(--success)" }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                {yearProgress.groups.map((g) => (
                  <div key={g.title}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</div>
                    <ul className="space-y-1.5">
                      {g.items.map((it) => (
                        <li key={it.text} className="flex items-start gap-2 text-[13px]">
                          <span
                            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border"
                            style={it.done ? { background: "var(--success)", borderColor: "var(--success)" } : { borderColor: "var(--border)" }}
                          >
                            {it.done && <Check className="size-3 text-success-foreground" />}
                          </span>
                          <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            {/* Things shipped */}
            <Card className="p-6">
              <SectionTitle href="/changelog">Things shipped</SectionTitle>
              <div className="font-display text-4xl font-extrabold tracking-tight">{shipped.total}</div>
              <div className="text-xs text-muted-foreground">Total things shipped</div>
              <ul className="mt-5 space-y-3">
                {shipped.breakdown.map((s) => (
                  <li key={s.label} className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full" style={{ width: `${s.bar}%`, background: s.color }} />
                      </span>
                      <span className="w-10 text-right font-semibold">{s.value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* ===== Experiments + Journey + Focus ===== */}
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6">
              <SectionTitle href="/projects">Recent experiments</SectionTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((e) => (
                    <TableRow key={e.name}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="size-2 rounded-full" style={{ background: expDot[e.status] ?? "var(--muted-foreground)" }} />
                          {e.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.started}</TableCell>
                      <TableCell>{e.result}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="flex flex-col p-6">
              <div className="mb-4 inline-flex items-center gap-2">
                <Target className="size-5 text-brand" />
                <h2 className="font-display text-xl font-extrabold tracking-tight">Current focus</h2>
                <span className="text-xs text-muted-foreground">(Next 90 days)</span>
              </div>
              <ol className="space-y-3">
                {focus.map((f, i) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xs font-bold">
                      {i + 1}
                    </span>
                    {f}
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* ===== Journey timeline ===== */}
          <Card className="p-6">
            <SectionTitle>My journey</SectionTitle>
            <ol className="relative grid gap-6 pt-2 sm:grid-cols-5">
              <span className="absolute left-0 right-0 top-[0.9rem] hidden h-px bg-border sm:block" aria-hidden />
              {journey.map((j) => (
                <li key={j.year} className="relative">
                  <span className="mb-3 block size-3 rounded-full ring-4 ring-card" style={{ background: j.color }} />
                  <div className="font-display text-sm font-extrabold" style={{ color: j.color }}>{j.year}</div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{j.text}</p>
                </li>
              ))}
            </ol>
          </Card>
        </Container>
      </Section>
    </>
  );
}

/* ---------- inline SVG charts (no deps) ---------- */

function LineChart({ data }: { data: number[] }) {
  const w = 720, h = 160, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-40 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#dash-area)" />
      <polyline points={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const size = 120, stroke = 20, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-28 shrink-0 -rotate-90" aria-hidden>
      {data.map((d) => {
        const len = (d.value / total) * c;
        const el = (
          <circle
            key={d.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
