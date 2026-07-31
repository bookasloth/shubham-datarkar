import { buildMetadata } from "@/lib/seo";
import { ChallengeHub } from "@/components/games/challenge/ChallengeHub";

export function generateMetadata() {
  return buildMetadata({ title: "Alfazy Challenges", path: "/games/alfazy/challenge", noIndex: true });
}

export default function Page() {
  return <ChallengeHub game="alfazy" />;
}
