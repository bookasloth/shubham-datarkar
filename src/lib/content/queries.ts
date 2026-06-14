import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Admin list row for any content entity. */
export type EntityRow = {
  id: string;
  slug: string | null;
  published: boolean;
  sort: number;
  data: Record<string, unknown>;
};

function warn(where: string, e: unknown) {
  console.warn(`[content] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** Public: all published rows' `data`, ordered by sort. Cast to the entity type. */
export async function getPublishedEntities<T>(table: string): Promise<T[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from(table)
      .select("data,sort")
      .eq("published", true)
      .order("sort", { ascending: true });
    if (error) throw error;
    return ((data as { data: T }[]) ?? []).map((r) => r.data);
  } catch (e) {
    warn(`getPublishedEntities(${table})`, e);
    return [];
  }
}

/** Public: one published row's `data` by slug, or null. */
export async function getPublishedEntityBySlug<T>(table: string, slug: string): Promise<T | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from(table)
      .select("data")
      .eq("published", true)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? ((data as { data: T }).data) : null;
  } catch (e) {
    warn(`getPublishedEntityBySlug(${table})`, e);
    return null;
  }
}

/** Admin: all rows (incl. unpublished). Requires admin session. */
export async function getAllEntitiesAdmin(table: string): Promise<EntityRow[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from(table)
      .select("id,slug,published,sort,data")
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data as EntityRow[]) ?? [];
  } catch (e) {
    warn(`getAllEntitiesAdmin(${table})`, e);
    return [];
  }
}

/** Admin: one row by id, or null. */
export async function getEntityByIdAdmin(table: string, id: string): Promise<EntityRow | null> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from(table)
      .select("id,slug,published,sort,data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as EntityRow) ?? null;
  } catch (e) {
    warn(`getEntityByIdAdmin(${table})`, e);
    return null;
  }
}

/** Admin: count of rows per table (for dashboard). */
export async function countEntities(table: string): Promise<number> {
  try {
    const supabase = await supabaseAuthServer();
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    warn(`countEntities(${table})`, e);
    return 0;
  }
}
