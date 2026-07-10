import { buildMetadata } from "@/lib/seo";
import { ResultsView } from "@/components/games/ResultsView";

export const metadata = buildMetadata({ title: "Alfazy — Results", path: "/games/alfazy/results", noIndex: true });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; outcome?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  return <ResultsView game="alfazy" slug="alfazy" searchParams={sp} />;
}
