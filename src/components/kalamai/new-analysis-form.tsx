"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
];

const TONES = ["professional", "conversational", "authoritative", "friendly"];
const LENGTHS = [
  { value: 1000, label: "~1,000 words" },
  { value: 1500, label: "~1,500 words" },
  { value: 2000, label: "~2,000 words" },
  { value: 2200, label: "~2,200 words (max)" },
];

const inputClass =
  "h-10 w-full rounded-input border border-border bg-background px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Flow A entry: create an analysis, then hand off to the report page's poller. */
export function NewAnalysisForm() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("IN");
  const [targetWords, setTargetWords] = useState(1500);
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("");
  const [brandFacts, setBrandFacts] = useState("");
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
      if (!res.ok || !data.id) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      sessionStorage.setItem(
        `kalamai-article-params:${data.id}`,
        JSON.stringify({ targetWords, tone, audience: audience.trim(), brandFacts: brandFacts.trim() }),
      );
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
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="len" className="text-xs font-medium text-muted-foreground">
            Length
          </label>
          <select
            id="len"
            className={inputClass}
            value={targetWords}
            onChange={(e) => setTargetWords(Number(e.target.value))}
          >
            {LENGTHS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="tone" className="text-xs font-medium text-muted-foreground">
            Tone
          </label>
          <select id="tone" className={inputClass} value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <label htmlFor="aud" className="text-xs font-medium text-muted-foreground">
          Audience (optional)
        </label>
        <input
          id="aud"
          className={inputClass}
          placeholder="small business owners in Nagpur"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="mt-3 space-y-1">
        <label htmlFor="facts" className="text-xs font-medium text-muted-foreground">
          Brand facts to weave in (optional)
        </label>
        <textarea
          id="facts"
          className={inputClass + " h-20 py-2"}
          placeholder="Founded 2018, 40+ local clients, Google Partner."
          value={brandFacts}
          onChange={(e) => setBrandFacts(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" loading={busy}>
          Generate article
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
