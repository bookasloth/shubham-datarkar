import type { ReactNode } from "react";

/**
 * Split-screen frame for the auth pages: inputs on the left, a full-height
 * brand panel on the right. Mobile collapses to the left column only, always
 * full viewport height (100dvh — vh is broken by mobile browser chrome).
 *
 * The right panel is a solid #FE5100 placeholder for now — illustration or
 * per-page copy lands here once the direction is decided.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <div className="hidden bg-[#FE5100] lg:block" aria-hidden />
    </div>
  );
}
