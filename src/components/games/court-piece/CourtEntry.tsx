"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourtRoom } from "@/lib/games/court-piece/server/actions";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";

export default function CourtEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await createCourtRoom();
    setBusy(false);
    if (res.ok) router.push(`/games/court-piece/${res.view.code}`);
    else setError(res.reason);
  }

  return (
    <GameStage>
      <GameHeader title="Court Piece" />
      <div className="w-full max-w-sm space-y-6">
        <p className="text-center text-sm text-muted-foreground">
          4-player Court Piece. Create a room and fill empty seats with bots, or share the code with friends.
        </p>

        <button
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-40"
          disabled={busy}
          onClick={create}
        >
          Create a room
        </button>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-center tracking-[0.3em] uppercase"
          />
          <button
            className="rounded-md border border-border px-4 py-2 hover:border-foreground disabled:opacity-40"
            disabled={busy || code.length < 4}
            onClick={() => router.push(`/games/court-piece/${code}`)}
          >
            Join
          </button>
        </div>

        {error && <p className="text-center text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </GameStage>
  );
}
