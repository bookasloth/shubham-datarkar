import { dealHands, isValidCard, shuffleDeck, SUITS } from "./deck";
import { isLegalPlay, trickWinner } from "./trick";
import { isLegalRaise } from "./auction";
import { calculateMatchScore, courtEligible, matchWinner, scoreDeal } from "./scoring";
import type { Card, Command, GameState, PlayerView, Seat, Suit, Team } from "./types";

const teamOf = (seat: Seat): Team => (seat % 2) as Team;
const next = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;

/** Next seat to bid, skipping the current declarer (who is already high). */
const nextBidder = (from: Seat, declarer: Seat): Seat => {
  const s = next(from);
  return s === declarer ? next(s) : s;
};

const sameCard = (a: Card, b: Card) => a.suit === b.suit && a.rank === b.rank;

export type StartDealInput = {
  dealNumber: number;
  dealer: Seat;
  /** SERVER-ONLY random seed — never sent to a client. */
  seed: number;
  totals: [number, number];
  lastDealerByTeam: [Seat, Seat];
};

/** Begin a deal: shuffle+deal (all 9; first 5 are hand[0..4]), trump caller = dealer's right. */
export function startDeal(input: StartDealInput): GameState {
  const trumpCaller = next(input.dealer);
  return {
    dealNumber: input.dealNumber,
    dealer: input.dealer,
    trumpCaller,
    hands: dealHands(shuffleDeck(input.seed)),
    phase: "trump_selection",
    trump: null,
    contract: 5,
    declarer: trumpCaller,
    auctionTurn: trumpCaller,
    passes: 0,
    turn: trumpCaller,
    currentTrick: [],
    ledSuit: null,
    trickWinners: [],
    teamTricks: [0, 0],
    lastTrick: null,
    courtCall: null,
    totals: [...input.totals] as [number, number],
    lastDealerByTeam: [...input.lastDealerByTeam] as [Seat, Seat],
    matchWinner: null,
    version: 0,
    log: [],
  };
}

/** Apply one authoritative command. Throws on any illegal move (wrong phase, wrong
 *  seat, illegal card/raise, out-of-window court). Returns the next state. */
export function applyCommand(state: GameState, command: Command): GameState {
  const s: GameState = {
    ...state,
    version: state.version + 1,
    log: [...state.log, command],
  };

  switch (command.type) {
    case "SELECT_TRUMP": {
      if (state.phase !== "trump_selection") throw new Error("not in trump selection");
      if (command.seat !== state.trumpCaller) throw new Error("only the trump caller may call trump");
      if (!SUITS.includes(command.suit)) throw new Error("invalid trump suit");
      s.trump = command.suit;
      s.phase = "auction";
      s.contract = 5;
      s.declarer = state.trumpCaller;
      s.passes = 0;
      s.auctionTurn = nextBidder(state.trumpCaller, state.trumpCaller);
      return s;
    }

    case "RAISE": {
      if (state.phase !== "auction") throw new Error("not in auction");
      if (command.seat !== state.auctionTurn) throw new Error("not your turn to bid");
      if (!isLegalRaise(command.call, state.contract)) throw new Error("illegal raise");
      s.contract = command.call;
      s.declarer = command.seat;
      s.passes = 0;
      s.auctionTurn = nextBidder(command.seat, command.seat);
      return s;
    }

    case "PASS": {
      if (state.phase !== "auction") throw new Error("not in auction");
      if (command.seat !== state.auctionTurn) throw new Error("not your turn to bid");
      s.passes = state.passes + 1;
      if (s.passes >= 3) {
        // all three non-declarers passed — auction closes, play begins
        s.phase = "playing";
        s.turn = state.trumpCaller; // first lead is always the dealer's right
        s.currentTrick = [];
        s.ledSuit = null;
      } else {
        s.auctionTurn = nextBidder(command.seat, state.declarer);
      }
      return s;
    }

    case "PLAY_CARD": {
      if (state.phase !== "playing") throw new Error("not in play");
      if (command.seat !== state.turn) throw new Error("not your turn");
      if (!isValidCard(command.card)) throw new Error("malformed card");
      if (!isLegalPlay(command.card, state.hands[command.seat], state.ledSuit)) {
        throw new Error("illegal card");
      }
      s.hands = state.hands.map((h, i) =>
        i === command.seat ? h.filter((c) => !sameCard(c, command.card)) : h,
      ) as GameState["hands"];
      const trick = [...state.currentTrick, { seat: command.seat, card: command.card }];

      if (trick.length < 4) {
        s.currentTrick = trick;
        s.ledSuit = state.ledSuit ?? command.card.suit;
        s.turn = next(command.seat);
        return s;
      }

      // trick complete
      const winner = trickWinner(trick, state.trump!);
      const wt = teamOf(winner);
      s.teamTricks = [...state.teamTricks] as [number, number];
      s.teamTricks[wt] += 1;
      s.trickWinners = [...state.trickWinners, wt];
      s.lastTrick = { plays: trick, winner };
      s.currentTrick = [];
      s.ledSuit = null;
      s.turn = winner;

      if (s.trickWinners.length === 9) {
        const deltas = scoreDeal({
          contract: state.contract,
          declarerTeam: teamOf(state.declarer),
          tricks: s.teamTricks,
          court: state.courtCall,
        });
        s.totals = calculateMatchScore(state.totals, deltas);
        s.matchWinner = matchWinner(s.totals);
        s.phase = s.matchWinner != null ? "match_complete" : "deal_complete";
      }
      return s;
    }

    case "CALL_COURT": {
      if (state.phase !== "playing") throw new Error("not in play");
      if (state.currentTrick.length !== 0 || state.trickWinners.length !== 6) {
        throw new Error("court can only be called at the last-three point (after six tricks)");
      }
      if (state.courtCall) throw new Error("court already called");
      const team = teamOf(command.seat);
      if (!courtEligible(state.trickWinners, team)) {
        throw new Error("court needs all first six tricks won by your team");
      }
      s.courtCall = { callerTeam: team };
      return s;
    }

    default:
      throw new Error(`unknown command: ${(command as { type?: string }).type}`);
  }
}

/** The slice of state a given seat is allowed to see. Hides every other hand,
 *  the deck, and internal bookkeeping — the anti-cheat boundary. During trump
 *  selection only the first 5 cards are revealed; the undealt 4 stay hidden until
 *  the auction opens, so no one can peek before the reveal. */
export function sanitizeFor(state: GameState, viewer: Seat): PlayerView {
  const preReveal = state.phase === "trump_selection";
  return {
    dealNumber: state.dealNumber,
    dealer: state.dealer,
    trumpCaller: state.trumpCaller,
    phase: state.phase,
    trump: state.trump,
    contract: state.contract,
    declarer: state.declarer,
    auctionTurn: state.auctionTurn,
    turn: state.turn,
    currentTrick: state.currentTrick,
    ledSuit: state.ledSuit,
    trickWinners: state.trickWinners,
    teamTricks: state.teamTricks,
    lastTrick: state.lastTrick,
    courtCall: state.courtCall,
    totals: state.totals,
    matchWinner: state.matchWinner,
    version: state.version,
    yourSeat: viewer,
    yourHand: preReveal ? state.hands[viewer].slice(0, 5) : state.hands[viewer],
    handCounts: state.hands.map((h) => (preReveal ? 5 : h.length)) as [
      number,
      number,
      number,
      number,
    ],
  };
}
