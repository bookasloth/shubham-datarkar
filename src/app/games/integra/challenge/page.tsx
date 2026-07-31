import { buildMetadata } from "@/lib/seo";
import { ChallengeHub } from "@/components/games/challenge/ChallengeHub";

export function generateMetadata() {
  return buildMetadata({ title: "Integra Challenges", path: "/games/integra/challenge", noIndex: true });
}

export default function Page() {
  return <ChallengeHub game="integra" />;
}
