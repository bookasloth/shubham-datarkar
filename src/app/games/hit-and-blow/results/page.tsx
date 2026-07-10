import { buildMetadata } from "@/lib/seo";
import { ResultsView } from "@/components/games/ResultsView";

export const metadata = buildMetadata({ title: "Hit and Blow — Results", path: "/games/hit-and-blow/results", noIndex: true });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; outcome?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  return <ResultsView game="hit_and_blow" slug="hit-and-blow" searchParams={sp} />;
}
