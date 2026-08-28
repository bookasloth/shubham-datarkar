import type { Card } from "@/lib/games/court-piece/types";

const SUIT: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

export function cardLabel(card: Card): string {
  return `${RANK[card.rank] ?? card.rank}${SUIT[card.suit]}`;
}

/** A single playing-card chip. Monochrome per the design system; the suit glyph
 *  carries the distinction. Interactive when onClick is set and not disabled. */
export function CourtCard({
  card,
  onClick,
  disabled,
  dim,
  size = "md",
}: {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  dim?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-11 w-8 text-sm" : "h-16 w-12 text-lg";
  const cls = [
    "inline-flex items-center justify-center rounded-md border bg-card font-display tabular-nums transition border-border",
    dims,
    onClick && !disabled ? "cursor-pointer hover:-translate-y-1 hover:border-foreground" : "",
    disabled ? "cursor-default" : "",
    dim ? "opacity-35" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls} aria-label={cardLabel(card)}>
      {cardLabel(card)}
    </button>
  );
}
