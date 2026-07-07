import { requireMember } from "@/lib/members/session";
import { getMyDownloads } from "@/lib/members/member-queries";
import { ResourceGrid } from "@/components/members/resource-grid";

export const metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const { role, user } = await requireMember("/members/downloads");
  const resources = await getMyDownloads(user!.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Downloads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Files you have downloaded — grab the latest versions anytime.
        </p>
      </header>

      <ResourceGrid
        resources={resources}
        role={role}
        emptyTitle="No downloads yet"
        emptyDescription="Download any file resource and it will be listed here."
      />
    </div>
  );
}
