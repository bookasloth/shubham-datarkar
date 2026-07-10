"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const LIMIT = 3;
const KEY = "community_meter";

// ponytail: localStorage day-bucket, bypassable by design. Server-side/IP
// metering only if abuse shows up.
export function MeterGate({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const [walled, setWalled] = useState(false);
  useEffect(() => {
    if (isLoggedIn) return;
    const today = new Date().toISOString().slice(0, 10);
    let state: { day: string; count: number } = { day: today, count: 0 };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch {}
    if (state.day !== today) state = { day: today, count: 0 };
    state.count += 1;
    localStorage.setItem(KEY, JSON.stringify(state));
    // localStorage is unreadable during SSR, so the wall decision must happen
    // in this post-hydration effect — a legitimate external-store read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.count > LIMIT) setWalled(true);
  }, [isLoggedIn]);

  if (isLoggedIn) return <>{children}</>;
  return (
    <div className="relative">
      <div
        className={
          walled
            ? "pointer-events-none max-h-[60vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]"
            : ""
        }
      >
        {children}
      </div>
      {walled && (
        <div className="mt-4 rounded-card border border-border bg-card p-6 text-center">
          <h2 className="font-display text-lg font-bold">You&apos;ve hit today&apos;s free reads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to keep reading the community — it&apos;s free.
          </p>
          <Link
            href="/members/login?next=/community"
            className="mt-3 inline-flex rounded-btn bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-ui hover:opacity-90"
          >
            Sign in — free
          </Link>
        </div>
      )}
    </div>
  );
}
