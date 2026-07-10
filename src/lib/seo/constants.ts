export function scoreColor(score: number): "red" | "orange" | "yellow" | "green" {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

export const SCORE_TONE = {
  red: "danger",
  orange: "warning",
  yellow: "warning",
  green: "success",
} as const;
