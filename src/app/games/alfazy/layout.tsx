import { GameSubnav } from "@/components/games/game-subnav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><GameSubnav base="/games/alfazy" />{children}</>);
}
