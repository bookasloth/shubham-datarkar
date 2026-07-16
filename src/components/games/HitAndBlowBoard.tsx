"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HIT_AND_BLOW, secretFor, scoreGuess, isWin, isValidGuess, shareSummary } from "@/lib/games/hit-and-blow";
import { submitResult } from "@/lib/games/submit-result";
import { startPuzzle } from "@/lib/games/start-puzzle";
import { useGameAuth } from "@/components/games/use-game-auth";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { FireStreak } from "@/components/games/shell/FireStreak";
import { WinBurst, WIN_BURST_MS } from "@/components/games/board/WinBurst";
import { ShareBlock } from "@/components/games/shell/ShareCard";
import { buildShareText, gameShareUrl } from "@/lib/games/share";
import type { GameStats } from "@/lib/games/profile-queries";
import { GameWelcome } from "@/components/games/shell/GameWelcome";
import { GameEndCard } from "@/components/games/shell/GameEndCard";

type Row = { guess: string; hits: number; blows: number };
type Saved = { history: Row[]; status: "playing" | "won" | "lost" };

export default function HitAndBlowBoard({
  puzzleNumber,
  isArchive,
  stats,
}: {
  puzzleNumber: number;
  isArchive: boolean;
  stats: GameStats | null;
}) {
  const secret = useMemo(() => secretFor(puzzleNumber), [puzzleNumber]);
  const storageKey = `hit-and-blow:${puzzleNumber}`;

  const [history, setHistory] = useState<Row[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const [justWon, setJustWon] = useState(false);
  const { user } = useGameAuth();
  const submitted = useRef(false);
  const clockStarted = useRef(false);

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
    // Archive replays submit too — the server routes them to a write path that
    // records the solve without touching streaks.
    if (status === "playing") return;
    if (!user) return;
    if (submitted.current) return;
    submitted.current = true;
    void submitResult({
      game: "hit_and_blow",
      puzzleNumber,
      status,
      guesses: history.map((r) => r.guess),
    });
  }, [isArchive, status, user, history, puzzleNumber]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  function submit() {
    if (status !== "playing") return;
    if (!isValidGuess(current)) return flash(`${HIT_AND_BLOW.length} unique digits, no leading 0`);
    // First accepted guess starts the server's clock — not page open, so a tab
    // left sitting on the puzzle doesn't record an hours-long "solve".
    if (!clockStarted.current && history.length === 0 && user) {
      clockStarted.current = true;
      void startPuzzle("hit_and_blow", puzzleNumber);
    }
    const { hits, blows } = scoreGuess(current, secret);
    const next = [...history, { guess: current, hits, blows }];
    setHistory(next);
    setCurrent("");
    if (isWin(hits)) {
      setStatus("won");
      setJustWon(true);
      setTimeout(() => setJustWon(false), WIN_BURST_MS);
    } else if (next.length >= HIT_AND_BLOW.maxGuesses) {
      setStatus("lost");
    }
  }

  const shareText = buildShareText({
    game: "hit_and_blow",
    puzzleNumber,
    status: status === "won" ? "won" : "lost",
    tries: history.length,
    maxGuesses: HIT_AND_BLOW.maxGuesses,
    grid: shareSummary(history),
  });
  const shareUrl = gameShareUrl("hit_and_blow");

  return (
    <GameStage>
      <GameHeader
        slug="hit-and-blow"
        title={
          <span className="inline-flex items-center gap-2">
            Hit and Blow #{puzzleNumber}{isArchive && " (archive)"}
            <FireStreak
              count={stats?.currentStreak ?? 0}
              justWon={!isArchive && status === "won"}
            />
          </span>
        }
      />

      <GameWelcome
        game="hit-and-blow"
        greeting="Welcome to Hit and Blow"
        howto="Crack the 4-digit code in nine tries. See the Guide in the sidebar."
      />

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
          <ShareBlock text={shareText} url={shareUrl} />
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

      {status !== "playing" && !user && (
        <GameEndCard
          slug="hit-and-blow"
          status={status}
          resultLine={status === "won" ? `Cracked in ${history.length}!` : `The code was ${secret}.`}
          shareText={shareText}
          shareUrl={shareUrl}
        />
      )}

      {justWon && <WinBurst />}
    </GameStage>
  );
}
