"use client";

import { useState } from "react";
import { createChallenge } from "@/lib/games/challenges/actions";
import { validateGuess } from "@/lib/games/challenges/engine";
import type { ChallengeGame } from "@/lib/games/challenges/types";
import { ChallengeShare } from "@/components/games/challenge/ChallengeShare";

const HINT: Record<ChallengeGame, { placeholder: string; max: number; label: string }> = {
  alfazy: { placeholder: "a 5-letter word", max: 5, label: "Secret word" },
  hit_and_blow: { placeholder: "4 unique digits", max: 4, label: "Secret code" },
  integra: { placeholder: "e.g. 12+3=15", max: 7, label: "Secret equation" },
};

export function CreateChallengeForm({ game, slug }: { game: ChallengeGame; slug: string }) {
  const hint = HINT[game];
  const [secret, setSecret] = useState("");
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const valid = validateGuess(game, secret.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    const res = await createChallenge({ game, secret: secret.trim(), title: title.trim(), isPublic });
    setBusy(false);
    if (!res.ok) {
      setError(
        res.reason === "invalid"
          ? "That isn’t a valid secret for this game."
          : res.reason === "limit"
            ? "You’ve hit 15 challenges in the last 30 days."
            : res.reason === "forbidden"
              ? "Creating challenges is a Member feature."
              : "Something went wrong. Try again.",
      );
      return;
    }
    setCreated(res.code);
  }

  if (created) {
    const path = `/games/${slug}/challenge/${created}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    return (
      <div className="space-y-3 rounded-card border border-border bg-card p-5">
        <p className="font-semibold">Challenge created.</p>
        <p className="text-sm text-muted-foreground">Share this link — anyone can try to crack your secret.</p>
        <a href={path} className="block truncate text-sm underline">{url}</a>
        <div className="flex gap-2">
          <ChallengeShare url={url} />
          <button
            onClick={() => {
              setCreated(null);
              setSecret("");
              setTitle("");
            }}
            className="rounded-btn px-4 py-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-border bg-card p-5">
      <div className="space-y-1">
        <label className="text-sm font-medium">{hint.label}</label>
        <input
          value={secret}
          maxLength={hint.max}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={hint.placeholder}
          className="w-full rounded-input border-2 border-input bg-background px-3 py-2 font-mono outline-none transition-ui focus:border-brand"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Title (optional)</label>
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Beat this one"
          className="w-full rounded-input border-2 border-input bg-background px-3 py-2 outline-none transition-ui focus:border-brand"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        List publicly so others can discover it
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={!valid || busy}
        className="rounded-btn bg-primary px-5 py-2 font-semibold text-primary-foreground transition-ui hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create challenge"}
      </button>
    </form>
  );
}
