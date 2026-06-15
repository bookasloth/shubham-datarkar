"use client";
import * as React from "react";
import type { RichText } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nodesToHtml, htmlToNodes, toRichText } from "../rich-text-serialize";

const SIMPLE_BTNS: { tag: string; label: string }[] = [
  { tag: "strong", label: "B" }, { tag: "em", label: "I" }, { tag: "u", label: "U" },
  { tag: "s", label: "S" }, { tag: "mark", label: "HL" }, { tag: "code", label: "</>" },
  { tag: "kbd", label: "Kbd" }, { tag: "small", label: "sm" },
  { tag: "sub", label: "x₂" }, { tag: "sup", label: "x²" },
];

export function RichTextField({
  label, value, onChange,
}: {
  label?: string; value: RichText; onChange: (v: RichText) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Seed once; do not re-seed on every keystroke (would reset the caret).
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML === "") ref.current.innerHTML = nodesToHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    if (ref.current) onChange(toRichText(htmlToNodes(ref.current.innerHTML)));
  };

  const wrap = (tag: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const el = document.createElement(tag);
    el.appendChild(sel.getRangeAt(0).extractContents());
    sel.getRangeAt(0).insertNode(el);
    sync();
  };

  const insertChip = (html: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const frag = range.createContextualFragment(html);
    range.deleteContents();
    range.insertNode(frag);
    sync();
  };

  return (
    <div className="grid gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="flex flex-wrap gap-1">
        {SIMPLE_BTNS.map((b) => (
          <Button key={b.tag} type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs" onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap(b.tag)}>{b.label}</Button>
        ))}
        <ParamButton kind="a" onInsert={insertChip} />
        <ParamButton kind="tooltip" onInsert={insertChip} />
        <ParamButton kind="popover" onInsert={insertChip} />
        <ParamButton kind="fn" onInsert={insertChip} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm leading-7 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_[data-t]]:rounded [&_[data-t]]:bg-muted [&_[data-t]]:px-1"
      />
    </div>
  );
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ParamButton({
  kind, onInsert,
}: {
  kind: "a" | "tooltip" | "popover" | "fn";
  onInsert: (html: string) => void;
}) {
  const [text, setText] = React.useState("");
  const [param, setParam] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const labels = { a: "Link", tooltip: "Tip", popover: "Pop", fn: "Fn" } as const;
  const paramLabel = { a: "href", tooltip: "tip", popover: "content", fn: "number" } as const;

  const submit = () => {
    let html = "";
    if (kind === "a") html = `<span data-t="a" data-href="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else if (kind === "tooltip") html = `<span data-t="tooltip" data-tip="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else if (kind === "popover") html = `<span data-t="popover" data-content="${esc(param)}" contenteditable="false">${esc(text)}</span>`;
    else html = `<span data-t="fn" data-n="${Number(param) || 0}" contenteditable="false">[${Number(param) || 0}]</span>`;
    onInsert(html);
    setText(""); setParam(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs">{labels[kind]}</Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-64 gap-2">
        {kind !== "fn" && (
          <input className="rounded-btn border border-border bg-background p-1.5 text-sm"
            placeholder="text" value={text} onChange={(e) => setText(e.target.value)} />
        )}
        <input className="rounded-btn border border-border bg-background p-1.5 text-sm"
          placeholder={paramLabel[kind]} value={param} onChange={(e) => setParam(e.target.value)} />
        <Button type="button" size="sm" onClick={submit}>Insert</Button>
      </PopoverContent>
    </Popover>
  );
}
