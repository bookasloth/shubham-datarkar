import { getEmailStatus } from "@/lib/email/store";
import { EmailIntegrationForm } from "@/components/admin/email-integration-form";
import { PageHeader } from "@/components/admin";

export const dynamic = "force-dynamic";

// Kit (ConvertKit) integration hidden — SMTP is the only active integration.
// The Kit lib + admin form stay in the tree, dormant; restore its <section>
// here to re-expose it.
export default async function AdminIntegrationsPage() {
  const email = await getEmailStatus();

  return (
    <div>
      <PageHeader title="Integrations" />
      <p className="mt-1 text-sm text-admin-text-muted">
        Credentials are encrypted at rest and never shown again after saving.
        Payments run on Razorpay, configured via environment variables.
      </p>

      <section className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold text-admin-text">Email (SMTP)</h2>
        <p className="mb-4 mt-0.5 text-sm text-admin-text-muted">
          Sends contact-form notifications to you + an auto-reply to the sender.
        </p>
        <EmailIntegrationForm status={email} />
      </section>
    </div>
  );
}
