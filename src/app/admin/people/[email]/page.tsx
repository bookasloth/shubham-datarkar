import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPersonTimeline } from "@/lib/people/queries";
import { getMemberByEmail } from "@/lib/members/admin-members";
import { getContactsByEmail } from "@/lib/contact/queries";
import { getActivePlans } from "@/lib/members/membership-server";
import { revokeGiftAction } from "@/lib/members/membership-actions";
import { removeAvatarAsAdmin } from "@/lib/members/avatar-actions";
import { StatusBadge } from "@/components/admin";
import { GiftForm } from "@/components/admin/gift-form";
import { ResetPassword } from "@/components/admin/reset-password";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_TONE: Record<string, "success" | "info" | "neutral" | "warning"> = {
  contact: "info",
  newsletter: "neutral",
  donation: "success",
  game: "neutral",
  membership: "success",
};

const statusTone = (s: string | null) =>
  s === "active" ? "success" : s === "pending" ? "info" : s ? "warning" : "neutral";

export default async function PersonProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const { email: raw } = await params;
  const email = decodeURIComponent(raw);

  const [timeline, member, contacts, plans] = await Promise.all([
    getPersonTimeline(email),
    getMemberByEmail(email),
    getContactsByEmail(email),
    getActivePlans(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/people" className="inline-flex items-center gap-1.5 text-xs text-admin-text-muted hover:text-admin-text">
        <ArrowLeft className="size-3.5" /> All people
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">{email}</h1>
        {member ? (
          <StatusBadge tone={statusTone(member.status)}>
            {member.status ? `${member.plan ?? ""} ${member.status}`.trim() : "free account"}
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">no account</StatusBadge>
        )}
      </div>

      {/* Account & actions */}
      <section className="flex flex-col gap-4 rounded-card border border-admin-border p-4">
        <h2 className="text-sm font-semibold text-admin-text">Account</h2>

        {member ? (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-admin-text-muted">Username</dt>
                <dd className="text-admin-text">{member.username || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-text-muted">Source</dt>
                <dd className="text-admin-text">{member.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-text-muted">Renews / ends</dt>
                <dd className="text-admin-text">{member.periodEnd ? formatDate(member.periodEnd) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-text-muted">Joined</dt>
                <dd className="text-admin-text">{formatDate(member.createdAt)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <ResetPassword userId={member.id} />
              {member.avatarUrl && (
                <form action={async () => { "use server"; await removeAvatarAsAdmin(member.id); }}>
                  <Button type="submit" variant="outline" size="sm">Remove photo</Button>
                </form>
              )}
              {member.source === "gift" && (
                <form action={revokeGiftAction}>
                  <input type="hidden" name="user_id" value={member.id} />
                  <Button type="submit" variant="outline" size="sm">Revoke gift</Button>
                </form>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-admin-text-muted">
            No account for this email yet. Gifting a plan requires the person to have signed in at least once.
          </p>
        )}

        <GiftForm plans={plans.map((p) => ({ key: p.key, name: p.name }))} defaultEmail={email} />
      </section>

      {/* Contact messages */}
      {contacts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-admin-text">
            Contact messages ({contacts.length})
          </h2>
          {contacts.map((c) => (
            <div key={c.id} className="rounded-card border border-admin-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-admin-text">{c.name || email}</span>
                <span className="shrink-0 text-xs text-admin-text-muted">{formatDate(c.createdAt)}</span>
              </div>
              {(c.projectType || c.budget) && (
                <p className="mt-0.5 text-xs text-admin-text-muted">
                  {[c.projectType, c.budget].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-admin-text break-words">{c.message}</p>
            </div>
          ))}
        </section>
      )}

      {/* Activity timeline */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-admin-text">
          Activity — {timeline.length} {timeline.length === 1 ? "event" : "events"}
        </h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-admin-text-muted">No activity found for this email.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {timeline.map((e, i) => (
              <li key={i} className="flex gap-3 rounded-card border border-admin-border p-3">
                <StatusBadge tone={KIND_TONE[e.kind] ?? "neutral"}>{e.kind}</StatusBadge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-admin-text">{e.title}</p>
                  {e.detail && <p className="mt-0.5 text-sm text-admin-text-muted break-words">{e.detail}</p>}
                </div>
                <span className="shrink-0 text-xs text-admin-text-muted">{e.occurredAt ? formatDate(e.occurredAt) : "—"}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
