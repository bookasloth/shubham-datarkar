"use client";

import * as React from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * On-brand, monochrome audio player. Simulated playback head — no asset
 * needed for the showcase; swap `duration` + wire a real <audio> source later.
 */
export function AudioPlayer({
  title,
  subtitle,
  duration = 214,
  className,
}: {
  title: string;
  subtitle?: string;
  duration?: number;
  className?: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((prev) => {
        if (prev >= duration) {
          setPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, duration]);

  const pct = (t / duration) * 100;

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setT(Math.max(0, Math.min(duration, ratio * duration)));
  }

  return (
    <figure
      className={cn(
        "flex items-center gap-4 rounded-card border border-border bg-card p-4 not-prose",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-ui hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-4.5"
      >
        {playing ? <Pause /> : <Play className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {fmt(t)} / {fmt(duration)}
          </span>
        </div>
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.floor(t)}
          tabIndex={0}
          onClick={seek}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setT((v) => Math.min(duration, v + 5));
            if (e.key === "ArrowLeft") setT((v) => Math.max(0, v - 5));
          }}
          className="group mt-2 h-2 cursor-pointer rounded-full bg-muted"
        >
          <div className="relative h-full rounded-full bg-foreground" style={{ width: `${pct}%` }}>
            <span className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>

      <Volume2 className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
    </figure>
  );
}
