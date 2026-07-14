"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "streak", label: "Streak" },
] as const;

export function BoardSelect({ slug, board }: { slug: string; board: string }) {
  const router = useRouter();
  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    router.push(`/games/${slug}/leaderboard?board=${e.target.value}`);
  }
  return (
    <select
      value={board}
      onChange={onChange}
      aria-label="Leaderboard period"
      className="rounded-input border border-border bg-card px-3 py-1.5 text-sm font-medium outline-none transition-ui hover:border-foreground/30 focus:border-foreground/40"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
