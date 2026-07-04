import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type Link = { id: string; title: string; url: string; color: string };
export type LinkCategory = { id: string; name: string; slug: string; links: Link[] };

export type AdminLink = {
  id: string;
  category_id: string;
  title: string;
  url: string;
  color: string;
  sort: number;
  published: boolean;
};
export type AdminLinkCategory = {
  id: string;
  name: string;
  slug: string;
  sort: number;
  published: boolean;
  links: AdminLink[];
};

function warn(where: string, e: unknown) {
  console.warn(`[links] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** Public: published categories with their published links, both ordered by sort. */
export async function getPublishedCategoriesWithLinks(): Promise<LinkCategory[]> {
  try {
    const supabase = supabaseAnon();
    const { data: categories, error: catError } = await supabase
      .from("link_categories")
      .select("id,name,slug")
      .eq("published", true)
      .order("sort", { ascending: true });
    if (catError) throw catError;
    if (!categories || categories.length === 0) return [];

    const results: LinkCategory[] = [];
    for (const category of categories as { id: string; name: string; slug: string }[]) {
      const { data: links, error: linksError } = await supabase
        .from("links")
        .select("id,title,url,color")
        .eq("category_id", category.id)
        .eq("published", true)
        .order("sort", { ascending: true });
      if (linksError) throw linksError;
      results.push({ ...category, links: (links as Link[]) ?? [] });
    }
    return results;
  } catch (e) {
    warn("getPublishedCategoriesWithLinks", e);
    return [];
  }
}

/** Admin: all categories with all links, regardless of published state. */
export async function getAllCategoriesWithLinksAdmin(): Promise<AdminLinkCategory[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data: categories, error: catError } = await supabase
      .from("link_categories")
      .select("id,name,slug,sort,published")
      .order("sort", { ascending: true });
    if (catError) throw catError;
    if (!categories || categories.length === 0) return [];

    const results: AdminLinkCategory[] = [];
    for (const category of categories as Omit<AdminLinkCategory, "links">[]) {
      const { data: links, error: linksError } = await supabase
        .from("links")
        .select("id,category_id,title,url,color,sort,published")
        .eq("category_id", category.id)
        .order("sort", { ascending: true });
      if (linksError) throw linksError;
      results.push({ ...category, links: (links as AdminLink[]) ?? [] });
    }
    return results;
  } catch (e) {
    warn("getAllCategoriesWithLinksAdmin", e);
    return [];
  }
}
