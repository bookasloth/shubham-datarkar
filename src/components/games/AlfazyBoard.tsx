"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ALFAZY, scoreGuess, isWin, isValidGuess, shareGrid, type Tile } from "@/lib/games/alfazy";
import { submitResult } from "@/lib/games/submit-result";
import { useGameAuth } from "@/components/games/use-game-auth";
import { useAlfazyTheme } from "@/components/games/AlfazyThemeProvider";

const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

type Saved = { guesses: string[]; status: "playing" | "won" | "lost" };

export default function AlfazyBoard({
  puzzleNumber,
  isArchive,
  answer,
}: {
  puzzleNumber: number;
  isArchive: boolean;
  answer: string;
}) {
  const storageKey = `alfazy:${puzzleNumber}`;
  const { colorblind, setColorblind } = useAlfazyTheme();

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const { user } = useGameAuth();
  const submitted = useRef(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (raw) {
      const s: Saved = JSON.parse(raw);
      setGuesses(s.guesses);
      setStatus(s.status);
    }
  }, [storageKey]);

  useEffect(() => {
    if (guesses.length || status !== "playing")
      localStorage.setItem(storageKey, JSON.stringify({ guesses, status }));
  }, [guesses, status, storageKey]);

  useEffect(() => {
    if (isArchive) return;
    if (status === "playing") return;
    if (!user) return;
    if (submitted.current) return;
    submitted.current = true;
    void submitResult({
      game: "alfazy",
      puzzleNumber,
      status,
      guesses,
      timeMs: null,
    });
  }, [isArchive, status, user, guesses, puzzleNumber]);

  const rows: Tile[][] = guesses.map((g) => scoreGuess(g, answer));

  function submit() {
    if (status !== "playing") return;
    if (current.length !== ALFAZY.length) { setShakeCount((n) => n + 1); return flash("Not enough letters"); }
    if (!isValidGuess(current)) { setShakeCount((n) => n + 1); return flash("Letters only"); }
    const next = [...guesses, current];
    const tiles = scoreGuess(current, answer);
    setGuesses(next);
    setCurrent("");
    if (isWin(tiles)) {
      setStatus("won");
    } else if (next.length >= ALFAZY.maxGuesses) {
      setStatus("lost");
    }
  }

  function key(k: string) {
    if (status !== "playing") return;
    if (k === "enter") return submit();
    if (k === "back") return setCurrent((c) => c.slice(0, -1));
    if (current.length < ALFAZY.length && /^[a-z]$/.test(k)) setCurrent((c) => c + k);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") key("enter");
      else if (e.key === "Backspace") key("back");
      else if (/^[a-zA-Z]$/.test(e.key)) key(e.key.toLowerCase());
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1200);
  }

  const keyState: Record<string, Tile> = {};
  const rankMap: Record<Tile, number> = { correct: 3, present: 2, absent: 1 };
  guesses.forEach((g, r) =>
    g.split("").forEach((ch, i) => {
      const t = rows[r][i];
      if (!keyState[ch] || rankMap[t] > rankMap[keyState[ch]]) keyState[ch] = t;
    })
  );

  function share() {
    const head = `shubhamdatarkar.com/games · Alfazy #${puzzleNumber} ${status === "won" ? `${guesses.length}/6` : "X/6"}`;
    navigator.clipboard.writeText(`${head}\n${shareGrid(rows)}`);
    flash("Copied!");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <h1 className="font-display text-xl font-bold">Alfazy #{puzzleNumber}{isArchive && " (archive)"}</h1>
        <button
          onClick={() => setColorblind(!colorblind)}
          className="rounded-btn border border-border px-2 py-1 text-xs text-muted-foreground transition-ui hover:border-foreground hover:text-foreground"
          title={colorblind ? "Disable colourblind mode" : "Enable colourblind mode"}
        >
          {colorblind ? "Colors" : "A11y"}
        </button>
      </div>

      {/* grid */}
      <div className="grid grid-rows-6 gap-1.5">
        {Array.from({ length: ALFAZY.maxGuesses }).map((_, r) => {
          const g = r < guesses.length ? guesses[r] : r === guesses.length ? current : "";
          const isInput = r === guesses.length;
          const isNewest = r === guesses.length - 1;
          return (
            <div
              key={isInput ? `input-${shakeCount}` : `row-${r}`}
              className={`grid grid-cols-5 gap-1.5${isInput && shakeCount ? " animate-shake" : ""}`}
            >
              {Array.from({ length: ALFAZY.length }).map((_, c) => {
                const tile = r < guesses.length ? rows[r][c] : undefined;
                return (
                  <div
                    key={c}
                    className={`alfazy-tile flex h-12 w-12 items-center justify-center rounded-btn border-2 text-xl font-bold uppercase ${tile ? `alfazy-tile--${tile}` : "border-border"}${r < guesses.length && isNewest ? " animate-tile-flip" : ""}`}
                    style={r < guesses.length && isNewest ? { animationDelay: `${c * 0.08}s` } : undefined}
                  >
                    {g[c] ?? ""}
                    {colorblind && tile && (
                      <span className="alfazy-tile__icon" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {toast && <div className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">{toast}</div>}

      {status !== "playing" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">
            {status === "won" ? `Solved in ${guesses.length}!` : `Answer: ${answer.toUpperCase()}`}
          </p>
          <button onClick={share} className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Share
          </button>
          {!user && (
            <p className="text-sm text-muted-foreground">
              <Link href="/games/login?next=/games/alfazy" className="underline underline-offset-4 hover:text-foreground">
                Log in
              </Link>{" "}
              to save your streak.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {KEYS.map((row, i) => (
            <div key={i} className="flex gap-1.5">
              {i === 2 && <KeyBtn label="⏎" onClick={() => key("enter")} wide />}
              {row.split("").map((ch) => (
                <KeyBtn key={ch} label={ch} state={keyState[ch]} onClick={() => key(ch)} />
              ))}
              {i === 2 && <KeyBtn label="⌫" onClick={() => key("back")} wide />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyBtn({ label, onClick, state, wide }: { label: string; onClick: () => void; state?: Tile; wide?: boolean }) {
  const cls = state
    ? `alfazy-key--${state}`
    : "bg-secondary text-secondary-foreground";
  return (
    <button onClick={onClick} className={`alfazy-key h-12 rounded-btn font-semibold uppercase transition-ui ${cls} ${wide ? "px-3" : "w-8"}`}>
      {label}
    </button>
  );
}
