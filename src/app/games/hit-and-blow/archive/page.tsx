import { buildMetadata } from "@/lib/seo";
import { listArchive } from "@/lib/games/archive-queries";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { ArchiveGrid } from "@/components/games/ArchiveGrid";
import { ArchiveHeader } from "@/components/games/ArchiveHeader";

export const metadata = buildMetadata({ title: "Hit and Blow Archive", path: "/games/hit-and-blow/archive", noIndex: true });

export default async function HitAndBlowArchivePage() {
  const now = Date.now();
  const [entries, ctx] = await Promise.all([
    listArchive("hit_and_blow", now),
    getMemberContext(),
  ]);
  const canViewArchive = can(ctx.capabilities, "view_archive");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Hit and Blow Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and yesterday are free.{" "}
          {canViewArchive
            ? "You have full archive access."
            : "Become a Member to play every past puzzle."}
        </p>
      </header>
      <ArchiveHeader game="hit_and_blow" />
      <ArchiveGrid entries={entries} game="hit-and-blow" canViewArchive={canViewArchive} now={now} />
    </div>
  );
}
