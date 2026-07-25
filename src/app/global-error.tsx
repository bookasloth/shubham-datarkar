"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/app/error-screen";

/**
 * Root error boundary — catches errors thrown in the ROOT layout itself, where
 * the normal error.tsx (which lives inside the layout) can't help. It replaces
 * the whole document, so it must render its own <html>/<body>. ErrorScreen uses
 * inline styles precisely so it survives here without globals.css.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ErrorScreen reset={reset} />
      </body>
    </html>
  );
}
