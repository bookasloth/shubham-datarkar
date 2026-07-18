import type { ContentBlock, InlineNode, RichText, ListItem } from "@/lib/data/types";

/**
 * Pure serializers over ContentBlock[] — the entire "export" feature. Covers the
 * block types the KalamAI writer emits; anything else falls through to empty so
 * an unexpected block never crashes an export. This is why no Markdown/Tiptap
 * renderer is needed: articles render through ArticleBody and export through here.
 */

function inlineToMarkdown(node: InlineNode): string {
  if (typeof node === "string") return node;
  switch (node.t) {
    case "b": return `**${node.text}**`;
    case "i": return `*${node.text}*`;
    case "s": return `~~${node.text}~~`;
    case "code": return `\`${node.text}\``;
    case "a": return `[${node.text}](${node.href})`;
    case "fn": return `[^${node.n}]`;
    default: return node.text; // u/mark/small/kbd/sub/sup/tooltip/popover → plain text
  }
}

function richToMarkdown(rt: RichText): string {
  return typeof rt === "string" ? rt : rt.map(inlineToMarkdown).join("");
}

function listItemToMarkdown(item: ListItem, ordered: boolean, i: number): string {
  const bullet = ordered ? `${i + 1}.` : "-";
  if (typeof item === "object" && item !== null && "items" in item) {
    const sub = item.items.map((s, j) => `  ${ordered ? `${j + 1}.` : "-"} ${richToMarkdown(s)}`).join("\n");
    return `${bullet} ${richToMarkdown(item.text)}\n${sub}`;
  }
  return `${bullet} ${richToMarkdown(item as RichText)}`;
}

function blockToMarkdown(b: ContentBlock): string | null {
  switch (b.type) {
    case "h2": return `## ${b.text}`;
    case "h3": return `### ${b.text}`;
    case "h4": return `#### ${b.text}`;
    case "lead":
    case "p":
    case "small":
    case "caption":
    case "summary":
    case "authorNote": return richToMarkdown(b.text);
    case "ul": return b.items.map((it, i) => listItemToMarkdown(it, false, i)).join("\n");
    case "ol": return b.items.map((it, i) => listItemToMarkdown(it, true, i)).join("\n");
    case "takeaways": return b.items.map((it) => `- ${richToMarkdown(it)}`).join("\n");
    case "steps": return b.items.map((s, i) => `${i + 1}. **${s.title}** — ${richToMarkdown(s.detail)}`).join("\n");
    case "quote":
    case "pullquote": return `> ${richToMarkdown(b.text)}`;
    case "code": return "```" + (b.lang ?? "") + "\n" + b.code + "\n```";
    case "callout": return `> ${b.title ? `**${b.title}** ` : ""}${richToMarkdown(b.text)}`;
    case "table": {
      const head = `| ${b.columns.join(" | ")} |`;
      const rule = `| ${b.columns.map(() => "---").join(" | ")} |`;
      const rows = b.rows.map((r) => `| ${r.map(richToMarkdown).join(" | ")} |`).join("\n");
      return `${head}\n${rule}\n${rows}`;
    }
    case "faq": return b.items.map((f) => `**${f.q}**\n\n${richToMarkdown(f.a)}`).join("\n\n");
    case "divider": return "---";
    default: return null; // passthrough: unsupported block dropped from export
  }
}

export function blocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks.map(blockToMarkdown).filter((s): s is string => s !== null).join("\n\n") + "\n";
}

/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineToHtml(node: InlineNode): string {
  if (typeof node === "string") return escapeHtml(node);
  switch (node.t) {
    case "b": return `<strong>${escapeHtml(node.text)}</strong>`;
    case "i": return `<em>${escapeHtml(node.text)}</em>`;
    case "s": return `<s>${escapeHtml(node.text)}</s>`;
    case "u": return `<u>${escapeHtml(node.text)}</u>`;
    case "mark": return `<mark>${escapeHtml(node.text)}</mark>`;
    case "code": return `<code>${escapeHtml(node.text)}</code>`;
    case "a": return `<a href="${escapeHtml(node.href)}">${escapeHtml(node.text)}</a>`;
    case "fn": return `<sup>${node.n}</sup>`;
    default: return escapeHtml(node.text);
  }
}

function richToHtml(rt: RichText): string {
  return typeof rt === "string" ? escapeHtml(rt) : rt.map(inlineToHtml).join("");
}

function listItemToHtml(item: ListItem, ordered: boolean): string {
  if (typeof item === "object" && item !== null && "items" in item) {
    const tag = ordered ? "ol" : "ul";
    const sub = item.items.map((s) => `<li>${richToHtml(s)}</li>`).join("");
    return `<li>${richToHtml(item.text)}<${tag}>${sub}</${tag}></li>`;
  }
  return `<li>${richToHtml(item as RichText)}</li>`;
}

function blockToHtml(b: ContentBlock): string | null {
  switch (b.type) {
    case "h2": return `<h2>${escapeHtml(b.text)}</h2>`;
    case "h3": return `<h3>${escapeHtml(b.text)}</h3>`;
    case "h4": return `<h4>${escapeHtml(b.text)}</h4>`;
    case "lead":
    case "p":
    case "small":
    case "caption":
    case "summary":
    case "authorNote": return `<p>${richToHtml(b.text)}</p>`;
    case "ul": return `<ul>${b.items.map((it) => listItemToHtml(it, false)).join("")}</ul>`;
    case "ol": return `<ol>${b.items.map((it) => listItemToHtml(it, true)).join("")}</ol>`;
    case "takeaways": return `<ul>${b.items.map((it) => `<li>${richToHtml(it)}</li>`).join("")}</ul>`;
    case "steps": return `<ol>${b.items.map((s) => `<li><strong>${escapeHtml(s.title)}</strong> — ${richToHtml(s.detail)}</li>`).join("")}</ol>`;
    case "quote":
    case "pullquote": return `<blockquote>${richToHtml(b.text)}</blockquote>`;
    case "callout": return `<aside>${b.title ? `<strong>${escapeHtml(b.title)}</strong> ` : ""}${richToHtml(b.text)}</aside>`;
    case "code": return `<pre><code>${escapeHtml(b.code)}</code></pre>`;
    case "table": {
      const head = `<thead><tr>${b.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
      const body = `<tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${richToHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      return `<table>${head}${body}</table>`;
    }
    case "faq": return b.items.map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${richToHtml(f.a)}</p>`).join("");
    case "divider": return "<hr>";
    default: return null;
  }
}

export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map(blockToHtml).filter((s): s is string => s !== null).join("\n");
}
