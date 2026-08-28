import type { Card, Suit } from "@/lib/games/court-piece/types";

const SUIT: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const RANK: Record<number, string> = { 14: "A", 13: "K", 12: "Q", 11: "J" };
const isRed = (s: Suit) => s === "H" || s === "D";

export function cardLabel(card: Card): string {
  return `${RANK[card.rank] ?? card.rank}${SUIT[card.suit]}`;
}

/** A minimalist playing-card chip: corner index + centre pip. Red for hearts/
 *  diamonds (via --danger), foreground for spades/clubs; face is --card. All
 *  theme-aware. Sizes: sm for the trick/opponents, md for your hand. */
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
  const rank = RANK[card.rank] ?? card.rank;
  const glyph = SUIT[card.suit];
  const color = isRed(card.suit) ? "text-[var(--danger)]" : "text-foreground";
  const dims = size === "sm" ? "h-[52px] w-9 text-[13px]" : "h-16 w-12 text-base";
  const cls = [
    "relative flex-none select-none rounded-lg border bg-card shadow-sm border-border font-display transition",
    dims,
    color,
    onClick && !disabled ? "cursor-pointer hover:-translate-y-2.5 hover:shadow-md hover:z-10" : "",
    disabled && onClick ? "cursor-not-allowed" : "",
    dim ? "opacity-30" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <span className="absolute left-1 top-0.5 font-bold leading-none tabular-nums">{rank}</span>
      <span className="absolute left-1 top-[18px] text-[10px] leading-none">{glyph}</span>
      <span className={`absolute inset-0 grid place-items-center ${size === "sm" ? "text-lg" : "text-2xl"} opacity-90`}>
        {glyph}
      </span>
    </>
  );

  if (!onClick) return <div className={cls} aria-label={cardLabel(card)}>{inner}</div>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls} aria-label={cardLabel(card)}>
      {inner}
    </button>
  );
}
