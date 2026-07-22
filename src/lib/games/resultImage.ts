import type { ShareInput } from "./share";
import { shareTitle, gameShareUrl } from "./share";

/** Emoji cell → fill colour. Covers every glyph the three games emit today. */
const SQUARE: Record<string, string> = {
  "🟩": "#22c55e",
  "🟨": "#eab308",
  "🟧": "#f97316",
  "🟪": "#a855f7",
  "🟦": "#3b82f6",
  "🟥": "#ef4444",
  "⬜": "#e4e4e7",
  "⬛": "#3f3f46",
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, maxW: number, lh: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lh));
  return top + lines.length * lh;
}

/**
 * Draw the game result onto a 1080×1350 (Instagram portrait) canvas and hand
 * back a PNG. No dependency: the result is a title, a grid of coloured squares,
 * and a footer — all fillRect/fillText.
 *
 * ponytail: waits on document.fonts.ready so Poppins is available; if the font
 * never loads, canvas falls back to system sans — acceptable, not blocking.
 */
export async function renderResultImage(input: ShareInput): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const pad = 90;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f97316"; // brand accent bar
  ctx.fillRect(0, 0, W, 16);

  try {
    await document.fonts.ready;
  } catch {
    // fonts optional — fall through to system sans
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 58px 'Poppins','Plus Jakarta Sans',system-ui,sans-serif";
  const titleBottom = wrapText(ctx, shareTitle(input), W / 2, 190, W - 2 * pad, 72);

  const lines = input.grid.split("\n").filter((l) => l.length > 0);
  const areaTop = titleBottom + 40;
  const areaBottom = H - 200;
  const isSquares =
    lines.every((l) => Array.from(l).every((c) => c === " " || c in SQUARE)) &&
    lines.some((l) => Array.from(l).some((c) => c in SQUARE));

  if (isSquares) {
    const rowsN = lines.length;
    const colsN = Math.max(...lines.map((l) => Array.from(l).length));
    const gap = 16;
    const cell = Math.floor(
      Math.min(
        (W - 2 * pad - gap * (colsN - 1)) / colsN,
        (areaBottom - areaTop - gap * (rowsN - 1)) / rowsN,
        150,
      ),
    );
    const gridH = rowsN * cell + (rowsN - 1) * gap;
    let y = areaTop + (areaBottom - areaTop - gridH) / 2;
    for (const line of lines) {
      const cells = Array.from(line);
      const rowW = cells.length * cell + (cells.length - 1) * gap;
      let x = (W - rowW) / 2;
      for (const c of cells) {
        if (c in SQUARE) {
          ctx.fillStyle = SQUARE[c];
          ctx.beginPath();
          ctx.roundRect(x, y, cell, cell, Math.min(18, cell * 0.18));
          ctx.fill();
        }
        x += cell + gap;
      }
      y += cell + gap;
    }
  } else {
    // Hit and Blow ships a text summary, not squares — render it as mono lines.
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 42px 'Poppins',ui-monospace,monospace";
    const lh = 60;
    let y = areaTop + (areaBottom - areaTop - lines.length * lh) / 2 + 42;
    for (const line of lines) {
      ctx.fillText(line, W / 2, y);
      y += lh;
    }
  }

  ctx.fillStyle = "#71717a";
  ctx.font = "500 34px 'Poppins',system-ui,sans-serif";
  ctx.fillText(`Play at ${gameShareUrl(input.game).replace(/^https?:\/\//, "")}`, W / 2, H - 120);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
