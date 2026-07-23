/**
 * Real readability analysis — Flesch Reading Ease + Flesch–Kincaid Grade, plus
 * sentence/word metrics. Pure and deterministic (no API, no network), so it runs
 * honestly in the browser. Heuristic syllable counting is the standard approach
 * for these scores; it's approximate by design but stable and well-understood.
 */

export type Readability = {
  words: number;
  sentences: number;
  syllables: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleschReadingEase: number; // 0–100, higher = easier
  fleschKincaidGrade: number; // US grade level
  readingLevel: string; // plain-English label
  hardSentences: string[]; // sentences over 25 words
};

/** Approximate syllable count for a single word (vowel-group heuristic). */
export function syllablesInWord(raw: string): number {
  const w = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, ""); // drop common silent endings
  s = s.replace(/^y/, "");
  const groups = s.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitWords(text: string): string[] {
  return (text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? []);
}

function levelFor(ease: number): string {
  if (ease >= 90) return "Very easy — 5th grade";
  if (ease >= 70) return "Easy — 6th–7th grade";
  if (ease >= 60) return "Plain English — 8th–9th grade";
  if (ease >= 50) return "Fairly hard — 10th–12th grade";
  if (ease >= 30) return "Hard — college";
  return "Very hard — professional";
}

export function analyzeReadability(text: string): Readability | null {
  const sentencesArr = splitSentences(text);
  const wordsArr = splitWords(text);
  if (wordsArr.length === 0 || sentencesArr.length === 0) return null;

  const words = wordsArr.length;
  const sentences = sentencesArr.length;
  const syllables = wordsArr.reduce((n, w) => n + syllablesInWord(w), 0);

  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  const fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  const hardSentences = sentencesArr.filter((s) => splitWords(s).length > 25);

  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    words,
    sentences,
    syllables,
    avgWordsPerSentence: round(avgWordsPerSentence),
    avgSyllablesPerWord: round(avgSyllablesPerWord),
    fleschReadingEase: Math.max(0, Math.min(100, round(fleschReadingEase))),
    fleschKincaidGrade: Math.max(0, round(fleschKincaidGrade)),
    readingLevel: levelFor(fleschReadingEase),
    hardSentences: hardSentences.slice(0, 5),
  };
}
