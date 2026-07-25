import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

const LOGO_WHITE = "https://company-assets.bookasloth.in/images/sd/website/logo-white.webp";

/**
 * Split-screen frame for the auth pages: inputs on the left, a full-height
 * brand panel on the right. Mobile collapses to the left column only, always
 * full viewport height (100dvh — vh is broken by mobile browser chrome).
 *
 * Left inputs get a tighter 4px radius (`[&_input]:rounded-btn`), scoped here so
 * only the auth forms change. The right panel is #FE5100 with faint white
 * line-art (grid, crosshairs, concentric circles, a triangle) and the wordmark.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 [&_input]:rounded-btn">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Your data is secure and private
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-[#FE5100] lg:block" aria-hidden>
        <svg
          className="absolute inset-0 h-full w-full text-white"
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* grid */}
          <g stroke="currentColor" strokeWidth="1" opacity="0.12">
            {[80, 160, 240, 320].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="600" />
            ))}
            {[75, 150, 225, 300, 375, 450, 525].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} />
            ))}
          </g>
          {/* concentric circles, bottom-right */}
          <g stroke="currentColor" strokeWidth="1.5" opacity="0.18">
            <circle cx="330" cy="470" r="60" />
            <circle cx="330" cy="470" r="105" />
            <circle cx="330" cy="470" r="150" />
          </g>
          {/* crosshair marks */}
          <g stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            {[
              [80, 150],
              [240, 300],
              [160, 450],
            ].map(([cx, cy]) => (
              <g key={`${cx}-${cy}`}>
                <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} />
                <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} />
              </g>
            ))}
          </g>
          {/* a triangle line-shape, top-right */}
          <polygon points="300,60 360,170 240,170" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
        </svg>

        {/* wordmark, centered and faint over the line-art */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WHITE} alt="" width={512} height={128} className="h-10 w-auto opacity-95" />
        </div>
      </div>
    </div>
  );
}
