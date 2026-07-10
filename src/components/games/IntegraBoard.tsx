"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { INTEGRA, scoreGuess, isWin, isValidGuess, shareGrid, type Tile } from "@/lib/games/integra";
import { submitResult } from "@/lib/games/submit-result";
import { useGameAuth } from "@/components/games/use-game-auth";
import IntegraHelpModal from "./IntegraHelpModal";
import IntegraStatsModal, { type IntegraStats } from "./IntegraStatsModal";
import IntegraSettingsModal from "./IntegraSettingsModal";

const DIGITS = "0123456789".split("");
const OPS = ["+", "-", "*", "/", "="];
const ALLOWED = new Set([...DIGITS, ...OPS]);
/** Data stays "*"/"/"; tiles + keys render the friendlier math symbols. */
const DISPLAY: Record<string, string> = { "*": "×", "/": "÷" };
const show = (ch: string) => DISPLAY[ch] ?? ch;

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
  stats: IntegraStats | null;
}) {
  const storageKey = `integra:${puzzleNumber}`;

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const [justWon, setJustWon] = useState(false);
  const [colorblind, setColorblind] = useState(false);
  const { user } = useGameAuth();
  const submitted = useRef(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (raw) {
      const s: Saved = JSON.parse(raw);
      setGuesses(s.guesses);
      setStatus(s.status);
    }
    if (typeof window !== "undefined") setColorblind(localStorage.getItem("integra:colorblind") === "1");
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
    void submitResult({ game: "integra", puzzleNumber, status, guesses, timeMs: null });
  }, [isArchive, status, user, guesses, puzzleNumber]);

  const rows: Tile[][] = guesses.map((g) => scoreGuess(g, answer));

  function setColorblindPref(v: boolean) {
    setColorblind(v);
    localStorage.setItem("integra:colorblind", v ? "1" : "0");
  }

  function submit() {
    if (status !== "playing") return;
    if (current.length !== INTEGRA.length) { setShakeCount((n) => n + 1); return flash(`Fill all ${INTEGRA.length} tiles`); }
    if (!isValidGuess(current)) { setShakeCount((n) => n + 1); return flash("Not a valid equation"); }
    const next = [...guesses, current];
    const tiles = scoreGuess(current, answer);
    setGuesses(next);
    setCurrent("");
    if (isWin(tiles)) {
      setStatus("won");
      setJustWon(true);
      setTimeout(() => setJustWon(false), 1500);
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

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 1400);
  }

  const keyState: Record<string, Tile> = {};
  const rankMap: Record<Tile, number> = { correct: 3, present: 2, absent: 1 };
  guesses.forEach((g, r) =>
    g.split("").forEach((ch, i) => {
      const t = rows[r][i];
      if (!keyState[ch] || rankMap[t] > rankMap[keyState[ch]]) keyState[ch] = t;
    }),
  );

  function share() {
    const head = `shubhamdatarkar.com/games · Integra #${puzzleNumber} ${status === "won" ? `${guesses.length}/6` : "X/6"}`;
    navigator.clipboard.writeText(`${head}\n${shareGrid(rows)}`);
    flash("Copied!");
  }

  return (
    <div className={`flex flex-col items-center gap-4${colorblind ? " integra-cb" : ""}`}>
      <div className="flex w-full items-center justify-between">
        <h1 className="font-display text-xl font-bold">Integra #{puzzleNumber}{isArchive && " (archive)"}</h1>
        <div className="flex gap-1">
          <IntegraHelpModal />
          <IntegraStatsModal stats={stats} authed={!!user} />
          <IntegraSettingsModal colorblind={colorblind} onColorblindChange={setColorblindPref} />
        </div>
      </div>

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
                  <div
                    key={c}
                    className={`integra-tile flex aspect-square items-center justify-center rounded-btn border-2 text-lg font-bold ${tile ? `integra-tile--${tile}` : "border-border"}${r < guesses.length && isNewest && !justWon ? " animate-tile-flip" : ""}`}
                    style={r < guesses.length && isNewest && !justWon ? { animationDelay: `${c * 0.08}s` } : undefined}
                  >
                    {g[c] ? show(g[c]) : ""}
                    {colorblind && tile && <span className="integra-tile__icon" aria-hidden="true" />}
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
            {status === "won" ? `Solved in ${guesses.length}!` : `Answer: ${answer.split("").map(show).join("")}`}
          </p>
          <button onClick={share} className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Share
          </button>
          {!user && (
            <p className="text-sm text-muted-foreground">
              <Link href="/games/login?next=/games/integra" className="underline underline-offset-4 hover:text-foreground">
                Log in
              </Link>{" "}
              to save your streak.
            </p>
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-[22rem] flex-col gap-1.5">
          <div className="grid grid-cols-10 gap-1">
            {DIGITS.map((ch) => (
              <KeyBtn key={ch} label={show(ch)} state={keyState[ch]} onClick={() => key(ch)} />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            <KeyBtn label="⏎" onClick={() => key("enter")} />
            {OPS.map((ch) => (
              <KeyBtn key={ch} label={show(ch)} state={keyState[ch]} onClick={() => key(ch)} />
            ))}
            <KeyBtn label="⌫" onClick={() => key("back")} />
          </div>
        </div>
      )}

      {justWon && <Confetti />}
    </div>
  );
}

function KeyBtn({ label, onClick, state }: { label: string; onClick: () => void; state?: Tile }) {
  const cls = state ? `integra-key--${state}` : "bg-secondary text-secondary-foreground";
  return (
    <button onClick={onClick} className={`integra-key h-12 rounded-btn text-base font-semibold transition-ui ${cls}`}>
      {label}
    </button>
  );
}

/** Lightweight win celebration — a burst of pieces, no extra dependency. */
function Confetti() {
  const colors = ["#16a34a", "#7c3aed", "#ff4800", "var(--foreground)"];
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    x: (i / 28) * 320 - 160 + ((i * 37) % 40) - 20,
    delay: (i % 7) * 0.03,
    color: colors[i % colors.length],
    rot: ((i * 53) % 360),
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-center overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-1/3 h-2 w-2 rounded-[1px]"
          style={{ background: p.color }}
          initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
          animate={{ opacity: 0, y: 360, x: p.x, rotate: p.rot }}
          transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
