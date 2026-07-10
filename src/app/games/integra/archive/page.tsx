import { buildMetadata } from "@/lib/seo";
import { listArchive } from "@/lib/games/archive-queries";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { ArchiveGrid } from "@/components/games/ArchiveGrid";

export const metadata = buildMetadata({ title: "Integra Archive", path: "/games/integra/archive", noIndex: true });

export default async function IntegraArchivePage() {
  const now = Date.now();
  const [entries, ctx] = await Promise.all([listArchive("integra", now), getMemberContext()]);
  const canViewArchive = can(ctx.capabilities, "view_archive");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Integra archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and yesterday are free.{" "}
          {canViewArchive
            ? "You have full archive access."
            : "Become a Member to play every past puzzle."}
        </p>
      </header>
      <ArchiveGrid entries={entries} game="integra" canViewArchive={canViewArchive} now={now} />
    </div>
  );
}
