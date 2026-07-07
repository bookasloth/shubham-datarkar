import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { updateRequestStatus } from "@/lib/members/admin-actions";
import { PageHeader, StatusBadge } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  title: string;
  details: string | null;
  status: string;
  created_at: string;
};

const tone = (s: string) =>
  s === "shipped" ? "success" : s === "planned" ? "info" : s === "declined" ? "warning" : "neutral";

export default async function RequestsAdminPage() {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("member_requests")
    .select("id,kind,title,details,status,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member requests"
        description="What members are asking for — templates, prompts, tools, articles, reviews."
      />

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-card border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
              <span className="rounded-btn bg-accent px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                {r.kind}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{r.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              <form action={updateRequestStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select
                  name="status"
                  defaultValue={r.status}
                  className="h-8 rounded-btn border border-border bg-background px-2 text-xs"
                >
                  <option value="open">Open</option>
                  <option value="planned">Planned</option>
                  <option value="shipped">Shipped</option>
                  <option value="declined">Declined</option>
                </select>
                <Button type="submit" variant="outline" size="sm">Set</Button>
              </form>
            </div>
            {r.details && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>
            )}
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}
      </div>
    </div>
  );
}
