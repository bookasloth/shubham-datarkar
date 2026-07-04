import Link from "next/link";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/games" className="text-lg font-bold tracking-tight">
          🎮 Games
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-500">
          <Link href="/games/leaderboard">Leaderboard</Link>
          <Link href="/games/profile">Profile</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
