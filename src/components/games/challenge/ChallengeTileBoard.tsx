"use client";

import { useEffect, useRef, useState } from "react";
import { scoreChallengeGuess, startChallengeAttempt } from "@/lib/games/challenges/actions";
import type { ChallengeAttemptState, ChallengeGame } from "@/lib/games/challenges/types";
import { GameStage } from "@/components/games/shell/GameStage";
import { Tile } from "@/components/games/board/Tile";
import { Keyboard, type KeyDef } from "@/components/games/board/Keyboard";
import { WinBurst, WIN_BURST_MS } from "@/components/games/board/WinBurst";

type TileState = "correct" | "present" | "absent";

// Per-game input config. Only alfazy + integra (both tile grids) use this board.
const DIGITS = "0123456789".split("");
const OPS = ["+", "-", "*", "/", "="];
const DISPLAY: Record<string, string> = { "*": "×", "/": "÷" };
const show = (ch: string) => DISPLAY[ch] ?? ch;

const ALFAZY_ROWS: KeyDef[][] = [
  [..."qwertyuiop"].map((c) => ({ label: c, value: c })),
  [..."asdfghjkl"].map((c) => ({ label: c, value: c })),
  [
    { label: "⏎", value: "enter", wide: true },
    ...[..."zxcvbnm"].map((c) => ({ label: c, value: c })),
    { label: "⌫", value: "back", wide: true },
  ],
];
const INTEGRA_ROWS: KeyDef[][] = [
  DIGITS.map((ch) => ({ label: show(ch), value: ch })),
  [{ label: "⏎", value: "enter" }, ...OPS.map((ch) => ({ label: show(ch), value: ch })), { label: "⌫", value: "back" }],
];

type Config = {
  length: number;
  maxGuesses: number;
  rows: KeyDef[][];
  variant?: "grid";
  gridClass: string;
  colsClass: string;
  accepts: (k: string) => boolean;
  display: boolean;
};
const CONFIG: Record<"alfazy" | "integra", Config> = {
  alfazy: {
    length: 5,
    maxGuesses: 6,
    rows: ALFAZY_ROWS,
    gridClass: "grid-rows-6",
    colsClass: "grid-cols-5",
    accepts: (k) => /^[a-z]$/.test(k),
    display: false,
  },
  integra: {
    length: 7,
    maxGuesses: 6,
    rows: INTEGRA_ROWS,
    variant: "grid",
    gridClass: "w-full max-w-[19rem] grid-rows-6",
    colsClass: "grid-cols-7",
    accepts: (k) => DIGITS.includes(k) || OPS.includes(k),
    display: true,
  },
};

function tilesOf(state: ChallengeAttemptState | null): TileState[][] {
  if (!state) return [];
  return state.feedback.map((f) => (f.kind === "tiles" ? f.tiles : []));
}

export function ChallengeTileBoard({
  code,
  game,
  initial,
}: {
  code: string;
  game: "alfazy" | "integra";
  initial: ChallengeAttemptState | null;
}) {
  const cfg = CONFIG[game];
  const [guesses, setGuesses] = useState<string[]>(initial?.guesses ?? []);
  const [rows, setRows] = useState<TileState[][]>(tilesOf(initial));
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">(
    initial && initial.status !== "in_progress" ? initial.status : "playing",
  );
  const [toast, setToast] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const [justWon, setJustWon] = useState(false);
  const [pending, setPending] = useState(false);
  const started = useRef((initial?.guesses.length ?? 0) > 0);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  async function submit() {
    if (status !== "playing" || pending) return;
    if (current.length !== cfg.length) {
      setShakeCount((n) => n + 1);
      return flash(`Fill all ${cfg.length} tiles`);
    }
    setPending(true);
    if (!started.current) {
      started.current = true;
      await startChallengeAttempt(code);
    }
    const res = await scoreChallengeGuess(code, current);
    setPending(false);
    if (!res.ok) {
      setShakeCount((n) => n + 1);
      return flash(
        res.reason === "invalid"
          ? "Not a valid guess"
          : res.reason === "budget" || res.reason === "finished"
            ? "No guesses left"
            : res.reason === "closed"
              ? "Challenge closed"
              : res.reason === "ratelimited"
                ? "Slow down a moment"
                : "Something went wrong",
      );
    }
    const tiles = res.feedback.kind === "tiles" ? res.feedback.tiles : [];
    setGuesses((g) => [...g, current]);
    setRows((r) => [...r, tiles]);
    setCurrent("");
    if (res.status === "won") {
      setStatus("won");
      setJustWon(true);
      setTimeout(() => setJustWon(false), WIN_BURST_MS);
    } else if (res.status === "lost") {
      setStatus("lost");
    }
  }

  function key(k: string) {
    if (status !== "playing" || pending) return;
    if (k === "enter") return void submit();
    if (k === "back") return setCurrent((c) => c.slice(0, -1));
    if (current.length < cfg.length && cfg.accepts(k)) setCurrent((c) => c + k);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "Enter") key("enter");
      else if (e.key === "Backspace") key("back");
      else {
        const k = game === "alfazy" ? e.key.toLowerCase() : e.key;
        if (cfg.accepts(k)) key(k);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, current, pending]);

  const keyState: Record<string, TileState> = {};
  const rank: Record<TileState, number> = { correct: 3, present: 2, absent: 1 };
  guesses.forEach((g, r) =>
    g.split("").forEach((ch, i) => {
      const t = rows[r]?.[i];
      if (t && (!keyState[ch] || rank[t] > rank[keyState[ch]])) keyState[ch] = t;
    }),
  );

  return (
    <GameStage>
      <div className={`grid gap-1.5 ${cfg.gridClass}`}>
        {Array.from({ length: cfg.maxGuesses }).map((_, r) => {
          const g = r < guesses.length ? guesses[r] : r === guesses.length ? current : "";
          const isInput = r === guesses.length;
          const isNewest = r === guesses.length - 1;
          return (
            <div
              key={isInput ? `input-${shakeCount}` : `row-${r}`}
              className={`grid gap-1.5 ${cfg.colsClass}${isInput && shakeCount ? " animate-shake" : ""}`}
            >
              {Array.from({ length: cfg.length }).map((_, c) => {
                const tile = r < guesses.length ? rows[r]?.[c] : undefined;
                const ch = g[c] ?? "";
                return (
                  <Tile
                    key={c}
                    game={game}
                    size={game === "integra" ? "fluid" : undefined}
                    state={tile}
                    char={ch ? (cfg.display ? show(ch) : ch) : ""}
                    flip={r < guesses.length && isNewest}
                    flipDelay={c * 0.08}
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

      {status === "playing" ? (
        <Keyboard game={game} variant={cfg.variant} rows={cfg.rows} keyStates={keyState} onKey={key} />
      ) : (
        <p className="font-semibold">{status === "won" ? `Cracked in ${guesses.length}!` : "Out of guesses."}</p>
      )}

      {justWon && <WinBurst />}
    </GameStage>
  );
}
