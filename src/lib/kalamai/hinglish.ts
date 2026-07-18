// Hinglish spelling-variant normalization [C, D6]. Hinglish has severe spelling
// variance (nahi/nahin/nhi, kya/kia, hai/hain/h); without merging, counts split
// across variants and the 60% coverage gate silently rejects valid terms.
//
// Two mechanisms: a hand map for the common variants, and an edit-distance merge
// for the long tail — restricted to a romanized-Hindi lexicon so English words
// (from/form, their/there) are never wrongly merged.
// See docs/kalamai/spec/distill.md.

// variant -> canonical. Only entries where key !== value (identities are noise).
// Starter set; expand toward ~300 top tokens.
export const VARIANT_MAP: Record<string, string> = {
  nahin: "nahi", nhi: "nahi", nai: "nahi",
  hain: "hai", hei: "hai", hy: "hai",
  kia: "kya", kyaa: "kya",
  kese: "kaise", kaisa: "kaise",
  kyu: "kyun", kyo: "kyun",
  mein: "me", mai: "me",
  lie: "liye", liay: "liye",
  chahie: "chahiye", chaiye: "chahiye",
  acha: "accha", achha: "accha", acchha: "accha",
  bohot: "bahut", bhut: "bahut", bahot: "bahut",
  paise: "paisa", pese: "paisa",
  zyada: "jyada",
  bussiness: "business", buisness: "business",
};

// Romanized-Hindi lexicon: edit-distance merge is restricted to these so English
// tokens can never be collapsed together. Includes the map's canonical forms.
export const HINGLISH_LEXICON = new Set<string>([
  "nahi", "hai", "kya", "kaise", "kyun", "me", "ke", "ki", "ka", "aur", "liye",
  "chahiye", "accha", "bahut", "paisa", "kaam", "kam", "log", "logo", "sabse",
  "wala", "wale", "wali", "kar", "karo", "karna", "karne", "karta", "karti",
  "hota", "hoti", "hote", "raha", "rahi", "rahe", "gaya", "gayi", "diya", "dena",
  "lena", "sakta", "sakte", "sakti", "chahte", "chahta", "jyada", "zyada", "thoda",
  "bina", "sath", "saath", "baad", "pehle", "abhi", "yahan", "wahan", "kahan",
  "matlab", "samay", "din", "saal", "mahina", "paisa", "muft", "sasta", "mehnga",
]);

// Damerau-Levenshtein distance (with transposition). Cheap for short tokens.
export function dlDistance(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const d: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[la][lb];
}

/**
 * Build a token normalizer from the corpus token frequencies. Applies the hand
 * map first, then clusters remaining lexicon tokens by edit-distance ≤1 + shared
 * 2-char prefix, canonicalizing each cluster to its highest-frequency member.
 */
export function buildNormalizer(counts: Map<string, number>): (t: string) => string {
  const canon = new Map<string, string>();
  for (const [k, v] of Object.entries(VARIANT_MAP)) canon.set(k, v);

  const lex = [...counts.keys()].filter((t) => HINGLISH_LEXICON.has(t) && !canon.has(t));
  lex.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)); // highest freq first = anchor
  const anchors: string[] = [];
  for (const t of lex) {
    const anchor = anchors.find((a) => a.slice(0, 2) === t.slice(0, 2) && dlDistance(a, t) <= 1);
    if (anchor) canon.set(t, canon.get(anchor) ?? anchor);
    else anchors.push(t);
  }
  return (t: string) => canon.get(t) ?? t;
}
