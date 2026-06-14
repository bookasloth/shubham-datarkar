/** Registry of DB-backed content entities. Drives the generic admin pages. */

export type EntityKey =
  | "case-studies"
  | "projects"
  | "products"
  | "services"
  | "testimonials";

export type EntityDef = {
  /** URL key under /admin/content/<key>. */
  key: EntityKey;
  /** Postgres table name. */
  table: string;
  /** Plural display label. */
  label: string;
  /** Whether rows carry a slug (testimonials don't). */
  hasSlug: boolean;
  /** Keys to try, in order, for a human-readable row title from `data`. */
  titleKeys: string[];
};

export const ENTITIES: Record<EntityKey, EntityDef> = {
  "case-studies": { key: "case-studies", table: "case_studies", label: "Case Studies", hasSlug: true, titleKeys: ["title", "client"] },
  projects: { key: "projects", table: "projects", label: "Projects", hasSlug: true, titleKeys: ["name", "title"] },
  products: { key: "products", table: "products", label: "Products", hasSlug: true, titleKeys: ["name"] },
  services: { key: "services", table: "services", label: "Services", hasSlug: true, titleKeys: ["name"] },
  testimonials: { key: "testimonials", table: "testimonials", label: "Testimonials", hasSlug: false, titleKeys: ["name", "company"] },
};

export const ENTITY_LIST: EntityDef[] = Object.values(ENTITIES);

export function getEntity(key: string): EntityDef | undefined {
  return (ENTITIES as Record<string, EntityDef>)[key];
}

/** Best-effort human title for an admin list row. */
export function rowTitle(def: EntityDef, data: Record<string, unknown>, fallback: string): string {
  for (const k of def.titleKeys) {
    const v = data?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}
