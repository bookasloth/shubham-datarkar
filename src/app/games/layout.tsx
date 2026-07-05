import type { Metadata } from "next";
import GamesHeader from "@/components/games/GamesHeader";

export const metadata: Metadata = {
  title: "Games · Shubham Datarkar",
  description: "Daily word and code puzzles — Alfazy and Hit and Blow. A new puzzle every day.",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <GamesHeader />
      <main className="mx-auto max-w-md px-4 py-8">{children}</main>
    </div>
  );
}
