import { getEmailCredentials } from "@/lib/email/store";
import { PageHeader } from "@/components/admin";
import { InboxClient } from "@/components/admin/inbox-client";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const creds = await getEmailCredentials();

  return (
    <div>
      <PageHeader title="Email Inbox" />
      {creds ? (
        <div className="mt-4">
          <InboxClient />
        </div>
      ) : (
        <p className="mt-4 text-sm text-admin-text-muted">
          No SMTP credentials yet. Configure them in{" "}
          <a href="/admin/integrations" className="underline">
            Integrations
          </a>{" "}
          first.
        </p>
      )}
    </div>
  );
}
