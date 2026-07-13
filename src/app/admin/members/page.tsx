import { supabaseAdmin } from "@/lib/supabase/server";
import { getActivePlans } from "@/lib/members/membership-server";
import { revokeGiftAction } from "@/lib/members/membership-actions";
import { PageHeader, StatusBadge } from "@/components/admin";
import { GiftForm } from "@/components/admin/gift-form";
import { ResetPassword } from "@/components/admin/reset-password";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  plan: string | null;
  status: string | null;
  source: string | null;
  periodEnd: string | null;
};

async function getMembers(): Promise<MemberRow[]> {
  const db = supabaseAdmin();
  const [{ data: users }, { data: profiles }, { data: memberships }] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
    db.from("profiles").select("id,username,created_at"),
    db.from("memberships").select("user_id,plan_key,status,source,current_period_end"),
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
      source: m?.source ?? null,
      periodEnd: m?.current_period_end ?? null,
    };
  });
}

const tone = (s: string | null) =>
  s === "active" ? "success" : s === "pending" ? "info" : s ? "warning" : "neutral";

export default async function MembersAdminPage() {
  const [members, plans] = await Promise.all([getMembers(), getActivePlans()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} account${members.length === 1 ? "" : "s"} (shared across members area and games).`}
      />

      {/* Gift a plan by email — grants a lifetime membership that is NOT counted
          as a paid member (tracked as a gift). */}
      <GiftForm plans={plans.map((p) => ({ key: p.key, name: p.name }))} />

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Username</th>
              <th className="px-4 py-2.5 font-medium">Membership</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Renews / ends</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium"></th>
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
                <td className="px-4 py-2.5">
                  {m.source === "gift" ? (
                    <StatusBadge tone="info">gift</StatusBadge>
                  ) : m.source === "paid" ? (
                    <span className="text-muted-foreground">paid</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {m.periodEnd ? formatDate(m.periodEnd) : "-"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <ResetPassword userId={m.id} />
                    {m.source === "gift" && (
                      <form action={revokeGiftAction}>
                        <input type="hidden" name="user_id" value={m.id} />
                        <Button type="submit" variant="outline" size="sm">Revoke</Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!members.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
