import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { getSubscribers } from "@/lib/subscribers/queries";
import { countEntities } from "@/lib/content/queries";
import { getPaymentStats, getRecentSupports } from "@/lib/payments/queries";
import { getContacts } from "@/lib/contact/queries";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { ENTITY_LIST } from "@/lib/content/registry";
import { formatDate } from "@/lib/utils";
import { AdminButton, StatusBadge } from "@/components/admin";
import { KPIWidget, RecentCard, postStatusCounts } from "@/components/admin/widgets";

export const dynamic = "force-dynamic";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Count of member requests still awaiting an admin decision. */
async function getOpenRequestCount(): Promise<number> {
  try {
    const sb = await supabaseAuthServer();
    const { count } = await sb
      .from("member_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** A pending-work nudge — links to the queue that needs attention. */
function ActionPill({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-card border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text transition-[border-color] duration-150 hover:border-admin-border-hover"
    >
      <span className="flex min-w-6 items-center justify-center rounded-full bg-admin-accent px-1.5 text-xs font-semibold text-admin-accent-fg">
        {count}
      </span>
      <span>{label}</span>
    </Link>
  );
}

const postTone = (s: string) =>
  s === "published" ? "success" : s === "scheduled" ? "info" : "neutral";
const supportTone = (s: string) =>
  s === "paid" ? "success" : s === "failed" ? "danger" : "warning";

export default async function AdminDashboardPage() {
  // One parallel batch; each array is reused for both its count and its recent list.
  const [posts, subscribers, payments, recentSupports, contacts, entityCounts, openRequests] = await Promise.all([
    getAllPostsAdmin(),
    getSubscribers(),
    getPaymentStats(),
    getRecentSupports(5),
    getContacts(1000), // no count() helper; 1000 >> real contact volume, so length is accurate
    Promise.all(ENTITY_LIST.map(async (e) => ({ def: e, count: await countEntities(e.table) }))),
    getOpenRequestCount(),
  ]);

  const newContacts = contacts.filter((c) => c.status === "new").length;
  const { published, drafts, scheduled } = postStatusCounts(posts);
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const recentSubs = subscribers.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">Dashboard</h1>
        <div className="flex gap-2">
          <AdminButton asChild size="sm"><Link href="/admin/posts/new">New post</Link></AdminButton>
          <AdminButton asChild size="sm" variant="secondary"><Link href="/admin/updates/new">New update</Link></AdminButton>
        </div>
      </div>

      {/* Action needed — only rendered when something is actually waiting */}
      {(newContacts > 0 || openRequests > 0) && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-admin-text">Needs attention</h2>
          <div className="flex flex-wrap gap-3">
            {newContacts > 0 && <ActionPill label="New contacts" count={newContacts} href="/admin/contacts" />}
            {openRequests > 0 && <ActionPill label="Open requests" count={openRequests} href="/admin/requests" />}
          </div>
        </div>
      )}

      {/* KPIs */}
      <h2 className="sr-only">Key metrics</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPIWidget label="Published" value={published} href="/admin/posts" />
        <KPIWidget label="Drafts" value={drafts} href="/admin/posts" />
        <KPIWidget label="Scheduled" value={scheduled} href="/admin/posts" />
        <KPIWidget label="Subscribers" value={subscribers.length} href="/admin/subscribers" />
        <KPIWidget label="Contacts" value={contacts.length} href="/admin/contacts" />
        <KPIWidget label="Paid supports" value={payments.paidCount} href="/admin/payments" />
        <KPIWidget label="Total raised" value={inr(payments.raised)} href="/admin/payments" />
        <KPIWidget label="This month" value={inr(payments.thisMonth)} hint="Paid this calendar month" href="/admin/payments" />
      </div>

      {/* Content entity counts */}
      <h2 className="sr-only">Content</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {entityCounts.map(({ def, count }) => (
          <KPIWidget key={def.key} label={def.label} value={count} href={`/admin/content/${def.key}`} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentCard title="Recent posts" viewAllHref="/admin/posts" isEmpty={recentPosts.length === 0}>
          {recentPosts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link href={`/admin/posts/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-admin-text hover:text-admin-accent">
                {p.title}
              </Link>
              <StatusBadge tone={postTone(p.status)}>{p.status}</StatusBadge>
            </li>
          ))}
        </RecentCard>

        <RecentCard title="Recent subscribers" viewAllHref="/admin/subscribers" isEmpty={recentSubs.length === 0}>
          {recentSubs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-admin-text">{s.email}</span>
              <span className="shrink-0 text-xs text-admin-text-muted">{formatDate(s.createdAt)}</span>
            </li>
          ))}
        </RecentCard>

        <RecentCard title="Recent supports" viewAllHref="/admin/payments" isEmpty={recentSupports.length === 0}>
          {recentSupports.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-admin-text">{t.name || t.email}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-admin-text-muted">{inr(t.total)}</span>
                <StatusBadge tone={supportTone(t.status)}>{t.status}</StatusBadge>
              </span>
            </li>
          ))}
        </RecentCard>
      </div>
    </div>
  );
}
