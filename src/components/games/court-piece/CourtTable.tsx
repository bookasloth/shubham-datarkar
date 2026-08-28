"use client";

import { useCallback, useEffect, useState } from "react";
import { legalPlays } from "@/lib/games/court-piece/trick";
import {
  getCourtView,
  joinCourtSeat,
  setCourtReady,
  addCourtBots,
  startCourtGame,
  playCourt,
  nextCourtDeal,
} from "@/lib/games/court-piece/server/actions";
import type { Card, Contract, PlayerView, RoomView, Suit } from "@/lib/games/court-piece/types";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { CourtCard, cardLabel } from "./CourtCard";

const SUIT: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const seatName = (i: number) => ["South", "West", "North", "East"][i];
const teamOf = (seat: number) => seat % 2;

type Result = { ok: true; view: RoomView } | { ok: false; reason: string };

export default function CourtTable({ code }: { code: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (p: Promise<Result>) => {
    setBusy(true);
    setError(null);
    const res = await p;
    if (res.ok) setView(res.view);
    else setError(res.reason);
    setBusy(false);
  }, []);

  useEffect(() => {
    getCourtView(code).then((res) => (res.ok ? setView(res.view) : setError(res.reason)));
  }, [code]);

  if (error) return <Shell><p className="text-[var(--danger)]">Error: {error}</p></Shell>;
  if (!view) return <Shell><p className="text-muted-foreground">Loading room {code}…</p></Shell>;

  if (view.status === "lobby") return <Lobby view={view} code={code} run={run} busy={busy} />;
  return <Table view={view} run={run} busy={busy} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <GameStage>
      <GameHeader title="Court Piece" />
      <div className="w-full max-w-xl">{children}</div>
    </GameStage>
  );
}

function Lobby({ view, code, run, busy }: { view: RoomView; code: string; run: (p: Promise<Result>) => void; busy: boolean }) {
  const seated = view.yourSeat >= 0;
  const filled = view.seats.every((s) => s.occupied);
  const allReady = view.seats.every((s) => !s.occupied || s.ready);
  return (
    <Shell>
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Invite code</p>
          <p className="font-display text-3xl tracking-[0.3em]">{code}</p>
          <p className="mt-1 text-xs text-muted-foreground">Share it — friends join and pick a seat.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {view.seats.map((s) => (
            <div key={s.seat} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{seatName(s.seat)}</span>
                <span className="text-xs text-muted-foreground">Team {teamOf(s.seat) + 1}</span>
              </div>
              <div className="mt-1 text-muted-foreground">
                {!s.occupied && "empty"}
                {s.occupied && s.isBot && "Bot"}
                {s.occupied && !s.isBot && (s.you ? "You" : "Player")}
                {s.occupied && s.ready && " · ready"}
              </div>
              {!s.occupied && !seated && (
                <button className={btn} disabled={busy} onClick={() => run(joinCourtSeat(code, s.seat))}>
                  Sit here
                </button>
              )}
            </div>
          ))}
        </div>

        {seated && (
          <div className="flex flex-wrap gap-2">
            <button className={btn} disabled={busy} onClick={() => run(setCourtReady(code, true))}>Ready</button>
            <button className={btn} disabled={busy || filled} onClick={() => run(addCourtBots(code))}>Fill with bots</button>
            <button
              className={btnPrimary}
              disabled={busy || !filled || !allReady}
              onClick={() => run(startCourtGame(code))}
            >
              Start game
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Table({ view, run, busy }: { view: RoomView; run: (p: Promise<Result>) => void; busy: boolean }) {
  const g = view.game;
  const code = view.code;
  if (!g) return <Shell><p>Waiting…</p></Shell>;

  const me = g.yourSeat;
  const myTurnPlay = g.phase === "playing" && g.turn === me;
  const legal = myTurnPlay ? legalPlays(g.yourHand, g.ledSuit) : [];
  const isLegal = (c: Card) => legal.some((l) => l.suit === c.suit && l.rank === c.rank);

  const swept6 =
    g.phase === "playing" &&
    g.trickWinners.length === 6 &&
    g.currentTrick.length === 0 &&
    g.trickWinners.every((t) => t === g.trickWinners[0]);
  const canCallCourt = swept6 && g.trickWinners[0] === teamOf(me);

  return (
    <Shell>
      <div className="space-y-5">
        {/* status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
          <span>Deal {g.dealNumber + 1}</span>
          <span>Trump: {g.trump ? SUIT[g.trump] : "—"}</span>
          <span>Contract: {g.contract} · declarer {seatName(g.declarer)}</span>
          <span className="font-medium">
            Team 1 {g.totals[0]} — {g.totals[1]} Team 2
          </span>
        </div>

        {/* seats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {view.seats.map((s) => {
            const badges = [
              s.seat === g.dealer && "dealer",
              s.seat === g.trumpCaller && "caller",
              phaseTurnSeat(g) === s.seat && "to act",
            ].filter(Boolean);
            return (
              <div key={s.seat} className={`rounded-md border p-2 ${phaseTurnSeat(g) === s.seat ? "border-foreground" : "border-border"}`}>
                <div className="flex justify-between">
                  <span className="font-medium">{seatName(s.seat)}{s.you ? " (you)" : ""}</span>
                  <span className="text-muted-foreground">{g.handCounts[s.seat]} cards</span>
                </div>
                <div className="text-muted-foreground">{badges.join(" · ") || " "}</div>
              </div>
            );
          })}
        </div>

        {/* current trick */}
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Current trick · team tricks {g.teamTricks[0]}–{g.teamTricks[1]}
            {g.courtCall ? " · COURT CALLED" : ""}
          </p>
          <div className="flex gap-4">
            {g.currentTrick.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
            {g.currentTrick.map((p) => (
              <div key={p.seat} className="text-center">
                <CourtCard card={p.card} size="sm" disabled />
                <div className="mt-1 text-[10px] text-muted-foreground">{seatName(p.seat)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* phase controls */}
        <PhaseControls g={g} me={me} busy={busy} code={code} run={run} canCallCourt={canCallCourt} />

        {/* your hand */}
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Your hand{myTurnPlay ? " — your turn" : ""}</p>
          <div className="flex flex-wrap gap-2">
            {g.yourHand.map((c) => (
              <CourtCard
                key={cardLabel(c)}
                card={c}
                dim={myTurnPlay && !isLegal(c)}
                disabled={busy || !myTurnPlay || !isLegal(c)}
                onClick={() => run(playCourt(code, { type: "PLAY_CARD", card: c }))}
              />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PhaseControls({
  g, me, busy, code, run, canCallCourt,
}: {
  g: PlayerView; me: number; busy: boolean; code: string;
  run: (p: Promise<Result>) => void; canCallCourt: boolean;
}) {
  if (g.phase === "trump_selection" && g.trumpCaller === me) {
    return (
      <Controls label="Call trump from your first five">
        {(["S", "H", "D", "C"] as Suit[]).map((s) => (
          <button key={s} className={btn} disabled={busy} onClick={() => run(playCourt(code, { type: "SELECT_TRUMP", suit: s }))}>
            {SUIT[s]}
          </button>
        ))}
      </Controls>
    );
  }
  if (g.phase === "auction" && g.auctionTurn === me) {
    const raises: Contract[] = ([6, 7, 8] as Contract[]).filter((c) => c > g.contract);
    return (
      <Controls label={`Auction — contract at ${g.contract}`}>
        {raises.map((c) => (
          <button key={c} className={btn} disabled={busy} onClick={() => run(playCourt(code, { type: "RAISE", call: c }))}>
            Raise {c}
          </button>
        ))}
        <button className={btn} disabled={busy} onClick={() => run(playCourt(code, { type: "PASS" }))}>Pass</button>
      </Controls>
    );
  }
  if (canCallCourt) {
    return (
      <Controls label="You swept the first six — call court?">
        <button className={btnPrimary} disabled={busy} onClick={() => run(playCourt(code, { type: "CALL_COURT" }))}>Call court (+52 / −52)</button>
      </Controls>
    );
  }
  if (g.phase === "deal_complete") {
    return (
      <Controls label="Deal complete">
        <button className={btnPrimary} disabled={busy} onClick={() => run(nextCourtDeal(code))}>Next deal</button>
      </Controls>
    );
  }
  if (g.phase === "match_complete") {
    return <p className="text-center font-display text-xl">Team {(g.matchWinner ?? 0) + 1} wins the match.</p>;
  }
  return null;
}

function Controls({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function phaseTurnSeat(g: PlayerView): number {
  if (g.phase === "trump_selection") return g.trumpCaller;
  if (g.phase === "auction") return g.auctionTurn;
  if (g.phase === "playing") return g.turn;
  return -1;
}

const btn = "rounded-md border border-border px-3 py-1.5 text-sm hover:border-foreground disabled:opacity-40 disabled:hover:border-border";
const btnPrimary = "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40";
