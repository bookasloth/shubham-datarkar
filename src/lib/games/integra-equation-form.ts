import { isValidGuess } from "@/lib/games/integra";

export type IntegraEquationInput = { puzzleNumber: number; equation: string };

export function validateIntegraEquation(
  raw: string,
): { ok: true; equation: string } | { ok: false; error: string } {
  const equation = String(raw ?? "").trim();
  if (!isValidGuess(equation)) {
    return { ok: false, error: "Must be a valid 7-character equation (e.g. 12+3=15)." };
  }
  return { ok: true, equation };
}

export function parseIntegraEquationForm(formData: FormData): IntegraEquationInput {
  const puzzleNumber = Math.trunc(Number(String(formData.get("puzzle_number") ?? "").trim()));
  const equation = String(formData.get("equation") ?? "").trim();
  return { puzzleNumber, equation };
}
