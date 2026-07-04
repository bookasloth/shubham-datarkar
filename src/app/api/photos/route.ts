import { NextResponse } from "next/server";

import { getPublishedPhotos } from "@/lib/photos/queries";
import { computeHasMore } from "@/lib/photos/gallery";

// Reads the DB per request (paginated infinite scroll) — never prerender.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

/**
 * Pagination endpoint for the gallery's infinite scroll. Returns published
 * photos only (delegates to the Task 1 query, which enforces `published=true`)
 * plus a `hasMore` flag so the client knows whether to keep observing.
 *
 * Query: `?offset=&limit=&tag=`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const offset = Math.max(0, Math.floor(Number(searchParams.get("offset")) || 0));
  const rawLimit = Math.floor(Number(searchParams.get("limit")) || DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const tagParam = searchParams.get("tag")?.trim();
  const tag = tagParam ? tagParam : undefined;

  const photos = await getPublishedPhotos({ offset, limit, tag });
  const hasMore = computeHasMore(offset + photos.length, photos.length, limit);

  return NextResponse.json({ photos, hasMore });
}
