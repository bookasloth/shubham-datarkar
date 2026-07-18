"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Word opens HTML saved as .doc; Google Docs imports the same file. Wrapping the
// article HTML in the Office namespace envelope makes Word render it as a proper
// document (headings, lists, tables, links) rather than raw markup.
function wordDoc(html: string, title: string): string {
  return (
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" +
    title +
    "</title></head><body>" +
    html +
    "</body></html>"
  );
}

/** Export the finished article. Markdown/HTML are serialized on the server (serialize.ts) and passed in. */
export function ExportButtons({ slug, markdown, html }: { slug: string; markdown: string; html: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(kind: "md" | "html") {
    try {
      await navigator.clipboard.writeText(kind === "md" ? markdown : html);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — the download buttons still work */
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => copy("md")}>{copied === "md" ? "Copied" : "Copy Markdown"}</Button>
      <Button variant="outline" size="sm" onClick={() => copy("html")}>{copied === "html" ? "Copied" : "Copy HTML"}</Button>
      <Button variant="outline" size="sm" onClick={() => download(`${slug}.md`, markdown, "text/markdown")}>Download .md</Button>
      <Button variant="outline" size="sm" onClick={() => download(`${slug}.html`, html, "text/html")}>Download .html</Button>
      <Button variant="outline" size="sm" onClick={() => download(`${slug}.doc`, wordDoc(html, slug), "application/msword")}>Download .doc (Word / Google Docs)</Button>
    </div>
  );
}
