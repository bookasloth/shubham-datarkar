"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function OtpInput({
  length = 6,
  onComplete,
  className,
}: {
  length?: number;
  onComplete?: (code: string) => void;
  className?: string;
}) {
  const [values, setValues] = React.useState<string[]>(() => Array(length).fill(""));
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  function setAt(i: number, char: string) {
    const next = [...values];
    next[i] = char;
    setValues(next);
    if (next.every((v) => v !== "")) onComplete?.(next.join(""));
  }

  function onChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    setAt(i, char);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length).split("");
    if (!digits.length) return;
    const next = Array(length).fill("").map((_, idx) => digits[idx] ?? "");
    setValues(next);
    if (digits.length === length) onComplete?.(next.join(""));
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  }

  return (
    <div className={cn("flex gap-2", className)} onPaste={onPaste}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => onChange(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          className="size-11 rounded-input border border-input bg-background text-center text-lg font-semibold text-foreground transition-ui focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ))}
    </div>
  );
}
