import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { Category, Resource, ResourceType, Tag } from "./types";

/** Admin list row (metadata + counters, no content). */
export type AdminResourceRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  visibility: string;
  status: string;
  featured: boolean;
  view_count: number;
  updated_at: string;
  category: { name: string } | null;
};

export async function getAllResourcesAdmin(): Promise<AdminResourceRow[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resources")
    .select(
      "id,slug,title,type,visibility,status,featured,view_count,updated_at,category:resource_categories(name)",
    )
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("[resources] admin list failed", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    ...r,
    category: Array.isArray(r.category) ? (r.category[0] ?? null) : r.category,
  })) as AdminResourceRow[];
}

export async function getResourceByIdAdmin(id: string): Promise<Resource | null> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[resources] admin get failed", error);
    return null;
  }
  return (data as Resource | null) ?? null;
}

export async function getTagNamesForResourceAdmin(id: string): Promise<string[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resource_tag")
    .select("tag:tags(name)")
    .eq("resource_id", id);
  if (error) return [];
  return (data ?? []).flatMap((r) => {
    const tag = Array.isArray(r.tag) ? r.tag[0] : r.tag;
    return tag ? [tag.name as string] : [];
  });
}

/** Full taxonomy for admin (including inactive). */
export async function getTaxonomyAdmin(): Promise<{
  types: (ResourceType & { active: boolean })[];
  categories: (Category & { active: boolean })[];
  tags: Tag[];
}> {
  const supabase = await supabaseAuthServer();
  const [types, categories, tags] = await Promise.all([
    supabase.from("resource_types").select("key,label,icon,sort,active").order("sort"),
    supabase
      .from("resource_categories")
      .select("id,name,slug,description,sort,active")
      .order("sort"),
    supabase.from("tags").select("id,name,slug").order("name"),
  ]);
  return {
    types: (types.data ?? []) as (ResourceType & { active: boolean })[],
    categories: (categories.data ?? []) as (Category & { active: boolean })[],
    tags: (tags.data ?? []) as Tag[],
  };
}
