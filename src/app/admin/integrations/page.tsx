import { getZohoStatus } from "@/lib/zoho/store";
import { ZohoIntegrationForm } from "@/components/admin/zoho-integration-form";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const status = await getZohoStatus();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Zoho Payments credentials that power the /support checkout. Secrets are
        encrypted at rest and never shown again after saving.
      </p>

      <div className="mt-6 max-w-xl">
        <ZohoIntegrationForm status={status} />
      </div>
    </div>
  );
}
