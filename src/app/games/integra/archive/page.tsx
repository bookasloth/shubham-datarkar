import { buildMetadata } from "@/lib/seo";
import { requestNow } from "@/lib/request-now";
import { listArchive } from "@/lib/games/archive-queries";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { ArchiveGrid } from "@/components/games/ArchiveGrid";
import { ArchiveHeader } from "@/components/games/ArchiveHeader";

export const metadata = buildMetadata({ title: "Integra Archive", path: "/games/integra/archive", noIndex: true });

export default async function IntegraArchivePage() {
  const now = await requestNow();
  const [entries, ctx] = await Promise.all([listArchive("integra", now), getMemberContext()]);
  const canViewArchive = can(ctx.capabilities, "view_archive");

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">Integra Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and yesterday are free.{" "}
          {canViewArchive
            ? "You have full archive access."
            : "Become a Member to play every past puzzle."}
        </p>
      </header>
      <ArchiveHeader game="integra" />
      <ArchiveGrid entries={entries} game="integra" canViewArchive={canViewArchive} now={now} />
    </div>
  );
}
