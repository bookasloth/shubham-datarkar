import { listArchive } from "@/lib/games/archive-queries";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { ArchiveGrid } from "@/components/games/ArchiveGrid";

export const metadata = { title: "Alfazy Archive" };

export default async function AlfazyArchivePage() {
  const now = Date.now();
  const [entries, ctx] = await Promise.all([listArchive("alfazy", now), getMemberContext()]);
  const canViewArchive = can(ctx.capabilities, "view_archive");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Alfazy archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and yesterday are free.{" "}
          {canViewArchive
            ? "You have full archive access."
            : "Become a Member to play every past puzzle."}
        </p>
      </header>
      <ArchiveGrid entries={entries} game="alfazy" canViewArchive={canViewArchive} now={now} />
    </div>
  );
}
