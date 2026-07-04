import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";

export default function GamesHub() {
  const today = puzzleNumberFor();
  const games = [
    { slug: "alfazy", name: "Alfazy", tag: "Guess the 5-letter word", emoji: "🟩" },
    { slug: "hit-and-blow", name: "Hit and Blow", tag: "Crack the 4-digit code", emoji: "🎯" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Today is puzzle <b>#{today}</b>. Play free — log in to keep your streak &amp; unlock the archive.
      </p>
      {games.map((g) => (
        <Link
          key={g.slug}
          href={`/games/${g.slug}`}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400"
        >
          <div>
            <div className="text-lg font-semibold">{g.emoji} {g.name}</div>
            <div className="text-sm text-neutral-500">{g.tag}</div>
          </div>
          <span className="text-sm text-neutral-400">#{today} →</span>
        </Link>
      ))}
    </div>
  );
}
