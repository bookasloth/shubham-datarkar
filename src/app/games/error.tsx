"use client";

import { ErrorScreen } from "@/components/app/error-screen";

/** Games segment error boundary — the same site-wide error screen. */
export default function GamesError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}
