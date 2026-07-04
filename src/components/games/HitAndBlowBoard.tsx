"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HIT_AND_BLOW, secretFor, scoreGuess, isWin, isValidGuess, shareSummary } from "@/lib/games/hit-and-blow";
import { submitResult } from "@/lib/games/submit-result";
import { useGameAuth } from "@/components/games/use-game-auth";

type Row = { guess: string; hits: number; blows: number };
type Saved = { history: Row[]; status: "playing" | "won" | "lost" };

export default function HitAndBlowBoard({ puzzleNumber, isArchive }: { puzzleNumber: number; isArchive: boolean }) {
  const secret = useMemo(() => secretFor(puzzleNumber), [puzzleNumber]);
  const storageKey = `hit-and-blow:${puzzleNumber}`;

  const [history, setHistory] = useState<Row[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const { user } = useGameAuth();
  const submitted = useRef(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (raw) {
      const s: Saved = JSON.parse(raw);
      setHistory(s.history);
      setStatus(s.status);
    }
  }, [storageKey]);

  useEffect(() => {
    if (history.length || status !== "playing")
      localStorage.setItem(storageKey, JSON.stringify({ history, status }));
  }, [history, status, storageKey]);

  // submit result once per finished game, only when authed
  useEffect(() => {
    if (isArchive) return; // never persist replays of past puzzles (would corrupt streaks)
    if (status === "playing") return;
    if (!user) return;
    if (submitted.current) return;
    submitted.current = true;
    void submitResult({
      game: "hit_and_blow",
      puzzleNumber,
      status,
      guesses: history.map((r) => r.guess),
      timeMs: null,
    });
  }, [isArchive, status, user, history, puzzleNumber]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  function submit() {
    if (status !== "playing") return;
    if (!isValidGuess(current)) return flash(`${HIT_AND_BLOW.length} unique digits`);
    const { hits, blows } = scoreGuess(current, secret);
    const next = [...history, { guess: current, hits, blows }];
    setHistory(next);
    setCurrent("");
    if (isWin(hits)) {
      setStatus("won");
      // Phase 2: submitResult server action -> supabase.rpc('submit_result', ...)
    } else if (next.length >= HIT_AND_BLOW.maxGuesses) {
      setStatus("lost");
    }
  }

  function share() {
    const head = `shubhamdatarkar.com/games · Hit and Blow #${puzzleNumber} ${status === "won" ? `${history.length}/${HIT_AND_BLOW.maxGuesses}` : `X/${HIT_AND_BLOW.maxGuesses}`}`;
    navigator.clipboard.writeText(`${head}\n${shareSummary(history)}`);
    flash("Copied!");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="font-display text-xl font-bold">Hit and Blow #{puzzleNumber}{isArchive && " (archive)"}</h1>
      <p className="text-sm text-muted-foreground">
        {HIT_AND_BLOW.length} unique digits · {HIT_AND_BLOW.maxGuesses} tries · 🎯 right spot · 💨 wrong spot
      </p>

      <div className="w-full max-w-xs space-y-1.5">
        {history.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-input border border-border bg-card px-4 py-2">
            <span className="font-mono text-lg tracking-widest">{r.guess}</span>
            <span className="text-sm">
              {"🎯".repeat(r.hits)}{"💨".repeat(r.blows) || (r.hits === 0 ? "—" : "")}
              <span className="ml-2 text-muted-foreground">{r.hits}H {r.blows}B</span>
            </span>
          </div>
        ))}
      </div>

      {toast && <div className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">{toast}</div>}

      {status !== "playing" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">
            {status === "won" ? `Cracked in ${history.length}!` : `Code was ${secret}`}
          </p>
          <button onClick={share} className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Share
          </button>
          {!user && (
            <p className="text-sm text-muted-foreground">
              <Link href="/games/login?next=/games/hit-and-blow" className="underline underline-offset-4 hover:text-foreground">
                Log in
              </Link>{" "}
              to save your streak.
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={current}
            maxLength={HIT_AND_BLOW.length}
            onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={"•".repeat(HIT_AND_BLOW.length)}
            className="w-40 rounded-input border-2 border-input bg-background px-4 py-2 text-center font-mono text-2xl tracking-widest outline-none transition-ui focus:border-brand"
          />
          <button onClick={submit} className="rounded-btn bg-primary px-5 font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Go
          </button>
        </div>
      )}
    </div>
  );
}
