"use client";
import { useRef } from "react";
import { CommunityAvatar } from "./community-avatar";
import { BadgeTick } from "./badge-tick";
import { useMentionAutocomplete } from "./use-mention-autocomplete";
import type { Badge } from "@/lib/community/types";

/**
 * A textarea (or single-line input) with @mention autocomplete. Controlled —
 * the parent owns `value`, so the field composes with a form's `name` for
 * server actions and with the parent's own char-count / submit logic.
 *
 * The listbox is absolutely positioned under the field and sits at z-50 so it
 * clears a surrounding dialog overlay. Enter/Tab accept a highlighted handle and
 * are swallowed, so posting doesn't fire while the list is open.
 */
export function MentionField({
  value,
  onChange,
  as = "textarea",
  onEnterSubmit,
  className,
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
  as?: "textarea" | "input";
  /** Single-line callers (reply box) submit on a bare Enter — but only when the
   *  mention list ISN'T open, which this handles. */
  onEnterSubmit?: () => void;
  className?: string;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "className" | "ref"
>) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const ac = useMentionAutocomplete(ref, onChange);

  const shared = {
    ref: ref as never,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      onChange(e.target.value);
      ac.onCaret();
    },
    onKeyUp: () => ac.onCaret(),
    onClick: () => ac.onCaret(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (ac.onKeyDown(e)) {
        e.preventDefault();
        return;
      }
      if (as === "input" && e.key === "Enter" && onEnterSubmit) {
        e.preventDefault();
        onEnterSubmit();
      }
    },
    className,
    ...rest,
  };

  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea {...(shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...(shared as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}

      {ac.open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full max-w-xs overflow-auto rounded-card border border-border bg-popover py-1 shadow-lg"
        >
          {ac.items.map((it, i) => (
            <li key={it.username} role="option" aria-selected={i === ac.active}>
              <button
                type="button"
                // onMouseDown, not onClick: mousedown fires before the textarea's
                // blur, so the caret/selection survives to the accept.
                onMouseDown={(e) => {
                  e.preventDefault();
                  ac.accept(it);
                }}
                onMouseEnter={() => ac.setActive(i)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-ui ${
                  i === ac.active ? "bg-accent" : "hover:bg-accent"
                }`}
              >
                <CommunityAvatar seed={it.username} src={it.avatar_url} size={24} />
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-medium">{it.display_name ?? it.username}</span>
                  <BadgeTick badge={it.badge as Badge} />
                </span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  @{it.username}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
