import { BADGES } from "@/lib/badge/registry";
import { renderBadge } from "@/lib/badge/render";

// Revalidate the badge at most hourly; served from the CDN in between.
export const revalidate = 3600;

/** GET /api/badge/[type] → a live, embeddable blueprint SVG badge. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ type: string }> },
) {
  const { type } = await ctx.params;
  const build = BADGES[type];
  if (!build) return new Response("Unknown badge type", { status: 404 });

  const svg = renderBadge(await build());
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
