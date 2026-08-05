"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SEO_TIPS } from "@/lib/kalamai/seo-tips";

type Params = { targetWords: number; tone: string; audience: string; brandFacts: string; contentType: "blog" | "landing" | "product" };
const DEFAULT_PARAMS: Params = { targetWords: 1500, tone: "professional", audience: "", brandFacts: "", contentType: "blog" };

const PHASES = [
  { key: "research", label: "Researching competitors" },
  { key: "write", label: "Writing your article" },
  { key: "done", label: "Done" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function poke(url: string, body: unknown): Promise<{ status: string; progress: number } | null> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  return (await res.json()) as { status: string; progress: number };
}

export function RunOrchestrator({ analysisId, initialStatus }: { analysisId: string; initialStatus: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<"research" | "write" | "done" | "failed">("research");
  const [progress, setProgress] = useState(5);
  const [note, setNote] = useState<string | null>(null);
  const [tip, setTip] = useState(0);

  // Rotate SEO tips while anything is running.
  useEffect(() => {
    if (phase === "done" || phase === "failed") return;
    const t = setInterval(() => setTip((i) => (i + 1) % SEO_TIPS.length), 4500);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      // 1) Drive the analysis to complete.
      let st = initialStatus;
      let staleCount = 0;
      while (!cancelled && st !== "complete" && st !== "failed") {
        const data = await poke("/api/kalamai/step", { id: analysisId });
        if (cancelled) return;
        if (!data) {
          staleCount++;
          if (staleCount >= 8) { setPhase("failed"); setNote("The service isn't responding. Please try again."); return; }
          setNote("Hit a snag, retrying…"); await sleep(1500); continue;
        }
        staleCount = 0;
        st = data.status; setProgress(Math.min(45, data.progress)); setNote(null);
      }
      if (cancelled) return;
      if (st === "failed") { setPhase("failed"); return; }

      // 2) Auto-create the article from stashed params.
      setPhase("write"); setProgress(50);
      let params = DEFAULT_PARAMS;
      try {
        const raw = sessionStorage.getItem(`kalamai-article-params:${analysisId}`);
        if (raw) params = { ...DEFAULT_PARAMS, ...(JSON.parse(raw) as Partial<Params>) };
      } catch { /* use defaults */ }
      const createRes = await fetch("/api/kalamai/articles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, ...params }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (cancelled) return;
      if (!createRes.ok || !created.id) { setNote(created.error ?? "Could not start the article."); setPhase("failed"); return; }
      const articleId = created.id as string;

      // 3) Drive the article to complete.
      let ast = "queued";
      let articleStaleCount = 0;
      while (!cancelled && ast !== "complete" && ast !== "failed") {
        const data = await poke("/api/kalamai/article-step", { id: articleId });
        if (cancelled) return;
        if (!data) {
          articleStaleCount++;
          if (articleStaleCount >= 8) { setPhase("failed"); setNote("The service isn't responding. Please try again."); return; }
          setNote("Writing…"); await sleep(1500); continue;
        }
        articleStaleCount = 0;
        ast = data.status; setProgress(50 + Math.round(data.progress / 2)); setNote(null);
      }
      if (cancelled) return;
      if (ast === "failed") { setPhase("failed"); return; }

      // 4) Done — send them to the finished article.
      setPhase("done"); setProgress(100);
      router.push(`/tools/kalamai/w/${articleId}`);
    })();

    return () => { cancelled = true; };
  }, [analysisId, initialStatus, router]);

  if (phase === "failed") {
    return (
      <div className="rounded-card border border-border bg-card p-6">
        <p className="text-sm font-medium text-danger">This run failed.</p>
        <p className="mt-1 text-sm text-muted-foreground">{note ?? "Your quota was not charged. Start a new one from the KalamAI home."}</p>
      </div>
    );
  }

  const activeIndex = phase === "done" ? 2 : phase === "write" ? 1 : 0;
  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(5, progress))}%` }} />
      </div>
      <ol className="mt-5 space-y-2">
        {PHASES.map((p, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
          return (
            <li key={p.key} className="flex items-center gap-3 text-sm">
              <span className={"flex size-5 items-center justify-center rounded-full border text-[10px] tabular-nums " + (state === "done" ? "border-foreground bg-foreground text-background" : state === "active" ? "border-foreground text-foreground" : "border-border text-muted-foreground")}>{i + 1}</span>
              <span className={state === "todo" ? "text-muted-foreground" : "text-foreground"}>{p.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 rounded-input border border-border bg-background p-3">
        <p className="text-xs font-medium text-muted-foreground">SEO tip</p>
        <p className="mt-1 text-sm text-foreground">{SEO_TIPS[tip]}</p>
      </div>
      {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
