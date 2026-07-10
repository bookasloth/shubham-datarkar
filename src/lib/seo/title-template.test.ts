import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";

/**
 * The root layout appends `" — Shubham Datarkar"` to every child page's title via
 * `title.template`. A page whose own title already contains the brand therefore
 * renders it twice: `"Shubham Datarkar | Links — Shubham Datarkar"`.
 *
 * This is a source grep, not a render check — but the failure it guards against
 * is a source-level mistake (typing the brand into a title argument), so reading
 * source is the right level. Two real pages shipped this way before the template
 * existed and only broke when it landed.
 */

const APP_DIR = path.join(process.cwd(), "src", "app");

function metadataFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...metadataFiles(full));
    else if (entry.name === "page.tsx" || entry.name === "layout.tsx") out.push(full);
  }
  return out;
}

/** `title: "..."` string literals, excluding `title.absolute` / `title.default` objects. */
function titleLiterals(source: string): string[] {
  return [...source.matchAll(/\btitle:\s*"([^"]+)"/g)].map((m) => m[1]);
}

describe("title template", () => {
  it("no page or layout title literal contains the full brand name", () => {
    const rootLayout = path.join(APP_DIR, "layout.tsx");
    const offenders: string[] = [];

    for (const file of metadataFiles(APP_DIR)) {
      // The root layout legitimately names the brand: it owns `default` and `template`.
      if (file === rootLayout) continue;
      const source = fs.readFileSync(file, "utf-8");
      // A page opting out of the template may name the brand freely.
      if (/titleAbsolute:\s*true/.test(source)) continue;

      for (const title of titleLiterals(source)) {
        if (title.includes(site.name)) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${JSON.stringify(title)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
