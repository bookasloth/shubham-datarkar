import { getZohoStatus } from "@/lib/zoho/store";
import { getKitStatus } from "@/lib/kit/store";
import { ZohoIntegrationForm } from "@/components/admin/zoho-integration-form";
import { KitIntegrationForm } from "@/components/admin/kit-integration-form";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const [zoho, kit] = await Promise.all([getZohoStatus(), getKitStatus()]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Credentials are encrypted at rest and never shown again after saving.
      </p>

      <section className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold">Zoho Payments</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          Powers the /support checkout.
        </p>
        <ZohoIntegrationForm status={zoho} />
      </section>

      <section className="mt-12 max-w-xl border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Kit (email)</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          Newsletter signups are added to your Kit form (alongside the Supabase
          subscribers table).
        </p>
        <KitIntegrationForm status={kit} />
      </section>
    </div>
  );
}
