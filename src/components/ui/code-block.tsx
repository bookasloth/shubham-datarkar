"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "import", "from",
  "export", "default", "await", "async", "new", "class", "extends", "type", "interface", "of",
  "in", "true", "false", "null", "undefined", "void", "echo", "cd", "npm", "npx", "git", "sudo",
]);

/**
 * Minimal, dependency-free, monochrome syntax highlighting. Distinguishes
 * comments / strings / keywords / numbers using weight + opacity only — no
 * color, staying inside the grayscale design system.
 */
function highlight(code: string): React.ReactNode[] {
  const tokenRe = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|([\s\S])/g;
  const out: React.ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = tokenRe.exec(code))) {
    const [, comment, str, num, word, other] = m;
    if (comment) out.push(<span key={i} className="italic text-muted-foreground">{comment}</span>);
    else if (str) out.push(<span key={i} className="text-foreground/65">{str}</span>);
    else if (num) out.push(<span key={i} className="font-medium">{num}</span>);
    else if (word) out.push(KEYWORDS.has(word) ? <span key={i} className="font-semibold text-foreground">{word}</span> : <span key={i}>{word}</span>);
    else out.push(other);
    i++;
  }
  return out;
}

/** Code block with an optional filename header and a copy button. */
export function CodeBlock({
  code,
  filename,
  lang = "tsx",
  className,
}: {
  code: string;
  filename?: string;
  lang?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={cn("overflow-hidden rounded-card border border-border bg-muted/40", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{filename ?? lang}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground">{highlight(code)}</code>
      </pre>
    </div>
  );
}
