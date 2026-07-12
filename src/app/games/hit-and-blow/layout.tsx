import { GameSubnav } from "@/components/games/game-subnav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (<div data-game="hit-and-blow"><GameSubnav base="/games/hit-and-blow" />{children}</div>);
}
