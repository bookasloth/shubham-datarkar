import "server-only";

import Link from "next/link";
import { BookOpen, Gamepad2 } from "lucide-react";
import { getPublishedPosts } from "@/lib/blog/queries";
import { pickRandom } from "@/lib/random";
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

async function BlogCard() {
  const posts = await getPublishedPosts();
  const picks = pickRandom(posts.slice(0, 10), 2);

  return (
    <Card icon={<BookOpen className="size-4" />} title="From the blog">
      <ul className="divide-y divide-border">
        {picks.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.category}/${p.slug}`}
              className="block py-2 text-sm transition-ui hover:text-brand"
            >
              <span className="line-clamp-2 font-medium">{p.title}</span>
              <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                {p.category}
              </span>
            </Link>
          </li>
        ))}
        {/* Hostinger sponsored headline, styled as a search-ad row inside the list */}
        <li>
          <a
            href={HOSTINGER_HREF}
            target="_blank"
            rel="noopener sponsored"
            className="block py-2 text-sm transition-ui hover:opacity-90"
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-btn px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                style={{ background: HOSTINGER_PURPLE }}
              >
                Ad
              </span>
              <span
                className="line-clamp-1 font-medium"
                style={{ color: HOSTINGER_PURPLE }}
              >
                Fast, reliable hosting from Hostinger
              </span>
            </div>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Ship your next site on infrastructure that just works.
            </span>
          </a>
        </li>
      </ul>
    </Card>
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
      <BlogCard />
      <GamesCard />
      <AdSlotView ad={{ slot: 2, imagePath: null, linkUrl: null }} />
    </div>
  );
}
