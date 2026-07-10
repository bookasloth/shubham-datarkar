import { ResultsView } from "@/components/games/ResultsView";

export const metadata = { title: "Alfazy — Results" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; outcome?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  return <ResultsView game="alfazy" slug="alfazy" searchParams={sp} />;
}
