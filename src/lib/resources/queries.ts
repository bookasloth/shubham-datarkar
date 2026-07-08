import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  Category,
  Resource,
  ResourceCard,
  ResourceType,
  Tag,
} from "./types";

/**
 * The resources table is RLS-locked (admin policies only), so member-facing
 * reads go through the service-role client with app-level gating: list
 * surfaces expose metadata columns only; content/meta are gated by
 * can(capabilities, required_capability) at the page level before rendering.
 */

const CARD_COLS =
  "id,slug,title,description,type,difficulty,required_capability,cover_image,featured,reading_time,published_at,category:resource_categories(name,slug)";

/** Admin-only resources are hidden from every member-facing list. */
function visibleCards(rows: CardRow[]): ResourceCard[] {
  return rows
    .filter((r) => r.required_capability !== "admin_only")
    .map(toCard);
}

type CardRow = Omit<ResourceCard, "category"> & {
  category: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function toCard(row: CardRow): ResourceCard {
  const category = Array.isArray(row.category) ? (row.category[0] ?? null) : row.category;
  return { ...row, category };
}

export type ListFilters = {
  type?: string;
  categoryId?: string;
  difficulty?: string;
  sort?: "newest" | "popular";
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export async function listResources(f: ListFilters = {}): Promise<ResourceCard[]> {
  try {
    let query = supabaseAdmin()
      .from("resources")
      .select(CARD_COLS)
      .eq("status", "published");

    if (f.type) query = query.eq("type", f.type);
    if (f.categoryId) query = query.eq("category_id", f.categoryId);
    if (f.difficulty) query = query.eq("difficulty", f.difficulty);
    if (f.featured !== undefined) query = query.eq("featured", f.featured);

    query =
      f.sort === "popular"
        ? query.order("view_count", { ascending: false })
        : query.order("published_at", { ascending: false, nullsFirst: false });

    const limit = f.limit ?? 24;
    query = query.range(f.offset ?? 0, (f.offset ?? 0) + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return visibleCards((data ?? []) as unknown as CardRow[]);
  } catch (e) {
    console.warn("[resources] list failed", e);
    return [];
  }
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("resources")
      .select(`*,category:resource_categories(name,slug)`)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toCard(data as CardRow) as Resource;
  } catch (e) {
    console.warn("[resources] get by slug failed", e);
    return null;
  }
}

export async function getTagsForResource(resourceId: string): Promise<Tag[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("resource_tag")
      .select("tag:tags(id,name,slug)")
      .eq("resource_id", resourceId);
    if (error) throw error;
    return (data ?? []).flatMap((r) => (r.tag ? [r.tag as unknown as Tag] : []));
  } catch (e) {
    console.warn("[resources] tags failed", e);
    return [];
  }
}

export async function getRelatedResources(
  resource: Pick<Resource, "id" | "category_id">,
  limit = 3,
): Promise<ResourceCard[]> {
  try {
    let query = supabaseAdmin()
      .from("resources")
      .select(CARD_COLS)
      .eq("status", "published")
      .neq("id", resource.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (resource.category_id) query = query.eq("category_id", resource.category_id);
    const { data, error } = await query;
    if (error) throw error;
    return visibleCards((data ?? []) as unknown as CardRow[]);
  } catch (e) {
    console.warn("[resources] related failed", e);
    return [];
  }
}

export async function getNextResource(
  resource: Pick<Resource, "id" | "published_at">,
): Promise<ResourceCard | null> {
  if (!resource.published_at) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("resources")
      .select(CARD_COLS)
      .eq("status", "published")
      .neq("id", resource.id)
      .lt("published_at", resource.published_at)
      .order("published_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return visibleCards((data ?? []) as unknown as CardRow[])[0] ?? null;
  } catch (e) {
    console.warn("[resources] next failed", e);
    return null;
  }
}

/** FTS + tag match via the search_resources RPC. Returns bare cards (no category join). */
export async function searchResources(q: string, limit = 30): Promise<ResourceCard[]> {
  try {
    const { data, error } = await supabaseAdmin().rpc("search_resources", {
      q,
      lim: limit,
    });
    if (error) throw error;
    type Row = Omit<ResourceCard, "category" | "reading_time"> & { category_id: string | null };
    return ((data ?? []) as Row[]).map((r) => ({
      ...r,
      reading_time: null,
      category: null,
    }));
  } catch (e) {
    console.warn("[resources] search failed", e);
    return [];
  }
}

/** Cards for an explicit id set (bookmarks, progress, downloads), input order preserved. */
export async function listResourcesByIds(ids: string[]): Promise<ResourceCard[]> {
  if (!ids.length) return [];
  try {
    const { data, error } = await supabaseAdmin()
      .from("resources")
      .select(CARD_COLS)
      .in("id", ids)
      .eq("status", "published");
    if (error) throw error;
    const byId = new Map(
      ((data ?? []) as unknown as CardRow[]).map((r) => [r.id, toCard(r)]),
    );
    return ids.flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });
  } catch (e) {
    console.warn("[resources] byIds failed", e);
    return [];
  }
}

export async function listCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("resource_categories")
      .select("id,name,slug,description,sort")
      .eq("active", true)
      .order("sort");
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn("[resources] categories failed", e);
    return [];
  }
}

export async function listTypes(): Promise<ResourceType[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("resource_types")
      .select("key,label,icon,sort")
      .eq("active", true)
      .order("sort");
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn("[resources] types failed", e);
    return [];
  }
}
