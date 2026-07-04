"use client";

import { useEffect, useMemo, useState } from "react";
import { ALFAZY, answerFor, scoreGuess, isWin, isValidGuess, shareGrid, type Tile } from "@/lib/games/alfazy";

const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

type Saved = { guesses: string[]; status: "playing" | "won" | "lost" };

export default function AlfazyBoard({ puzzleNumber, isArchive }: { puzzleNumber: number; isArchive: boolean }) {
  const answer = useMemo(() => answerFor(puzzleNumber), [puzzleNumber]);
  const storageKey = `alfazy:${puzzleNumber}`;

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");

  // load saved state
  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (raw) {
      const s: Saved = JSON.parse(raw);
      setGuesses(s.guesses);
      setStatus(s.status);
    }
  }, [storageKey]);

  // persist
  useEffect(() => {
    if (guesses.length || status !== "playing")
      localStorage.setItem(storageKey, JSON.stringify({ guesses, status }));
  }, [guesses, status, storageKey]);

  const rows: Tile[][] = guesses.map((g) => scoreGuess(g, answer));

  function submit() {
    if (status !== "playing") return;
    if (current.length !== ALFAZY.length) return flash("Not enough letters");
    if (!isValidGuess(current)) return flash("Letters only");
    const next = [...guesses, current];
    const tiles = scoreGuess(current, answer);
    setGuesses(next);
    setCurrent("");
    if (isWin(tiles)) {
      setStatus("won");
      // Phase 2: submitResult server action -> supabase.rpc('submit_result', ...)
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

  // physical keyboard
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

  // best state per key for keyboard colouring
  const keyState: Record<string, Tile> = {};
  const rank: Record<Tile, number> = { correct: 3, present: 2, absent: 1 };
  guesses.forEach((g, r) =>
    g.split("").forEach((ch, i) => {
      const t = rows[r][i];
      if (!keyState[ch] || rank[t] > rank[keyState[ch]]) keyState[ch] = t;
    })
  );

  const tileColor = (t?: Tile) =>
    t === "correct" ? "bg-green-500 text-white border-green-500"
      : t === "present" ? "bg-yellow-500 text-white border-yellow-500"
      : t === "absent" ? "bg-neutral-400 text-white border-neutral-400"
      : "border-neutral-300";

  function share() {
    const head = `shubhamdatarkar.com/games · Alfazy #${puzzleNumber} ${status === "won" ? `${guesses.length}/6` : "X/6"}`;
    navigator.clipboard.writeText(`${head}\n${shareGrid(rows)}`);
    flash("Copied!");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-xl font-bold">Alfazy #{puzzleNumber}{isArchive && " (archive)"}</h1>

      {/* grid */}
      <div className="grid grid-rows-6 gap-1.5">
        {Array.from({ length: ALFAZY.maxGuesses }).map((_, r) => {
          const g = r < guesses.length ? guesses[r] : r === guesses.length ? current : "";
          return (
            <div key={r} className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: ALFAZY.length }).map((_, c) => (
                <div
                  key={c}
                  className={`flex h-12 w-12 items-center justify-center rounded border-2 text-xl font-bold uppercase ${r < guesses.length ? tileColor(rows[r][c]) : "border-neutral-300"}`}
                >
                  {g[c] ?? ""}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {toast && <div className="rounded bg-black px-3 py-1 text-sm text-white">{toast}</div>}

      {status !== "playing" ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">
            {status === "won" ? `Solved in ${guesses.length}!` : `Answer: ${answer.toUpperCase()}`}
          </p>
          <button onClick={share} className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white">
            Share
          </button>
        </div>
      ) : (
        /* on-screen keyboard */
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
  const bg =
    state === "correct" ? "bg-green-500 text-white"
      : state === "present" ? "bg-yellow-500 text-white"
      : state === "absent" ? "bg-neutral-400 text-white"
      : "bg-neutral-200";
  return (
    <button onClick={onClick} className={`h-12 rounded font-semibold uppercase ${bg} ${wide ? "px-3" : "w-8"}`}>
      {label}
    </button>
  );
}
