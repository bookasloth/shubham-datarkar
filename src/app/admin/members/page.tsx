import { supabaseAdmin } from "@/lib/supabase/server";
import { PageHeader, StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  plan: string | null;
  status: string | null;
  periodEnd: string | null;
};

async function getMembers(): Promise<MemberRow[]> {
  const db = supabaseAdmin();
  const [{ data: users }, { data: profiles }, { data: memberships }] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
    db.from("profiles").select("id,username,created_at"),
    db.from("memberships").select("user_id,plan_key,status,current_period_end"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const membershipById = new Map((memberships ?? []).map((m) => [m.user_id, m]));

  return (users?.users ?? []).map((u) => {
    const m = membershipById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      username: profileById.get(u.id)?.username ?? "",
      createdAt: u.created_at,
      plan: m?.plan_key ?? null,
      status: m?.status ?? null,
      periodEnd: m?.current_period_end ?? null,
    };
  });
}

const tone = (s: string | null) =>
  s === "active" ? "success" : s === "pending" ? "info" : s ? "warning" : "neutral";

export default async function MembersAdminPage() {
  const members = await getMembers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} account${members.length === 1 ? "" : "s"} (shared across members area and games).`}
      />

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Username</th>
              <th className="px-4 py-2.5 font-medium">Membership</th>
              <th className="px-4 py-2.5 font-medium">Renews / ends</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{m.email}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.username}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge tone={tone(m.status)}>
                    {m.status ? `${m.plan ?? ""} ${m.status}`.trim() : "free"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {m.periodEnd ? formatDate(m.periodEnd) : "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
            {!members.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
