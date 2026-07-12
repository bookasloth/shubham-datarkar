"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { getEntity, type EntityKey } from "@/lib/content/registry";
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";
import { site } from "@/lib/site";

/**
 * Revalidate every public ISR page that renders a given entity, so admin edits
 * go live immediately instead of waiting out the 5-min revalidate window.
 * The `[slug]` form + "page" revalidates all prerendered detail paths at once.
 */
function revalidateEntity(key: EntityKey): void {
  switch (key) {
    case "case-studies":
      revalidatePath("/"); // home shows two case studies, selected by slug
      revalidatePath("/me");
      revalidatePath("/case-studies");
      revalidatePath("/case-studies/[slug]", "page");
      break;
    case "products":
      revalidatePath("/products");
      revalidatePath("/products/[slug]", "page");
      break;
    case "services":
      revalidatePath("/"); // home shows three service cards with prices
      revalidatePath("/services");
      revalidatePath("/services/[slug]", "page");
      break;
    case "testimonials":
      revalidatePath("/"); // home shows a static testimonial grid
      revalidatePath("/me");
      revalidatePath("/testimonials");
      break;
    case "projects":
      break; // no public route
  }
}

/** Cross-post a published case study to /community, once (idempotent per slug). */
async function autoPostCaseStudy(
  def: ReturnType<typeof getEntity>,
  row: { slug: string | null; data: unknown; published: boolean },
): Promise<void> {
  if (!def || def.key !== "case-studies" || !row.published || !row.slug) return;
  const d = row.data as { title?: unknown };
  const title = typeof d?.title === "string" && d.title ? d.title : row.slug;
  const url = `${site.url}/case-studies/${row.slug}`;
  await autoPost({ sourceKey: `case:${row.slug}`, body: pick("caseStudy", { title, url }) });
}

/** Parse the editor form into a row. Throws on invalid JSON or unknown entity. */
function parseRow(entityKey: string, formData: FormData) {
  const def = getEntity(entityKey);
  if (!def) throw new Error(`Unknown entity: ${entityKey}`);

  const rawData = String(formData.get("data") ?? "").trim();
  let data: unknown;
  try {
    data = rawData ? JSON.parse(rawData) : {};
  } catch {
    throw new Error("Data is not valid JSON.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Data must be a JSON object.");
  }

  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    def,
    row: {
      slug: def.hasSlug ? slugRaw || null : null,
      data,
      sort: Number(formData.get("sort") ?? 0) || 0,
      published: formData.get("published") === "on",
    },
  };
}

export async function createEntity(entityKey: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const { def, row } = parseRow(entityKey, formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).insert(row);
  if (error) throw new Error(error.message);
  revalidateEntity(def.key);
  await autoPostCaseStudy(def, row);
  redirect(`/admin/content/${def.key}`);
}

export async function updateEntity(entityKey: string, id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const { def, row } = parseRow(entityKey, formData);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateEntity(def.key);
  await autoPostCaseStudy(def, row);
  redirect(`/admin/content/${def.key}`);
}

export async function deleteEntity(entityKey: string, id: string): Promise<void> {
  await requireAdmin();
  const def = getEntity(entityKey);
  if (!def) throw new Error(`Unknown entity: ${entityKey}`);
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from(def.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateEntity(def.key);
  redirect(`/admin/content/${def.key}`);
}
