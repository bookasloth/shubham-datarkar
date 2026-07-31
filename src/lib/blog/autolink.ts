import type { ContentBlock, InlineNode, Post, RichText } from "@/lib/data/types";

/**
 * Automatic in-body internal linking for SEO.
 *
 * Builds a tag -> canonical-post index from the other published posts, then
 * links the first whole-word mention of each tag inside body prose. Contextual
 * in-body links carry more weight than footer "related" blocks, and this needs
 * no new schema, deps, or LLM — it runs at render off data we already fetch.
 *
 * ponytail: anchor text is the raw tag and the target is a heuristic "most
 * focused" post. Upgrade path if link quality matters: add a per-post keyphrase
 * column + explicit anchor->slug mapping in the editor.
 */

type LinkEntry = { term: string; href: string };

// Only link inside real body paragraphs — never headings, captions, or asides.
const LINKABLE_TYPES = new Set(["p", "lead"]);
// Cap links per article so prose doesn't turn blue / trip over-optimization.
const MAX_LINKS = 3;
// Skip tags too short to be meaningful anchors ("ai", "os").
const MIN_TERM_LEN = 4;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** tag -> single canonical destination, longest terms first (multi-word wins). */
export function buildLinkIndex(current: Post, others: Post[]): LinkEntry[] {
  const byTag = new Map<string, Post[]>();
  for (const p of others) {
    if (p.slug === current.slug) continue;
    for (const raw of p.tags ?? []) {
      const term = raw.toLowerCase().trim();
      if (term.length < MIN_TERM_LEN) continue;
      const list = byTag.get(term);
      if (list) list.push(p);
      else byTag.set(term, [p]);
    }
  }

  const index: LinkEntry[] = [];
  for (const [term, posts] of byTag) {
    // Canonical = the post most "about" this tag: fewest tags (most focused),
    // then newest, then slug for a stable deterministic pick.
    const best = [...posts].sort(
      (a, b) =>
        a.tags.length - b.tags.length ||
        b.date.localeCompare(a.date) ||
        a.slug.localeCompare(b.slug),
    )[0];
    index.push({ term, href: `/blog/${best.category}/${best.slug}` });
  }
  index.sort((a, b) => b.term.length - a.term.length);
  return index;
}

/** Insert one link into a plain string; returns nodes + whether it fired. */
function linkString(
  text: string,
  index: LinkEntry[],
  usedHref: Set<string>,
): { nodes: InlineNode[]; linked: boolean } {
  for (const { term, href } of index) {
    if (usedHref.has(href)) continue;
    const m = new RegExp(`\\b${escapeRe(term)}\\b`, "i").exec(text);
    if (!m) continue;
    usedHref.add(href);
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const nodes: InlineNode[] = [];
    if (before) nodes.push(before);
    nodes.push({ t: "a", text: m[0], href }); // keep original casing as anchor
    if (after) nodes.push(after);
    return { nodes, linked: true };
  }
  return { nodes: [text], linked: false };
}

/** Autolink first mentions across body prose, up to MAX_LINKS total. */
export function autolinkBlocks(
  blocks: ContentBlock[],
  index: LinkEntry[],
  max = MAX_LINKS,
): ContentBlock[] {
  if (!index.length) return blocks;
  const usedHref = new Set<string>();
  let count = 0;

  return blocks.map((block) => {
    if (count >= max || !LINKABLE_TYPES.has(block.type) || !("text" in block)) return block;
    const value = (block as { text: RichText }).text;
    // Only touch bare string segments — leaves existing links/bold/etc untouched.
    const segments: InlineNode[] = typeof value === "string" ? [value] : value;

    const out: InlineNode[] = [];
    let changed = false;
    for (const seg of segments) {
      if (typeof seg !== "string" || count >= max) {
        out.push(seg);
        continue;
      }
      const { nodes, linked } = linkString(seg, index, usedHref);
      if (linked) {
        count++;
        changed = true;
        out.push(...nodes);
      } else {
        out.push(seg);
      }
    }
    return changed ? ({ ...block, text: out } as ContentBlock) : block;
  });
}
