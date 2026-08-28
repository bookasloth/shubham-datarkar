import { buildMetadata } from "@/lib/seo";
import { requireGameUser } from "@/lib/games/session";
import CourtTable from "@/components/games/court-piece/CourtTable";

export const metadata = buildMetadata({
  title: "Court Piece — Room",
  path: "/games/court-piece",
  noIndex: true,
});

export default async function CourtPieceRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireGameUser(`/games/court-piece/${code}`);
  return <CourtTable code={code.toUpperCase()} />;
}
