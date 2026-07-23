/** Pure blueprint-style SVG badge renderer. No DOM, no React. */

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape the five XML-significant characters. */
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Clamp a value to a sane badge width, appending an ellipsis when cut. */
export function truncate(s: string, max = 42): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export type BadgeData = { label: string; value: string };

/**
 * Render a self-contained monochrome blueprint badge (dark card, corner `+`
 * ticks, uppercase label, bold value). Text is XML-escaped, so the value can
 * come from user/DB content safely. Sized to the value length.
 */
export function renderBadge({ label, value }: BadgeData): string {
  const lbl = escapeXml(label.toUpperCase());
  const val = escapeXml(truncate(value));
  const width = Math.max(180, Math.round(28 + val.length * 8.2));
  const h = 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img" aria-label="${lbl}: ${val}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${h - 1}" fill="#0a0a0a" stroke="#27272a"/>
  <g fill="#6b6b73" font-family="ui-monospace,monospace" font-size="10">
    <text x="6" y="12">+</text><text x="${width - 12}" y="12">+</text>
    <text x="6" y="${h - 5}">+</text><text x="${width - 12}" y="${h - 5}">+</text>
  </g>
  <text x="16" y="24" fill="#a1a1aa" font-family="ui-sans-serif,system-ui,sans-serif" font-size="9" letter-spacing="1.5">${lbl}</text>
  <text x="16" y="42" fill="#fafafa" font-family="ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="700">${val}</text>
</svg>`;
}
