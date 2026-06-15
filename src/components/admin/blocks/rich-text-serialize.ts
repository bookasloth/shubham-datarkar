import type { InlineNode, RichText } from "@/lib/data/types";

const SIMPLE = ["b", "i", "u", "s", "mark", "small", "code", "kbd", "sub", "sup"] as const;
type SimpleTag = (typeof SIMPLE)[number];
const TAG: Record<SimpleTag, string> = {
  b: "strong", i: "em", u: "u", s: "s", mark: "mark",
  small: "small", code: "code", kbd: "kbd", sub: "sub", sup: "sup",
};
const REV: Record<string, SimpleTag> = Object.fromEntries(
  (Object.entries(TAG) as [SimpleTag, string][]).map(([k, v]) => [v.toUpperCase(), k]),
);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Render InlineNode[] (or string) to HTML for the contentEditable surface. */
export function nodesToHtml(value: RichText): string {
  const nodes = typeof value === "string" ? [value] : value;
  return nodes
    .map((node) => {
      if (typeof node === "string") return esc(node);
      if ((SIMPLE as readonly string[]).includes(node.t))
        return `<${TAG[node.t as SimpleTag]}>${esc((node as { text: string }).text)}</${TAG[node.t as SimpleTag]}>`;
      // param-bearing -> non-editable chip span
      if (node.t === "a")
        return `<span data-t="a" data-href="${esc(node.href)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "tooltip")
        return `<span data-t="tooltip" data-tip="${esc(node.tip)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "popover")
        return `<span data-t="popover" data-content="${esc(node.content)}" contenteditable="false">${esc(node.text)}</span>`;
      if (node.t === "fn")
        return `<span data-t="fn" data-n="${node.n}" contenteditable="false">[${node.n}]</span>`;
      return "";
    })
    .join("");
}

/** Parse the contentEditable HTML back into InlineNode[]. */
export function htmlToNodes(html: string): InlineNode[] {
  const root = document.createElement("div");
  root.innerHTML = html;
  const out: InlineNode[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out.push(child.textContent ?? "");
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const t = child.dataset.t;
    if (t === "a") out.push({ t: "a", text: child.textContent ?? "", href: child.dataset.href ?? "" });
    else if (t === "tooltip") out.push({ t: "tooltip", text: child.textContent ?? "", tip: child.dataset.tip ?? "" });
    else if (t === "popover") out.push({ t: "popover", text: child.textContent ?? "", content: child.dataset.content ?? "" });
    else if (t === "fn") out.push({ t: "fn", n: Number(child.dataset.n ?? 0) });
    else {
      const simple = REV[child.tagName];
      if (simple) out.push({ t: simple, text: child.textContent ?? "" });
      else out.push(child.textContent ?? "");
    }
  });
  return normalize(out);
}

/** Merge adjacent strings, drop empty strings. */
export function normalize(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      if (node === "") continue;
      const last = out[out.length - 1];
      if (typeof last === "string") out[out.length - 1] = last + node;
      else out.push(node);
    } else out.push(node);
  }
  return out;
}

/** Collapse a single plain-string node array back to a bare string for cleaner storage. */
export function toRichText(nodes: InlineNode[]): RichText {
  const n = normalize(nodes);
  if (n.length === 0) return "";
  if (n.length === 1 && typeof n[0] === "string") return n[0];
  return n;
}
