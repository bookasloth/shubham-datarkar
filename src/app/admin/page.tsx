import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { countEntities } from "@/lib/content/queries";
import { getSubscribers } from "@/lib/subscribers/queries";
import { ENTITY_LIST } from "@/lib/content/registry";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const posts = await getAllPostsAdmin();
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;

  const entityCounts = await Promise.all(
    ENTITY_LIST.map(async (e) => ({ def: e, count: await countEntities(e.table) })),
  );
  const subscribers = await getSubscribers();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">Posts</h2>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <Stat label="Published" value={published} href="/admin/posts" />
        <Stat label="Drafts" value={drafts} href="/admin/posts" />
        <Stat label="Scheduled" value={scheduled} href="/admin/posts" />
      </div>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">Content</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {entityCounts.map(({ def, count }) => (
          <Stat key={def.key} label={def.label} value={count} href={`/admin/content/${def.key}`} />
        ))}
        <Stat label="Subscribers" value={subscribers.length} href="/admin/subscribers" />
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-card border border-border p-4 hover:bg-accent">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
    </Link>
  );
}
