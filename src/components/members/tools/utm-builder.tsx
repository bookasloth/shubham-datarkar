"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";

const FIELDS = [
  { key: "utm_source", label: "Source", placeholder: "newsletter, instagram, google" },
  { key: "utm_medium", label: "Medium", placeholder: "email, social, cpc" },
  { key: "utm_campaign", label: "Campaign", placeholder: "spring-launch" },
  { key: "utm_term", label: "Term (optional)", placeholder: "paid keyword" },
  { key: "utm_content", label: "Content (optional)", placeholder: "cta-button-a" },
] as const;

export default function UtmBuilder() {
  const [url, setUrl] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});

  const output = useMemo(() => {
    if (!url.trim()) return "";
    let base: URL;
    try {
      base = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    } catch {
      return "";
    }
    for (const f of FIELDS) {
      const v = params[f.key]?.trim();
      if (v) base.searchParams.set(f.key, v.toLowerCase().replace(/\s+/g, "-"));
    }
    return base.toString();
  }, [url, params]);

  return (
    <div className="grid max-w-xl gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        Destination URL
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/landing-page"
          className="h-10 rounded-input border border-input bg-background px-3 text-sm font-normal outline-none transition-ui focus:border-brand"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1.5 text-sm font-medium">
            {f.label}
            <input
              value={params[f.key] ?? ""}
              onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="h-10 rounded-input border border-input bg-background px-3 text-sm font-normal outline-none transition-ui focus:border-brand"
            />
          </label>
        ))}
      </div>

      <div className="rounded-card border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">Tagged URL</span>
          {output && <CopyButton value={output} label="Copy" />}
        </div>
        <p className="mt-2 break-all font-mono text-sm">
          {output || "Fill in the URL above to build your link."}
        </p>
      </div>
    </div>
  );
}
