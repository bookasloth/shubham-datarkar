import { GameSubnav } from "@/components/games/game-subnav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (<div data-game="integra"><GameSubnav base="/games/integra" />{children}</div>);
}
