"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { cn } from "@/lib/utils";

const SORTS: { key: FeedSort; label: string; hint?: string }[] = [
  { key: "new", label: "New", hint: "Newest first" },
  // Hot is a seeded shuffle, not a ranking — say so, or it reads as a bug when
  // an old post surfaces above a fresh one.
  { key: "hot", label: "Hot", hint: "Shuffled" },
  { key: "top", label: "Top", hint: "Most liked" },
];
const WINDOWS: { key: FeedWindow; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

export function SortMenu({
  sort,
  window,
  tab = "foryou",
}: {
  sort: FeedSort;
  window: FeedWindow;
  tab?: "foryou" | "following";
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const go = (next: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    // Drop the old shuffle seed on any sort change — otherwise picking Hot again
    // replays the exact order you just left, which is the opposite of the point.
    // The page mints a fresh one and redirects.
    params.delete("seed");
    for (const [k, v] of Object.entries(next)) params.set(k, v);
    router.push(`/community?${params.toString()}`);
  };

  const goTab = (nextTab: "foryou" | "following") => {
    const params = new URLSearchParams(sp.toString());
    params.delete("seed");
    if (nextTab === "following") params.set("tab", "following");
    else params.delete("tab");
    router.push(`/community?${params.toString()}`);
  };
  const current = SORTS.find((s) => s.key === sort)?.label ?? "New";
  return (
    <div>
      {/* Tabs, not a fourth sort entry: Following is a different SET of posts,
          and it composes with whichever sort is active. */}
      <div className="grid grid-cols-2 border-b border-border" role="tablist">
        {(
          [
            ["foryou", "For you"],
            ["following", "Following"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => goTab(key)}
            className={cn(
              "relative py-3 text-sm font-medium transition-ui hover:bg-accent",
              tab === key ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-14 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-sm font-medium transition-ui hover:bg-accent">
          {current} <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SORTS.map((s) => (
            <DropdownMenuItem
              key={s.key}
              onClick={() => go({ sort: s.key })}
              className="flex-col items-start gap-0"
            >
              <span>{s.label}</span>
              {s.hint && <span className="text-xs text-muted-foreground">{s.hint}</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {sort === "top" && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-sm text-muted-foreground transition-ui hover:bg-accent">
            {WINDOWS.find((w) => w.key === window)?.label ?? "All Time"}{" "}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {WINDOWS.map((w) => (
              <DropdownMenuItem key={w.key} onClick={() => go({ sort: "top", window: w.key })}>
                {w.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>
    </div>
  );
}
