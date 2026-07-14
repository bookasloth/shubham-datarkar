import type { Metadata } from "next";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";

export const metadata: Metadata = {
  title: "Games",
  description: "Daily word and code puzzles — Alfazy, Hit and Blow, Integra.",
};

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellUser();
  return (
    <AppShell user={user}>
      <div data-games className="py-8">{children}</div>
    </AppShell>
  );
}
