import { getKitStatus } from "@/lib/kit/store";
import { getEmailStatus } from "@/lib/email/store";
import { KitIntegrationForm } from "@/components/admin/kit-integration-form";
import { EmailIntegrationForm } from "@/components/admin/email-integration-form";
import { PageHeader } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const [kit, email] = await Promise.all([getKitStatus(), getEmailStatus()]);

  return (
    <div>
      <PageHeader title="Integrations" />
      <p className="mt-1 text-sm text-admin-text-muted">
        Credentials are encrypted at rest and never shown again after saving.
        Payments run on Razorpay, configured via environment variables.
      </p>

      <section className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold text-admin-text">Kit (email)</h2>
        <p className="mb-4 mt-0.5 text-sm text-admin-text-muted">
          Newsletter signups are added to your Kit form (alongside the Supabase
          subscribers table).
        </p>
        <KitIntegrationForm status={kit} />
      </section>

      <section className="mt-12 max-w-xl border-t border-admin-border pt-8">
        <h2 className="text-lg font-semibold text-admin-text">Email (SMTP)</h2>
        <p className="mb-4 mt-0.5 text-sm text-admin-text-muted">
          Sends contact-form notifications to you + an auto-reply to the sender.
        </p>
        <EmailIntegrationForm status={email} />
      </section>
    </div>
  );
}
