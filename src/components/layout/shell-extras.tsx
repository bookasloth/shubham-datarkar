"use client";

import dynamic from "next/dynamic";

// Non-critical, client-only shell widgets — lazy-loaded (ssr:false) so their JS
// never sits in the initial public-page bundle or blocks first render (SEO C1).
// None have SSR value: a route-progress bar, a decorative torch overlay, and a
// Cmd-K palette that's hidden until invoked.
const NavProgress = dynamic(() => import("./nav-progress").then((m) => m.NavProgress), { ssr: false });
const TorchOverlay = dynamic(() => import("./torch-overlay").then((m) => m.TorchOverlay), { ssr: false });
const CommandMenu = dynamic(() => import("./command-menu").then((m) => m.CommandMenu), { ssr: false });

export function ShellExtras() {
  return (
    <>
      <NavProgress />
      <TorchOverlay />
      <CommandMenu />
    </>
  );
}
