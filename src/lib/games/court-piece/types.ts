// Court Piece — core value types. Pure data, no behaviour.
// See src/../memory/court-piece-variant-spec.md for the locked ruleset.

export type Suit = "S" | "H" | "D" | "C";

/** 11=J 12=Q 13=K 14=A. Ace high, six low — no 2..5 in this 36-card variant. */
export type Rank = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type Card = { suit: Suit; rank: Rank };

/** Seat index 0..3, clockwise around the table. Partners sit opposite (0&2, 1&3). */
export type Seat = 0 | 1 | 2 | 3;

/** Team id. Team of a seat = seat % 2. */
export type Team = 0 | 1;

/** One card played into a trick by one seat. plays[0] is the trick leader. */
export type Play = { seat: Seat; card: Card };

/** A declared contract level. 5 is the mandatory floor; 8 is the ceiling. */
export type Contract = 5 | 6 | 7 | 8;

/** Everything scoring needs about a finished deal.
 *  `tricks` = tricks won by [team0, team1] (sums to 9).
 *  `court` is set only if a team legally called court (having swept the first six). */
export type DealResult = {
  contract: Contract;
  declarerTeam: Team;
  tricks: [number, number];
  court: { callerTeam: Team } | null;
};

export type Phase = "trump_selection" | "auction" | "playing" | "deal_complete" | "match_complete";

/** An authoritative command applied to the game. Every one is logged (training/audit). */
export type Command =
  | { type: "SELECT_TRUMP"; seat: Seat; suit: Suit }
  | { type: "RAISE"; seat: Seat; call: Contract }
  | { type: "PASS"; seat: Seat }
  | { type: "PLAY_CARD"; seat: Seat; card: Card }
  | { type: "CALL_COURT"; seat: Seat };

/** Full authoritative state for one deal (+ match totals carried across deals).
 *  The SERVER holds this; clients only ever get sanitizeFor(state, theirSeat). */
export type GameState = {
  dealNumber: number;
  dealer: Seat;
  trumpCaller: Seat;
  hands: [Card[], Card[], Card[], Card[]];
  phase: Phase;
  trump: Suit | null;
  contract: Contract;
  declarer: Seat;
  auctionTurn: Seat;
  passes: number;
  turn: Seat;
  currentTrick: Play[];
  ledSuit: Suit | null;
  trickWinners: Team[];
  teamTricks: [number, number];
  /** The most recently completed trick — its four plays and winning seat. Drives
   *  the trick-sweep animation; null until the first trick resolves. */
  lastTrick: { plays: Play[]; winner: Seat } | null;
  courtCall: { callerTeam: Team } | null;
  totals: [number, number];
  lastDealerByTeam: [Seat, Seat];
  matchWinner: Team | null;
  version: number;
  log: Command[];
};

export type RoomStatus = "lobby" | "active" | "finished";

/** A seat in a room: a human, a bot, or empty (null). */
export type PlayerSlot = {
  userId: string | null; // null => bot
  isBot: boolean;
  ready: boolean;
  connected: boolean;
} | null;

/** A room wraps the authoritative GameState plus who sits where. Stored as one
 *  JSONB row (service-role only). `version` drives optimistic concurrency. */
export type RoomState = {
  code: string;
  status: RoomStatus;
  players: [PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot];
  game: GameState | null;
  /** Set when the sweeping team declines court this deal — lets bots resume past
   *  the court window. Reset each deal. */
  courtDeclined: boolean;
  version: number;
};

/** A command as a client sends it — WITHOUT a seat. The server fills in the seat
 *  from the authenticated user, so a client can never act as another seat. */
export type PlayerCommand =
  | { type: "SELECT_TRUMP"; suit: Suit }
  | { type: "RAISE"; call: Contract }
  | { type: "PASS" }
  | { type: "PLAY_CARD"; card: Card }
  | { type: "CALL_COURT" };

/** What the server hands back to a client: lobby info (no user ids leaked) plus,
 *  once playing, that seat's sanitized game view. Never the raw state. */
export type RoomView = {
  code: string;
  status: RoomStatus;
  version: number; // room version — clients poll and apply only newer views
  yourSeat: number; // -1 if not seated
  seats: { seat: Seat; occupied: boolean; isBot: boolean; ready: boolean; connected: boolean; you: boolean }[];
  game: PlayerView | null;
  /** True when it's the court window and the viewer is on the sweeping team. */
  canCallCourt: boolean;
};

/** What a single player is allowed to see — own hand only, others as counts. */
export type PlayerView = {
  dealNumber: number;
  dealer: Seat;
  trumpCaller: Seat;
  phase: Phase;
  trump: Suit | null;
  contract: Contract;
  declarer: Seat;
  auctionTurn: Seat;
  turn: Seat;
  currentTrick: Play[];
  ledSuit: Suit | null;
  trickWinners: Team[];
  teamTricks: [number, number];
  lastTrick: { plays: Play[]; winner: Seat } | null;
  courtCall: { callerTeam: Team } | null;
  totals: [number, number];
  matchWinner: Team | null;
  version: number;
  yourSeat: Seat;
  yourHand: Card[];
  handCounts: [number, number, number, number];
};
