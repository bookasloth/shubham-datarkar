import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** In-game wall for archive puzzles the viewer can't open yet. No emoji (project rule). */
export function ArchiveUpsell({ game }: { game: "alfazy" | "hit-and-blow" | "integra" }) {
  return (
    <EmptyState
      className="mx-auto mt-10 max-w-sm"
      icon={<Lock />}
      title="This puzzle is in the Member archive"
      description="Today and yesterday are free. Become a Member to play every past puzzle."
      action={
        <div className="flex w-full flex-col gap-2">
          <Button asChild>
            <Link href="/members/upgrade">Unlock the archive</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/games/${game}`}>Continue with today&apos;s puzzle</Link>
          </Button>
          <Button variant="link" size="sm" asChild>
            <Link href="/members/upgrade">See everything included in Membership</Link>
          </Button>
        </div>
      }
    />
  );
}
