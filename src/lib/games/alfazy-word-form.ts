export type AlfazyWordInput = { puzzleNumber: number; word: string };

export function validateAlfazyWord(
  raw: string,
): { ok: true; word: string } | { ok: false; error: string } {
  const word = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(word)) {
    return { ok: false, error: "Word must be exactly 5 letters (a–z)." };
  }
  return { ok: true, word };
}

export function parseAlfazyWordForm(formData: FormData): AlfazyWordInput {
  const puzzleNumber = Math.trunc(Number(String(formData.get("puzzle_number") ?? "").trim()));
  const word = String(formData.get("word") ?? "").trim().toLowerCase();
  return { puzzleNumber, word };
}
