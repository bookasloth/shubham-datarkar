import { NextResponse, type NextRequest } from "next/server";
import { gameByCode } from "@/lib/games/registry";

/**
 * Share links: /g/alfz -> /games/alfazy. Deliberately NOT the /s/<code> shortener —
 * these codes are fixed, owned by the registry, and never minted at runtime, so a
 * DB round-trip would buy nothing. An unknown code lands on the hub rather than a
 * 404: the link is in the wild on social, and a dead end is a worse outcome than
 * showing someone the games.
 */
export function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  return ctx.params.then(({ code }) => {
    const game = gameByCode(code.toLowerCase());
    return NextResponse.redirect(
      new URL(game ? `/games/${game.slug}` : "/games", _req.nextUrl.origin),
      307,
    );
  });
}
