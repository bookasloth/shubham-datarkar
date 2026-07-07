import Link from "next/link";
import { BookOpen, Bookmark, Compass, Wrench } from "lucide-react";
import { requireMember } from "@/lib/members/session";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

const QUICK_LINKS = [
  { href: "/members/explore", label: "Explore", desc: "Browse every resource", icon: Compass },
  { href: "/members/latest", label: "Latest", desc: "Newest additions", icon: BookOpen },
  { href: "/members/bookmarks", label: "Bookmarks", desc: "Your saved library", icon: Bookmark },
  { href: "/members/tools", label: "Tools", desc: "Interactive utilities", icon: Wrench },
];

export default async function MembersDashboard() {
  const { user } = await requireMember("/members");
  const name = user!.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your marketing workspace. Something new every week.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group rounded-card border border-border bg-card p-4 shadow-xs transition-ui hover:border-foreground/30"
          >
            <q.icon className="size-5 text-muted-foreground transition-ui group-hover:text-foreground" />
            <div className="mt-3 text-sm font-semibold">{q.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{q.desc}</div>
          </Link>
        ))}
      </section>

      {/* Populated in the resources + member-features phases. */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Featured</h2>
        <EmptyState
          title="Nothing featured yet"
          description="Featured resources will appear here as they are published."
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Continue reading</h2>
        <EmptyState
          title="No reading in progress"
          description="Open any resource and your progress will be saved automatically."
        />
      </section>
    </div>
  );
}
