import { X } from "lucide-react";
import { getAffiliateDomains } from "@/lib/content/affiliate-queries";
import { removeAffiliateDomain } from "@/lib/content/affiliate-actions";
import { AddAffiliateDomainForm } from "@/components/admin/add-affiliate-domain-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatePage() {
  const domains = await getAffiliateDomains();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Affiliate domains</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Links in articles that point at these domains render as affiliate — a
        “Sponsored” tooltip and <code className="text-xs">rel=&quot;sponsored&quot;</code>. Subdomains match too.
      </p>

      <div className="mt-6 max-w-xl">
        <AddAffiliateDomainForm />

        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-card border border-border">
          {domains.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">No affiliate domains yet.</li>
          )}
          {domains.map((d) => (
            <li key={d} className="flex items-center justify-between gap-3 p-3">
              <span className="font-mono text-sm">{d}</span>
              <form action={removeAffiliateDomain.bind(null, d)}>
                <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Remove ${d}`}>
                  <X />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
