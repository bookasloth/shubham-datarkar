"use client";

import * as React from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** The one enforced rule (mirrors the server: password.length < 8 rejects). */
export const PASSWORD_MIN = 8;

/** 0–3: length rule, mixed case, and a digit/symbol. Purely advisory. */
function strength(pw: string): number {
  let s = 0;
  if (pw.length >= PASSWORD_MIN) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;

/**
 * Password input with a show/hide toggle and a caps-lock warning. When `meter`
 * is set (account creation / reset), it also shows the one hard requirement
 * (≥8 chars) and an advisory strength bar. Monochrome — no color states.
 */
export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  required,
  autoFocus,
  meter = false,
  icon,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  meter?: boolean;
  icon?: React.ReactNode;
  onValueChange?: (value: string) => void;
}) {
  const [show, setShow] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const [value, setValue] = React.useState("");

  const met = value.length >= PASSWORD_MIN;
  const s = strength(value);

  function checkCaps(e: React.KeyboardEvent<HTMLInputElement>) {
    setCaps(e.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          minLength={meter ? PASSWORD_MIN : undefined}
          icon={icon}
          className="pr-10"
          onChange={(e) => {
            setValue(e.target.value);
            onValueChange?.(e.target.value);
          }}
          onKeyUp={checkCaps}
          onKeyDown={checkCaps}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-btn p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {caps && (
        <p className="text-xs text-muted-foreground" role="status">
          Caps Lock is on.
        </p>
      )}

      {meter && value.length > 0 && (
        <div className="grid gap-1.5">
          <div className="flex items-center gap-1" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  n <= s ? "bg-foreground" : "bg-border",
                )}
              />
            ))}
          </div>
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {met && <Check className="size-3.5" />}
            {met
              ? `${STRENGTH_LABEL[s]} — meets the minimum`
              : `At least ${PASSWORD_MIN} characters`}
          </p>
        </div>
      )}
    </div>
  );
}
