"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileText } from "@/lib/members/profile-actions";
import { HEADLINE_MAX, BIO_MAX } from "@/lib/members/profile-text";
import { Button } from "@/components/ui/button";

export function ProfileTextEdit({ headline, bio }: { headline: string | null; bio: string | null }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(headline ?? "");
  const [b, setB] = useState(bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit profile
      </Button>
    );
  }

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("headline", h);
    fd.set("bio", b);
    start(async () => {
      const res = await updateProfileText(fd);
      if ("ok" in res) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <label className="block text-sm font-medium">Headline</label>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        maxLength={HEADLINE_MAX}
        value={h}
        onChange={(e) => setH(e.target.value)}
        placeholder="e.g. Web and SaaS Developer"
      />
      <label className="block text-sm font-medium">About</label>
      <textarea
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        maxLength={BIO_MAX}
        rows={4}
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="A short bio."
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={pending} onClick={save}>Save</Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
