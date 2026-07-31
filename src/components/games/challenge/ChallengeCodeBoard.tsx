"use client";

import { useState } from "react";
import { HIT_AND_BLOW, isValidGuess } from "@/lib/games/hit-and-blow";
import { scoreChallengeGuess, startChallengeAttempt } from "@/lib/games/challenges/actions";
import type { ChallengeAttemptState } from "@/lib/games/challenges/types";
import { GameStage } from "@/components/games/shell/GameStage";
import { WinBurst, WIN_BURST_MS } from "@/components/games/board/WinBurst";

type Row = { guess: string; hits: number; blows: number };

function seed(initial: ChallengeAttemptState | null): Row[] {
  if (!initial) return [];
  return initial.guesses.map((guess, i) => {
    const f = initial.feedback[i];
    return { guess, hits: f?.kind === "code" ? f.hits : 0, blows: f?.kind === "code" ? f.blows : 0 };
  });
}

export function ChallengeCodeBoard({
  code,
  initial,
}: {
  code: string;
  initial: ChallengeAttemptState | null;
}) {
  const [history, setHistory] = useState<Row[]>(seed(initial));
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">(
    initial && initial.status !== "in_progress" ? initial.status : "playing",
  );
  const [toast, setToast] = useState("");
  const [justWon, setJustWon] = useState(false);
  const [pending, setPending] = useState(false);
  const started = (initial?.guesses.length ?? 0) > 0;

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  async function submit() {
    if (status !== "playing" || pending) return;
    if (!isValidGuess(current)) return flash(`${HIT_AND_BLOW.length} unique digits, no leading 0`);
    setPending(true);
    if (!started && history.length === 0) await startChallengeAttempt(code);
    const res = await scoreChallengeGuess(code, current);
    setPending(false);
    if (!res.ok) {
      return flash(
        res.reason === "budget" || res.reason === "finished"
          ? "No guesses left"
          : res.reason === "closed"
            ? "Challenge closed"
            : res.reason === "ratelimited"
              ? "Slow down a moment"
              : res.reason === "invalid"
                ? "Invalid code"
                : "Something went wrong",
      );
    }
    const fb = res.feedback.kind === "code" ? res.feedback : { hits: 0, blows: 0 };
    setHistory((h) => [...h, { guess: current, hits: fb.hits, blows: fb.blows }]);
    setCurrent("");
    if (res.status === "won") {
      setStatus("won");
      setJustWon(true);
      setTimeout(() => setJustWon(false), WIN_BURST_MS);
    } else if (res.status === "lost") {
      setStatus("lost");
    }
  }

  return (
    <GameStage>
      <div className="w-full max-w-xs space-y-1.5">
        {history.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-input border border-border bg-card px-4 py-2">
            <span className="font-mono text-lg tracking-widest">{r.guess}</span>
            <span className="text-sm" aria-label={`${r.hits} hits, ${r.blows} blows`}>
              <span aria-hidden="true">
                {"🎯".repeat(r.hits)}
                {"💨".repeat(r.blows) || (r.hits === 0 ? "—" : "")}
              </span>
              <span className="ml-2 text-muted-foreground">
                {r.hits}H {r.blows}B
              </span>
            </span>
          </div>
        ))}
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">
          {toast}
        </div>
      )}

      {status === "playing" ? (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={current}
            maxLength={HIT_AND_BLOW.length}
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder={"•".repeat(HIT_AND_BLOW.length)}
            className="w-40 rounded-input border-2 border-input bg-background px-4 py-2 text-center font-mono text-2xl tracking-widest outline-none transition-ui focus:border-brand"
          />
          <button
            onClick={() => void submit()}
            disabled={!isValidGuess(current) || pending}
            className="rounded-btn bg-primary px-5 font-semibold text-primary-foreground transition-ui hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Go
          </button>
        </div>
      ) : (
        <p className="font-semibold">{status === "won" ? `Cracked in ${history.length}!` : "Out of guesses."}</p>
      )}

      {justWon && <WinBurst />}
    </GameStage>
  );
}
