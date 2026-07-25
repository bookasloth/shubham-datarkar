"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type HandleSuggestion = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  badge: string;
};

/** The @token the caret currently sits in, or null when not mentioning. */
type ActiveToken = { query: string; start: number; end: number };

// Dots ARE legal in real handles (handle_new_user mints them), so the run after
// the @ tolerates them. Mirrors linkify.ts's MENTION_RE charset.
const TOKEN_RE = /^[a-z0-9._+-]{0,64}$/i;

/** Find the @token the caret is inside: an @ at string-start or after
 *  whitespace, with only handle-legal chars between it and the caret.
 *  Exported for unit testing — this is the whole correctness claim of the hook. */
export function activeToken(value: string, caret: number): ActiveToken | null {
  let at = -1;
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === "@") {
      at = i;
      break;
    }
    if (/\s/.test(ch)) return null;
  }
  if (at === -1) return null;
  const before = value[at - 1];
  if (at !== 0 && before !== undefined && !/\s/.test(before)) return null; // mid-word @ = email
  const run = value.slice(at + 1, caret);
  if (!TOKEN_RE.test(run)) return null;
  return { query: run, start: at, end: caret };
}

/**
 * Drives an @mention dropdown over any textarea/input ref. Convenience only —
 * `mentionedHandles` still re-parses the committed body server-side and stays
 * the source of truth for notifications.
 *
 * Returns the suggestion list, the active index, and helpers the caller wires to
 * its own listbox markup. The caller owns rendering; this owns the state machine.
 */
export function useMentionAutocomplete(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  onChangeValue: (next: string) => void,
) {
  const [items, setItems] = useState<HandleSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const tokenRef = useRef<ActiveToken | null>(null);
  const seq = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setItems([]);
    setActive(0);
    tokenRef.current = null;
  }, []);

  /** Call from the textarea's onChange/onKeyUp/onClick — anything that can move
   *  the caret. Debounced query to the search RPC. */
  const onCaret = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const token = activeToken(el.value, el.selectionStart ?? el.value.length);
    tokenRef.current = token;
    if (!token || token.query.length < 1) {
      close();
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const sb = createClient();
      const { data } = await sb.rpc("community_handle_search", { p_q: token.query, p_limit: 6 });
      // A newer keystroke already fired — drop this stale response.
      if (mine !== seq.current) return;
      const rows = (data ?? []) as HandleSuggestion[];
      setItems(rows);
      setActive(0);
      setOpen(rows.length > 0);
    }, 150);
    return () => clearTimeout(t);
  }, [ref, close]);

  const accept = useCallback(
    (choice?: HandleSuggestion) => {
      const el = ref.current;
      const token = tokenRef.current;
      const pick = choice ?? items[active];
      if (!el || !token || !pick) return;
      const next = `${el.value.slice(0, token.start)}@${pick.username} ${el.value.slice(token.end)}`;
      onChangeValue(next);
      close();
      // Restore the caret just past the inserted "@handle ".
      const caret = token.start + pick.username.length + 2;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [ref, items, active, onChangeValue, close],
  );

  /** Wire to onKeyDown. Returns true if it handled the key — the caller must
   *  then preventDefault so Enter doesn't submit the post while the list is up. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!open) return false;
      if (e.key === "ArrowDown") {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setActive((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        accept();
        return true;
      }
      if (e.key === "Escape") {
        close();
        return true;
      }
      return false;
    },
    [open, items.length, accept, close],
  );

  // Close on unmount hygiene.
  useEffect(() => close, [close]);

  return { open, items, active, setActive, onCaret, onKeyDown, accept, close };
}
