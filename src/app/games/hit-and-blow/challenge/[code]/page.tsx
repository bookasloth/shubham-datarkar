import { buildMetadata } from "@/lib/seo";
import { ChallengePlay } from "@/components/games/challenge/ChallengePlay";

export function generateMetadata() {
  return buildMetadata({ title: "Hit and Blow challenge", path: "/games/hit-and-blow/challenge", noIndex: true });
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ChallengePlay code={code} />;
}
