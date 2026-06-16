import { buildMetadata } from "@/lib/seo";
import { SupportPanel } from "@/components/support/support-panel";
import { SupporterStrip } from "@/components/support/supporter-strip";
import { getRecentSupporters } from "@/lib/support/queries";

export const metadata = buildMetadata({
  title: "Support",
  description: "Buy me a coffee or a toffee. Your support keeps the writing, free tools, and experiments coming.",
  path: "/support",
});

export default async function SupportPage() {
  const recent = await getRecentSupporters();
  return (
    <div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Buy me a coffee or a toffee</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick how many, leave a note, done in under a minute.
        </p>
      </div>
      <div className="mt-5">
        <SupportPanel />
      </div>
      <SupporterStrip supporters={recent} />
    </div>
  );
}
