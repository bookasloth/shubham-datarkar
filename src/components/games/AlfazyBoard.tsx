"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ALFAZY, scoreGuess, isWin, isValidGuess, shareGrid, type Tile as TileState } from "@/lib/games/alfazy";
import { submitResult } from "@/lib/games/submit-result";
import { useGameAuth } from "@/components/games/use-game-auth";
import { useAlfazyTheme } from "@/components/games/AlfazyThemeProvider";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { FireStreak } from "@/components/games/shell/FireStreak";
import { Tile } from "@/components/games/board/Tile";
import { Keyboard, type KeyDef } from "@/components/games/board/Keyboard";
import { WinBurst } from "@/components/games/board/WinBurst";
import { triggerCls } from "@/components/games/modal-trigger";
import { GameHelpModal } from "@/components/games/shell/GameHelpModal";
import { GameStatsModal, type GameStats } from "@/components/games/shell/GameStatsModal";
import { GameSettingsModal } from "@/components/games/shell/GameSettingsModal";
import { GameWelcome } from "@/components/games/shell/GameWelcome";
import { GameEndCard } from "@/components/games/shell/GameEndCard";

const ALFAZY_ROWS: KeyDef[][] = [
  [..."qwertyuiop"].map((c) => ({ label: c, value: c })),
  [..."asdfghjkl"].map((c) => ({ label: c, value: c })),
  [
    { label: "⏎", value: "enter", wide: true },
    ...[..."zxcvbnm"].map((c) => ({ label: c, value: c })),
    { label: "⌫", value: "back", wide: true },
  ],
];

type Saved = { guesses: string[]; status: "playing" | "won" | "lost" };

export default function AlfazyBoard({
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
  const storageKey = `alfazy:${puzzleNumber}`;
  const { colorblind, setColorblind } = useAlfazyTheme();

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<Saved["status"]>("playing");
  const [toast, setToast] = useState("");
  const [shakeCount, setShakeCount] = useState(0);
  const [justWon, setJustWon] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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

  const rows: TileState[][] = guesses.map((g) => scoreGuess(g, answer));

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
      setJustWon(true);
      setTimeout(() => setJustWon(false), 1500);
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

  const keyState: Record<string, TileState> = {};
  const rankMap: Record<TileState, number> = { correct: 3, present: 2, absent: 1 };
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
    <GameStage>
      <GameHeader
        title={
          <span className="inline-flex items-center gap-2">
            Alfazy #{puzzleNumber}{isArchive && " (archive)"}
            <FireStreak
              count={stats?.currentStreak ?? 0}
              justWon={!isArchive && status === "won"}
            />
          </span>
        }
        actions={
          <>
            <button onClick={() => setHelpOpen(true)} className={triggerCls}>Help</button>
            <GameStatsModal stats={stats} authed={!!user} loginNext="/games/alfazy" />
            <GameSettingsModal game="alfazy" colorblind={colorblind} onColorblindChange={setColorblind} />
          </>
        }
      />

      <GameWelcome
        game="alfazy"
        greeting="Welcome to Alfazy"
        howto="Guess the hidden 5-letter word in six tries."
        onHowTo={() => setHelpOpen(true)}
      />

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
                const scored = r < guesses.length && isNewest;
                return (
                  <Tile
                    key={c}
                    game="alfazy"
                    state={tile}
                    char={g[c] ?? ""}
                    flip={scored}
                    flipDelay={c * 0.08}
                    colorblind={colorblind}
                  />
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
        <Keyboard game="alfazy" rows={ALFAZY_ROWS} keyStates={keyState} onKey={key} />
      )}

      {status !== "playing" && !user && (
        <GameEndCard
          slug="alfazy"
          status={status}
          resultLine={status === "won" ? `Solved in ${guesses.length}!` : `The word was ${answer.toUpperCase()}.`}
          onShare={share}
        />
      )}

      <GameHelpModal game="alfazy" open={helpOpen} onOpenChange={setHelpOpen} />
      {justWon && <WinBurst />}
    </GameStage>
  );
}
