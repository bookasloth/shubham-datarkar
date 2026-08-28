import { buildMetadata } from "@/lib/seo";
import { requireGameUser } from "@/lib/games/session";
import CourtEntry from "@/components/games/court-piece/CourtEntry";

export const metadata = buildMetadata({
  title: "Court Piece",
  path: "/games/court-piece",
  noIndex: true,
});

export default async function CourtPiecePage() {
  await requireGameUser("/games/court-piece");
  return <CourtEntry />;
}
