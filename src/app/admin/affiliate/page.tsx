import { X } from "lucide-react";
import { getAffiliateDomains } from "@/lib/content/affiliate-queries";
import { removeAffiliateDomain } from "@/lib/content/affiliate-actions";
import { AddAffiliateDomainForm } from "@/components/admin/add-affiliate-domain-form";
import { PageHeader, AdminButton } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatePage() {
  const domains = await getAffiliateDomains();

  return (
    <div>
      <PageHeader title="Affiliate domains" />
      <p className="mt-1 text-sm text-admin-text-muted">
        Links in articles that point at these domains render as affiliate — a
        “Sponsored” tooltip and <code className="text-xs">rel=&quot;sponsored&quot;</code>. Subdomains match too.
      </p>

      <div className="mt-6 max-w-xl">
        <AddAffiliateDomainForm />

        <ul className="mt-6 divide-y divide-admin-border overflow-hidden rounded-card border border-admin-border">
          {domains.length === 0 && (
            <li className="p-4 text-sm text-admin-text-muted">No affiliate domains yet.</li>
          )}
          {domains.map((d) => (
            <li key={d} className="flex items-center justify-between gap-3 p-3">
              <span className="font-mono text-sm">{d}</span>
              <form action={removeAffiliateDomain.bind(null, d)}>
                <AdminButton type="submit" variant="ghost" size="icon" aria-label={`Remove ${d}`}>
                  <X />
                </AdminButton>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
