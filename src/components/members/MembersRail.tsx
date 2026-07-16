import "server-only";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { AdSlotView } from "@/components/community/ad-slot";

const HOSTINGER_PURPLE = "#673DE6";
const HOSTINGER_HREF = "https://www.hostinger.com/in/pricing?REFERRALCODE=SND1995";

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </header>
      {children}
    </section>
  );
}

// Hostinger referral — kept after the "From the blog" card was removed.
function SponsoredCard() {
  return (
    <section className="rounded-card border border-border bg-card p-4 shadow-sm">
      <a
        href={HOSTINGER_HREF}
        target="_blank"
        rel="noopener sponsored"
        className="block text-sm transition-ui hover:opacity-90"
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-btn px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{ background: HOSTINGER_PURPLE }}
          >
            Ad
          </span>
          <span className="line-clamp-1 font-medium" style={{ color: HOSTINGER_PURPLE }}>
            Fast, reliable hosting from Hostinger
          </span>
        </div>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Ship your next site on infrastructure that just works.
        </span>
      </a>
    </section>
  );
}

function GamesCard() {
  return (
    <Card icon={<Gamepad2 className="size-4" />} title="Today's puzzles">
      <ul className="space-y-2">
        {GAMES.map((g) => (
          <li key={g.key}>
            <Link
              href={`/games/${g.slug}`}
              className="group flex items-center justify-between rounded-input px-2 py-1.5 text-sm transition-ui hover:bg-accent"
            >
              <span className="font-medium">{g.name}</span>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">
                {g.tag}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function MembersRail() {
  return (
    <div className="space-y-4">
      <SponsoredCard />
      <GamesCard />
      <AdSlotView ad={{ slot: 2, imagePath: null, linkUrl: null }} />
    </div>
  );
}
