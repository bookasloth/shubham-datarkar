import Link from "next/link";
import { PageHeader } from "@/components/admin";
import { getEmailStatus } from "@/lib/email/store";
import { getSubscribers } from "@/lib/subscribers/queries";
import { BROADCAST_TEMPLATES } from "@/lib/email/broadcasts";
import { BroadcastForm } from "./broadcast-form";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  const [status, subs] = await Promise.all([getEmailStatus(), getSubscribers()]);
  const activeCount = subs.filter((s) => s.status === "active").length;

  // Send only metadata to the client — the HTML bodies stay server-side.
  const templates = BROADCAST_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    subject: t.subject,
  }));

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Broadcast"
        description="Send a campaign email to your active subscribers — or a test to yourself first."
      />

      {!status.configured ? (
        <p className="rounded-card border border-border p-4 text-sm text-admin-text-muted">
          SMTP isn&apos;t configured yet. Set it up in{" "}
          <Link href="/admin/integrations" className="text-admin-accent underline">
            Integrations
          </Link>{" "}
          before sending.
        </p>
      ) : (
        <BroadcastForm templates={templates} activeCount={activeCount} />
      )}
    </div>
  );
}
