"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { legalPlays } from "@/lib/games/court-piece/trick";
import { screenSeat, seatsAround, type ScreenPos } from "@/lib/games/court-piece/table-layout";
import { sortHand, shouldPlayCard } from "@/lib/games/court-piece/table-interactions";
import {
  getCourtView,
  joinCourtSeat,
  setCourtReady,
  addCourtBots,
  startCourtGame,
  playCourt,
  declineCourtCall,
  nextCourtDeal,
} from "@/lib/games/court-piece/server/actions";
import type { Card, Contract, Play, PlayerView, RoomView, Seat, Suit } from "@/lib/games/court-piece/types";
import { GameStage } from "@/components/games/shell/GameStage";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { CourtCard, cardLabel } from "./CourtCard";

const SUIT: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const isRed = (s: Suit) => s === "H" || s === "D";
const teamOf = (seat: number) => seat % 2;

type Result = { ok: true; view: RoomView } | { ok: false; reason: string };

export default function CourtTable({ code }: { code: string }) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finishedRef = useRef(false);

  const applyView = useCallback((v: RoomView) => {
    finishedRef.current = v.status === "finished";
    setView((cur) => (!cur || v.version >= cur.version ? v : cur));
  }, []);

  const run = useCallback(
    async (p: Promise<Result>) => {
      setBusy(true);
      setError(null);
      const res = await p;
      if (res.ok) applyView(res.view);
      else setError(res.reason);
      setBusy(false);
    },
    [applyView],
  );

  // Poll for other players'/bots' moves (~1.5s). Reconnect is automatic; stops at end.
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (finishedRef.current) return;
      getCourtView(code).then((res) => {
        if (!alive) return;
        if (res.ok) applyView(res.view);
        else setError(res.reason);
      });
    };
    load();
    const id = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, applyView]);

  let body: React.ReactNode;
  if (error) body = <p className="text-[var(--danger)]">Error: {error}</p>;
  else if (!view) body = <p className="text-muted-foreground">Loading room {code}…</p>;
  else if (view.status === "lobby") return <Lobby view={view} code={code} run={run} busy={busy} />;
  else return <Table view={view} run={run} busy={busy} />;

  return (
    <div data-game="court-piece">
      <GameStage>
        <GameHeader title="Court Piece" />
        <div className="w-full max-w-xl">{body}</div>
      </GameStage>
    </div>
  );
}

/* ------------------------------- lobby ------------------------------- */

function Lobby({ view, code, run, busy }: { view: RoomView; code: string; run: (p: Promise<Result>) => void; busy: boolean }) {
  const seated = view.yourSeat >= 0;
  const filled = view.seats.every((s) => s.occupied);
  const allReady = view.seats.every((s) => !s.occupied || s.ready);
  return (
    <div data-game="court-piece">
      <GameStage>
        <GameHeader title="Court Piece" />
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Invite code</p>
            <p className="font-display text-3xl font-extrabold tracking-[0.3em] text-brand">{code}</p>
            <p className="mt-1 text-xs text-muted-foreground">Share it — friends join and pick a seat.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {view.seats.map((s) => (
              <div key={s.seat} className="rounded-xl border border-border bg-card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Seat {s.seat + 1}</span>
                  <span className="text-xs text-muted-foreground">Team {teamOf(s.seat) + 1}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground">
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
              <button className={btnPrimary} disabled={busy || !filled || !allReady} onClick={() => run(startCourtGame(code))}>
                Start game
              </button>
            </div>
          )}
        </div>
      </GameStage>
    </div>
  );
}

/* ------------------------------- table ------------------------------- */

function Table({ view, run, busy }: { view: RoomView; run: (p: Promise<Result>) => void; busy: boolean }) {
  const g = view.game;

  // trick-sweep: when a trick completes, briefly replay it sweeping to the winner
  const [sweep, setSweep] = useState<{ plays: Play[]; winner: Seat; n: number } | null>(null);
  const prevTricks = useRef(0);
  useEffect(() => {
    if (!g) return;
    const done = g.trickWinners.length;
    if (done > prevTricks.current && g.lastTrick) {
      setSweep({ ...g.lastTrick, n: done });
      const t = setTimeout(() => setSweep((s) => (s?.n === done ? null : s)), 620);
      prevTricks.current = done;
      return () => clearTimeout(t);
    }
    prevTricks.current = done;
  }, [g]);

  // court flash when a court is called
  const [flash, setFlash] = useState(false);
  const hadCourt = useRef(false);
  useEffect(() => {
    const on = !!g?.courtCall;
    if (on && !hadCourt.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1700);
      hadCourt.current = true;
      return () => clearTimeout(t);
    }
    if (!on) hadCourt.current = false;
  }, [g]);

  const reduce = useReducedMotion();
  const zoneRef = useRef<HTMLDivElement>(null);

  // 1s tick so the active seat's turn countdown updates live between polls
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!g) return null;
  const me = g.yourSeat;
  const around = seatsAround(me);
  const myTeam = teamOf(me);
  const myTurnPlay = g.phase === "playing" && g.turn === me;
  const legal = myTurnPlay ? legalPlays(g.yourHand, g.ledSuit) : [];
  const isLegal = (c: Card) => legal.some((l) => l.suit === c.suit && l.rank === c.rank);
  const actor = phaseTurnSeat(g);

  // Drag/flick release → commit a play if dropped over the table, dragged far up,
  // or flicked up fast. Otherwise the card springs home (dragSnapToOrigin).
  const endDrag = (card: Card, info: PanInfo) => {
    const z = zoneRef.current?.getBoundingClientRect();
    const overZone =
      !!z && info.point.x >= z.left && info.point.x <= z.right && info.point.y >= z.top && info.point.y <= z.bottom;
    if (shouldPlayCard({ offsetY: info.offset.y, velocityY: info.velocity.y, overZone })) {
      run(playCourt(view.code, { type: "PLAY_CARD", card }));
    }
  };

  const seatCell = (pos: Exclude<ScreenPos, "S">) => {
    const seat = around[pos];
    const info = view.seats[seat];
    return (
      <SeatToken
        pos={pos}
        seat={seat}
        g={g}
        active={actor === seat}
        you={info?.you}
        isBot={info?.isBot}
        name={info?.name}
        deadline={view.turnDeadline}
        nowMs={nowMs}
      />
    );
  };

  return (
    <div data-game="court-piece">
      <GameStage>
        <GameHeader title="Court Piece" />
        <div className="w-full max-w-xl space-y-4">
          {/* status bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px]">
            <span className="text-muted-foreground">Deal <b className="font-display text-foreground">{g.dealNumber + 1}</b></span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">Trump</span>
              {g.trump ? (
                <span className={`font-display text-base font-bold ${isRed(g.trump) ? "text-[var(--danger)]" : "text-foreground"}`}>{SUIT[g.trump]}</span>
              ) : <span className="text-muted-foreground">—</span>}
            </span>
            <span className="text-muted-foreground">Call <b className="font-display text-foreground">{g.contract}</b></span>
            <span className="font-display font-bold tabular-nums">
              You <span className="text-brand">{g.totals[myTeam]}</span> — {g.totals[myTeam === 0 ? 1 : 0]} Them
            </span>
          </div>

          {/* felt */}
          <div className="cp-felt grid min-h-[300px] grid-cols-[1fr_1.5fr_1fr] grid-rows-[auto_1fr_auto] gap-2 rounded-2xl border border-border p-3">
            <div className="col-start-2 row-start-1 justify-self-center">{seatCell("N")}</div>
            <div className="col-start-1 row-start-2 self-center">{seatCell("W")}</div>
            <div className="col-start-3 row-start-2 self-center justify-self-end">{seatCell("E")}</div>
            <div className="col-start-2 row-start-2 grid place-items-center">
              <TrickZone g={g} me={me} sweep={sweep} flash={flash} zoneRef={zoneRef} />
            </div>
            <div className="col-start-2 row-start-3 justify-self-center">
              <SeatToken pos="S" seat={me} g={g} active={actor === me} you compact name={view.seats[me]?.name} deadline={view.turnDeadline} nowMs={nowMs} />
            </div>
          </div>

          {/* your hand — auto-sorted ♠♥♣♦ 6→A; drag/flick up to play, or tap */}
          <div>
            <p className="mb-1.5 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
              Your hand{myTurnPlay ? <b className="text-brand"> · drag up to play</b> : ""}
            </p>
            <MotionConfig reducedMotion="user">
              <div className="flex flex-wrap justify-center gap-1.5">
                {sortHand(g.yourHand).map((c, i) => {
                  const playable = myTurnPlay && isLegal(c);
                  return (
                    <motion.div
                      key={cardLabel(c)}
                      layout
                      drag={playable}
                      dragSnapToOrigin
                      whileHover={playable ? { y: -12 } : undefined}
                      whileDrag={{ scale: 1.06, zIndex: 50 }}
                      onDragEnd={(_, info) => endDrag(c, info)}
                      onClick={() => playable && run(playCourt(view.code, { type: "PLAY_CARD", card: c }))}
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 460, damping: 34, delay: reduce ? 0 : i * 0.04 }}
                      className={playable ? "relative cursor-grab touch-none active:cursor-grabbing" : "relative"}
                    >
                      <CourtCard card={c} dim={myTurnPlay && !isLegal(c)} />
                    </motion.div>
                  );
                })}
              </div>
            </MotionConfig>
          </div>

          <PhaseControls g={g} me={me} busy={busy} code={view.code} run={run} canCallCourt={view.canCallCourt} />
        </div>
      </GameStage>
    </div>
  );
}

function SeatToken({
  pos, seat, g, active, you, isBot, compact, name, deadline, nowMs,
}: {
  pos: ScreenPos; seat: number; g: PlayerView; active: boolean; you?: boolean; isBot?: boolean;
  compact?: boolean; name?: string; deadline?: number | null; nowMs?: number;
}) {
  const label = name || (pos === "S" ? "You" : pos === "N" ? "Partner" : isBot ? "Bot" : "Opponent");
  const badges = [
    seat === g.dealer && ["D", "d"],
    seat === g.trumpCaller && ["T", "c"],
  ].filter(Boolean) as [string, string][];
  const remain = active && deadline ? Math.max(0, Math.ceil((deadline - (nowMs ?? Date.now())) / 1000)) : null;
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className={`grid size-11 place-items-center rounded-xl border bg-card font-display font-bold text-muted-foreground shadow-sm ${active ? "cp-pulse border-brand" : "border-border"}`}>
        {(label[0] || "?").toUpperCase()}
      </div>
      <div className="max-w-[72px] truncate text-[11px] font-medium leading-tight" title={label}>
        {label}{you ? " (you)" : ""}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {pos === "S" ? `Team ${teamOf(seat) + 1}` : `${g.handCounts[seat]}`}
        {badges.map(([t, k]) => (
          <span key={k} className={k === "d" ? "rounded-full border border-border bg-secondary px-1.5 py-px font-bold text-foreground" : "rounded-full border border-dashed border-brand px-1.5 py-px font-bold text-brand"}>{t}</span>
        ))}
        {active && remain !== null && (
          <span className={`rounded-full px-1.5 py-px font-bold tabular-nums ${remain <= 10 ? "bg-brand text-brand-foreground" : "bg-secondary text-foreground"}`}>{remain}s</span>
        )}
        {active && remain === null && <span className="rounded-full bg-brand px-1.5 py-px font-bold text-brand-foreground">◆</span>}
      </div>
    </div>
  );
}

function TrickZone({ g, me, sweep, flash, zoneRef }: { g: PlayerView; me: number; sweep: { plays: Play[]; winner: Seat } | null; flash: boolean; zoneRef: React.RefObject<HTMLDivElement | null> }) {
  const offset: Record<ScreenPos, string> = {
    S: "left-1/2 top-full -translate-x-1/2 -translate-y-[85%]",
    N: "left-1/2 top-0 -translate-x-1/2 -translate-y-[15%]",
    W: "left-0 top-1/2 -translate-x-[10%] -translate-y-1/2",
    E: "right-0 top-1/2 translate-x-[10%] -translate-y-1/2",
  };
  const shown = sweep ? sweep.plays : g.currentTrick;
  const sweeping = !!sweep;
  return (
    <div ref={zoneRef} className="relative h-32 w-40">
      {shown.length === 0 && !flash && (
        <div className="grid h-full place-items-center text-[11px] uppercase tracking-wider text-muted-foreground">trick</div>
      )}
      {shown.map((p) => {
        const pos = screenSeat(p.seat as Seat, me as Seat);
        return (
          <div key={`${p.seat}-${cardLabel(p.card)}`} className={`absolute ${offset[pos]} ${sweeping ? "cp-sweep" : "cp-play"}`}>
            <CourtCard card={p.card} size="sm" />
          </div>
        );
      })}
      {flash && (
        <div className="cp-court pointer-events-none absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-extrabold text-brand drop-shadow">COURT · +52</span>
        </div>
      )}
    </div>
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
          <button key={s} className={`${btn} text-lg ${isRed(s) ? "text-[var(--danger)]" : ""}`} disabled={busy} onClick={() => run(playCourt(code, { type: "SELECT_TRUMP", suit: s }))}>
            {SUIT[s]}
          </button>
        ))}
      </Controls>
    );
  }
  if (g.phase === "auction" && g.auctionTurn === me) {
    const raises = ([6, 7, 8] as Contract[]).filter((c) => c > g.contract);
    return (
      <Controls label={`Auction — contract at ${g.contract}`}>
        {raises.map((c) => (
          <button key={c} className={btn} disabled={busy} onClick={() => run(playCourt(code, { type: "RAISE", call: c }))}>Raise {c}</button>
        ))}
        <button className={btn} disabled={busy} onClick={() => run(playCourt(code, { type: "PASS" }))}>Pass</button>
      </Controls>
    );
  }
  if (canCallCourt) {
    return (
      <Controls label="You swept the first six — call court?">
        <button className={btnPrimary} disabled={busy} onClick={() => run(playCourt(code, { type: "CALL_COURT" }))}>Call court · +52 / −52</button>
        <button className={btn} disabled={busy} onClick={() => run(declineCourtCall(code))}>Decline, play on</button>
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
    return <p className="text-center font-display text-xl font-bold">Team {(g.matchWinner ?? 0) + 1} wins the match.</p>;
  }
  return <div className="min-h-[2px]" />;
}

function Controls({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

function phaseTurnSeat(g: PlayerView): number {
  if (g.phase === "trump_selection") return g.trumpCaller;
  if (g.phase === "auction") return g.auctionTurn;
  if (g.phase === "playing") return g.turn;
  return -1;
}

const btn = "rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:border-foreground disabled:opacity-40 disabled:hover:border-border";
const btnPrimary = "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-40";
