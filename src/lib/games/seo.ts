/**
 * SEO copy per game — each positioned against the well-known game it's kin to
 * (Wordle, Bulls and Cows, Nerdle) so the pages can rank for "wordle
 * alternative / bulls and cows game / nerdle-like" intent and answer engines
 * place them in the right cluster. Consumed by each game page's metadata,
 * VideoGame schema (sameAs), and the About/FAQ footer.
 */
export type GameSeo = {
  title: string;
  description: string;
  genre: string;
  /** Wikipedia (or canonical) URL of the analog game → schema `sameAs`. */
  sameAs: string[];
  about: string[];
  faq: { question: string; answer: string }[];
};

export const gameSeo: Record<string, GameSeo> = {
  alfazy: {
    title: "Alfazy — Daily Word Game (like Wordle)",
    description:
      "Alfazy is a free daily word game — guess the 5-letter word in six tries. A Wordle-style puzzle with streaks, archives, and a daily reset. Play free, no signup.",
    genre: "Word puzzle",
    sameAs: ["https://en.wikipedia.org/wiki/Wordle"],
    about: [
      "Alfazy is a free daily word game: guess the hidden 5-letter word in six tries, with colour clues after each guess. If you love Wordle, Alfazy is the same satisfying loop — one fresh puzzle a day — with streaks, an archive of past puzzles, and a leaderboard.",
      "It's one of the daily games built for the Kalamwala community of marketers, founders, and developers — a two-minute break that rewards a sharp vocabulary.",
    ],
    faq: [
      { question: "Is Alfazy like Wordle?", answer: "Yes — Alfazy is a Wordle-style daily word game. You guess a hidden 5-letter word in six tries and get colour clues after each guess. It adds streaks, a puzzle archive, and a leaderboard." },
      { question: "Is Alfazy free?", answer: "Yes, completely free and playable in the browser. Sign in if you want to save streaks and appear on the leaderboard." },
      { question: "How often is there a new puzzle?", answer: "A new Alfazy puzzle drops every day, with a shared daily reset. You can also play past puzzles from the archive." },
    ],
  },
  "hit-and-blow": {
    title: "Hit and Blow — Daily Code Game (Bulls and Cows)",
    description:
      "Hit and Blow is a free daily code-breaking game — crack the 4-digit code with logic. The classic Bulls and Cows / Mastermind idea, one new puzzle a day. Play free.",
    genre: "Logic puzzle",
    sameAs: ["https://en.wikipedia.org/wiki/Bulls_and_Cows"],
    about: [
      "Hit and Blow is a free daily code-breaking puzzle: deduce the hidden 4-digit code using \"hit\" (right digit, right place) and \"blow\" (right digit, wrong place) clues. It's the classic Bulls and Cows game — the pen-and-paper ancestor of Mastermind — as a clean daily puzzle with streaks and a leaderboard.",
      "One of the daily games made for the Kalamwala community of marketers, founders, and developers — pure deductive logic in a couple of minutes.",
    ],
    faq: [
      { question: "Is Hit and Blow the same as Bulls and Cows?", answer: "Yes — Hit and Blow is the classic Bulls and Cows game (also known as the logic behind Mastermind). You crack a hidden code using 'hit' and 'blow' clues; here it's a daily puzzle with streaks and a leaderboard." },
      { question: "What do 'hit' and 'blow' mean?", answer: "A 'hit' is a correct digit in the correct position. A 'blow' is a correct digit in the wrong position. You use those clues each turn to deduce the full 4-digit code." },
      { question: "Is it free?", answer: "Yes — free to play in the browser, with a new code every day. Sign in to keep streaks and join the leaderboard." },
    ],
  },
  integra: {
    title: "Integra — Daily Math Game (like Nerdle)",
    description:
      "Integra is a free daily math game — guess the hidden equation in six tries. A Nerdle-style number puzzle with colour clues, streaks, and a daily reset. Play free.",
    genre: "Math puzzle",
    sameAs: ["https://en.wikipedia.org/wiki/Nerdle"],
    about: [
      "Integra is a free daily math puzzle: guess the hidden equation in six tries, with colour clues showing which numbers and operators are right and in the right place. If Wordle had a numbers cousin, this is it — the same daily loop as Nerdle, with streaks, an archive, and a leaderboard.",
      "Part of the daily games built for the Kalamwala community of marketers, founders, and developers — a quick hit of arithmetic logic each day.",
    ],
    faq: [
      { question: "Is Integra like Nerdle?", answer: "Yes — Integra is a Nerdle-style daily math game. You guess a hidden equation in six tries and get colour clues for each number and operator. It adds streaks, an archive, and a leaderboard." },
      { question: "How do you play Integra?", answer: "Guess a valid equation. After each guess, colours tell you which digits and operators are correct and correctly placed — use that to deduce the hidden equation within six tries." },
      { question: "Is Integra free?", answer: "Yes — free in the browser, one new equation a day. Sign in to save streaks and appear on the leaderboard." },
    ],
  },
};
