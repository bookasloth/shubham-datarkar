export type ChallengeGame = "alfazy" | "hit_and_blow" | "integra";

export type Feedback =
  | { kind: "tiles"; tiles: ("correct" | "present" | "absent")[] }
  | { kind: "code"; hits: number; blows: number };

export type ChallengeAttemptState = {
  guesses: string[];
  feedback: Feedback[];
  status: "in_progress" | "won" | "lost";
};

export type ChallengeMeta = {
  code: string;
  game: ChallengeGame;
  title: string | null;
  status: "open" | "closed";
  expiresAt: string;
  crackCount: number;
  playCount: number;
};

/** profiles has no display name — username only. */
export type LeaderboardEntry = {
  username: string | null;
  status: string;
  guesses: number;
  timeMs: number | null;
};
