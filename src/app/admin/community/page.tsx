import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import {
  resolveReport,
  setPostHidden,
  setPostDemoted,
  adminDeletePost,
  setUserBanned,
  saveAd,
} from "@/lib/community/admin-actions";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportRow = {
  report_id: string;
  post_id: string;
  reason: string | null;
  created_at: string;
  post_body: string | null;
  post_hidden: boolean;
  post_demoted: boolean;
  author_id: string;
  author_username: string;
  author_banned: boolean;
  reporter_username: string;
};

type PostRow = {
  id: string;
  body: string | null;
  type: string;
  hidden: boolean;
  demoted: boolean;
  created_at: string;
  user_id: string;
};

type AdRow = { slot: number; image_path: string | null; link_url: string | null; active: boolean };

function excerpt(body: string | null): string {
  if (!body) return "(no text)";
  return body.length > 120 ? `${body.slice(0, 120)}…` : body;
}

export default async function AdminCommunityPage() {
  const sb = await supabaseAuthServer();

  const [{ data: reports }, { data: posts }, { data: ads }] = await Promise.all([
    sb.rpc("community_reports_queue", { p_limit: 50, p_offset: 0 }),
    sb
      .from("community_posts")
      .select("id, body, type, hidden, demoted, created_at, user_id")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(25),
    sb.from("community_ads").select("slot, image_path, link_url, active").order("slot"),
  ]);

  const reportRows = (reports ?? []) as ReportRow[];
  const postRows = (posts ?? []) as PostRow[];
  const adRows = (ads ?? []) as AdRow[];
  const adFor = (slot: 1 | 2): AdRow =>
    adRows.find((a) => a.slot === slot) ?? { slot, image_path: null, link_url: null, active: false };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Community"
        description="Work the reports queue, moderate posts, and manage the two ad slots."
      />

      {/* ---- reports queue ---- */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Open reports ({reportRows.length})</h2>
        {reportRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing reported. Quiet day.</p>
        ) : (
          reportRows.map((r) => (
            <div key={r.report_id} className="rounded-card border border-border p-4">
              <p className="text-sm">{excerpt(r.post_body)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                by @{r.author_username}
                {r.author_banned && " (banned)"} · reported by @{r.reporter_username} ·{" "}
                {formatDate(r.created_at)}
                {r.reason && ` · "${r.reason}"`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={resolveReport.bind(null, r.report_id)}>
                  <Button type="submit" size="sm" variant="outline">
                    Resolve
                  </Button>
                </form>
                <form action={setPostHidden.bind(null, r.post_id, !r.post_hidden, "", false)}>
                  <Button type="submit" size="sm" variant="outline">
                    {r.post_hidden ? "Unhide" : "Hide (silent)"}
                  </Button>
                </form>
                <form action={setPostHidden.bind(null, r.post_id, true, "Violates community rules", true)}>
                  <Button type="submit" size="sm" variant="outline">
                    Hide + notify
                  </Button>
                </form>
                <form action={setPostDemoted.bind(null, r.post_id, !r.post_demoted)}>
                  <Button type="submit" size="sm" variant="outline">
                    {r.post_demoted ? "Undemote" : "Demote"}
                  </Button>
                </form>
                <form action={setUserBanned.bind(null, r.author_id, !r.author_banned, "Abuse")}>
                  <Button type="submit" size="sm" variant="outline">
                    {r.author_banned ? "Unban author" : "Ban author"}
                  </Button>
                </form>
                <form action={adminDeletePost.bind(null, r.post_id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    Delete post
                  </Button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ---- recent posts ---- */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Recent posts</h2>
        {postRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          postRows.map((p) => (
            <div key={p.id} className="rounded-card border border-border p-4">
              <p className="text-sm">{excerpt(p.body)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.type} · {formatDate(p.created_at)}
                {p.hidden && " · hidden"}
                {p.demoted && " · demoted"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={setPostHidden.bind(null, p.id, !p.hidden, "", false)}>
                  <Button type="submit" size="sm" variant="outline">
                    {p.hidden ? "Unhide" : "Hide"}
                  </Button>
                </form>
                <form action={setPostDemoted.bind(null, p.id, !p.demoted)}>
                  <Button type="submit" size="sm" variant="outline">
                    {p.demoted ? "Undemote" : "Demote"}
                  </Button>
                </form>
                <form action={adminDeletePost.bind(null, p.id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ---- ad slots ---- */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Ad slots</h2>
        <p className="text-sm text-muted-foreground">
          Two sticky slots in the community right rail. Image must be a full public URL.
        </p>
        {([1, 2] as const).map((slot) => {
          const ad = adFor(slot);
          return (
            <form key={slot} action={saveAd} className="space-y-2 rounded-card border border-border p-4">
              <input type="hidden" name="slot" value={slot} />
              <p className="text-sm font-medium">Slot {slot}</p>
              <Input name="image_path" defaultValue={ad.image_path ?? ""} placeholder="Image URL" />
              <Input name="link_url" defaultValue={ad.link_url ?? ""} placeholder="Link URL" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={ad.active} /> Active
              </label>
              <Button type="submit" size="sm">
                Save slot {slot}
              </Button>
            </form>
          );
        })}
      </section>
    </div>
  );
}
