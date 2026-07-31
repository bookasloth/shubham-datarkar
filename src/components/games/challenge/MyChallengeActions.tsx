"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeChallenge, deleteChallenge } from "@/lib/games/challenges/actions";

/** Close (stop new plays) or delete a challenge you created. */
export function MyChallengeActions({ code, status }: { code: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean }>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "open" && (
        <button
          disabled={busy}
          onClick={() => run(() => closeChallenge(code))}
          className="rounded-btn border border-border px-3 py-1 text-xs font-medium transition-ui hover:bg-muted disabled:opacity-40"
        >
          Close
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => {
          if (confirm("Delete this challenge and its leaderboard?")) void run(() => deleteChallenge(code));
        }}
        className="rounded-btn border border-border px-3 py-1 text-xs font-medium text-destructive transition-ui hover:bg-muted disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
