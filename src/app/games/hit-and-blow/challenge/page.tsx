import { buildMetadata } from "@/lib/seo";
import { ChallengeHub } from "@/components/games/challenge/ChallengeHub";

export function generateMetadata() {
  return buildMetadata({ title: "Hit and Blow Challenges", path: "/games/hit-and-blow/challenge", noIndex: true });
}

export default function Page() {
  return <ChallengeHub game="hit_and_blow" />;
}
