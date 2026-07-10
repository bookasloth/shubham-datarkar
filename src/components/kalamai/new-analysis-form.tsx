"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
];

const inputClass =
  "h-10 w-full rounded-input border border-border bg-background px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Flow A entry: create an analysis, then hand off to the report page's poller. */
export function NewAnalysisForm() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("IN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kalamai/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), country, locale: "en" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/tools/kalamai/a/${data.id}`);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-border bg-card p-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <label htmlFor="kw" className="text-xs font-medium text-muted-foreground">
            Keyword
          </label>
          <input
            id="kw"
            className={inputClass}
            placeholder="digital marketing company in Nagpur"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="country" className="text-xs font-medium text-muted-foreground">
            Country
          </label>
          <select id="country" className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" loading={busy}>
          Run analysis
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
