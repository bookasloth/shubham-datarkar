"use client";

import { useEffect, useRef, useState } from "react";
import { INTEGRA, scoreGuess, isWin, isValidGuess, shareGrid, type Tile as TileState } from "@/lib/games/integra";
import { submitResult } from "@/lib/games/submit-result";
import { startPuzzle } from "@/lib/games/start-puzzle";
import { useGameAuth } from "@/components/games/use-game-auth";
import { useColorblind } from "@/components/games/use-colorblind";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { FireStreak } from "@/components/games/shell/FireStreak";
import { Tile } from "@/components/games/board/Tile";
import { Keyboard, type KeyDef } from "@/components/games/board/Keyboard";
import { WinBurst, WIN_BURST_MS } from "@/components/games/board/WinBurst";
import { ShareBlock } from "@/components/games/shell/ShareCard";
import { buildShareText, gameShareUrl } from "@/lib/games/share";
import type { GameStats } from "@/lib/games/profile-queries";
import { GameWelcome } from "@/components/games/shell/GameWelcome";
import { GameEndCard } from "@/components/games/shell/GameEndCard";

const DIGITS = "0123456789".split("");
const OPS = ["+", "-", "*", "/", "="];
const ALLOWED = new Set([...DIGITS, ...OPS]);
/** Data stays "*"/"/"; tiles + keys render the friendlier math symbols. */
const DISPLAY: Record<string, string> = { "*": "×", "/": "÷" };
const show = (ch: string) => DISPLAY[ch] ?? ch;

/** Digit row + operator/enter/backspace row, fed to the shared grid keyboard. */
const INTEGRA_ROWS: KeyDef[][] = [
  DIGITS.map((ch) => ({ label: show(ch), value: ch })),
  [
    { label: "⏎", value: "enter" },
    ...OPS.map((ch) => ({ label: show(ch), value: ch })),
    { label: "⌫", value: "back" },
  ],
];

type Saved = { guesses: string[]; status: "playing" | "won" | "lost" };

export default function IntegraBoard({
  puzzleNumber,
  isArchive,
  answer,
  stats,
}: {
  puzzleNumber: number;
  isArchive: boolean;
  answer: string;
  stats: GameStats | null;
}) {
  const storageKey = `integra:${puzzleNumber}`;

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  // `justWon` drives the 1.5s win-row bounce; the confetti outlives it, so it gets
  // its own window — unmounting WinBurst cancels the burst mid-flight.
  const [justWon, setJustWon] = useState(false);
  const [burst, setBurst] = useState(false);
  const clockStarted = useRef(false);
  // Shared colour-blind hook — same source + sync as Alfazy, no bespoke listener.
  const [colorblind] = useColorblind("integra");
  const { user } = useGameAuth();
  const submitted = useRef(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const s: Saved = JSON.parse(raw);
      setGuesses(s.guesses);
      setStatus(s.status);
    } catch {
      // Corrupt / old-schema value — start fresh instead of tripping the error boundary.
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (guesses.length || status !== "playing")
      localStorage.setItem(storageKey, JSON.stringify({ guesses, status }));
  }, [guesses, status, storageKey]);

  useEffect(() => {
    // Archive replays submit too — the server routes them to a write path that
    // records the solve without touching streaks.
    if (status === "playing") return;
    if (!user) return;
    if (submitted.current) return;
    submitted.current = true;
    void submitResult({ game: "integra", puzzleNumber, status, guesses });
  }, [isArchive, status, user, guesses, puzzleNumber]);

  const rows: TileState[][] = guesses.map((g) => scoreGuess(g, answer));

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  function submit() {
    if (status !== "playing") return;
    if (current.length !== INTEGRA.length) { setShakeCount((n) => n + 1); return flash(`Fill all ${INTEGRA.length} tiles`); }
    if (!isValidGuess(current)) { setShakeCount((n) => n + 1); return flash("Not a valid equation"); }
    // First accepted guess starts the server's clock — not page open, so a tab
    // left sitting on the puzzle doesn't record an hours-long "solve".
    if (!clockStarted.current && guesses.length === 0 && user) {
      clockStarted.current = true;
      void startPuzzle("integra", puzzleNumber);
    }
    const next = [...guesses, current];
    const tiles = scoreGuess(current, answer);
    setGuesses(next);
    setCurrent("");
    if (isWin(tiles)) {
      setStatus("won");
      setJustWon(true);
      setBurst(true);
      setTimeout(() => setJustWon(false), 1500);
      setTimeout(() => setBurst(false), WIN_BURST_MS);
    } else if (next.length >= INTEGRA.maxGuesses) {
      setStatus("lost");
    }
  }

  function key(k: string) {
    if (status !== "playing") return;
    if (k === "enter") return submit();
    if (k === "back") return setCurrent((c) => c.slice(0, -1));
    if (current.length < INTEGRA.length && ALLOWED.has(k)) setCurrent((c) => c + k);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Don't hijack browser shortcuts (Ctrl/Cmd+…) or typing in a real field.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "Enter") key("enter");
      else if (e.key === "Backspace") key("back");
      else if (ALLOWED.has(e.key)) key(e.key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // key()/submit() are recreated each render; re-binding on status+current
    // captures fresh closures without re-binding on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, current]);

  const keyState: Record<string, TileState> = {};
  const rankMap: Record<TileState, number> = { correct: 3, present: 2, absent: 1 };
  guesses.forEach((g, r) =>
    g.split("").forEach((ch, i) => {
      const t = rows[r][i];
      if (!keyState[ch] || rankMap[t] > rankMap[keyState[ch]]) keyState[ch] = t;
    }),
  );

  const shareText = buildShareText({
    game: "integra",
    puzzleNumber,
    status: status === "won" ? "won" : "lost",
    tries: guesses.length,
    maxGuesses: INTEGRA.maxGuesses,
    grid: shareGrid(rows),
  });
  const shareUrl = gameShareUrl("integra");

  return (
    <GameStage className={colorblind ? "integra-cb" : undefined}>
      <GameHeader
        slug="integra"
        title={
          <span className="inline-flex items-center gap-2">
            Integra #{puzzleNumber}{isArchive && " (archive)"}
            {/* Archive play never touches the streak, so showing the daily one
                next to an archive puzzle just implies a win here would move it. */}
            {!isArchive && (
              <FireStreak count={stats?.currentStreak ?? 0} justWon={status === "won"} />
            )}
          </span>
        }
      />

      <GameWelcome
        game="integra"
        greeting="Welcome to Integra"
        howto="Guess the hidden equation in six tries. See the Guide in the sidebar."
      />

      {/* grid — fluid so 7 tiles fit any phone width */}
      <div className="grid w-full max-w-[19rem] grid-rows-6 gap-1.5">
        {Array.from({ length: INTEGRA.maxGuesses }).map((_, r) => {
          const g = r < guesses.length ? guesses[r] : r === guesses.length ? current : "";
          const isInput = r === guesses.length;
          const isNewest = r === guesses.length - 1;
          const won = isNewest && justWon;
          return (
            <div
              key={isInput ? `input-${shakeCount}` : `row-${r}`}
              className={`grid grid-cols-7 gap-1.5${isInput && shakeCount ? " animate-shake" : ""}${won ? " animate-bounce-win" : ""}`}
            >
              {Array.from({ length: INTEGRA.length }).map((_, c) => {
                const tile = r < guesses.length ? rows[r][c] : undefined;
                return (
                  <Tile
                    key={c}
                    game="integra"
                    size="fluid"
                    state={tile}
                    char={g[c] ? show(g[c]) : ""}
                    flip={r < guesses.length && isNewest && !justWon}
                    flipDelay={c * 0.08}
                    colorblind={colorblind}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">
          {toast}
        </div>
      )}

      {status !== "playing" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">
            {status === "won" ? `Solved in ${guesses.length}!` : `Answer: ${answer.split("").map(show).join("")}`}
          </p>
          <ShareBlock text={shareText} url={shareUrl} />
          {/* Logged-out account CTA lives in the GameEndCard dialog below — no
              duplicate "log in" line here. */}
        </div>
      ) : (
        <Keyboard game="integra" variant="grid" rows={INTEGRA_ROWS} keyStates={keyState} onKey={key} />
      )}

      {status !== "playing" && !user && (
        <GameEndCard
          slug="integra"
          status={status}
          resultLine={
            status === "won"
              ? `Solved in ${guesses.length}!`
              : `The equation was ${answer.split("").map(show).join("")}.`
          }
          shareText={shareText}
          shareUrl={shareUrl}
        />
      )}

      {burst && <WinBurst />}
    </GameStage>
  );
}
