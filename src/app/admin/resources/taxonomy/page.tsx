import { getTaxonomyAdmin } from "@/lib/resources/admin-queries";
import { deleteTag, saveCategory, saveType } from "@/lib/resources/taxonomy-actions";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const CELL_INPUT = "h-8 rounded-btn border border-border bg-background px-2 text-sm";

export default async function TaxonomyPage() {
  const { types, categories, tags } = await getTaxonomyAdmin();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Taxonomy"
        description="Categories, resource types, and tags. All DB-driven — no deploy needed."
      />

      {/* Categories */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Categories</h2>
        <div className="mt-4 space-y-2">
          {categories.map((c) => (
            <form
              key={c.id}
              action={saveCategory}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} className={`${CELL_INPUT} w-44`} />
              <input name="slug" defaultValue={c.slug} className={`${CELL_INPUT} w-36`} />
              <input name="sort" type="number" defaultValue={c.sort} className={`${CELL_INPUT} w-16`} />
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="active" defaultChecked={c.active} /> Active
              </label>
              <Button type="submit" variant="outline" size="sm">Save</Button>
            </form>
          ))}
          <form action={saveCategory} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Input name="name" placeholder="New category" className="h-8 w-44" required />
            <input name="sort" type="number" defaultValue={categories.length + 1} className={`${CELL_INPUT} w-16`} />
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="active" defaultChecked /> Active
            </label>
            <Button type="submit" size="sm">Add</Button>
          </form>
        </div>
      </section>

      {/* Types */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Resource types</h2>
        <div className="mt-4 space-y-2">
          {types.map((t) => (
            <form key={t.key} action={saveType} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="key" value={t.key} />
              <span className="w-28 font-mono text-xs text-muted-foreground">{t.key}</span>
              <input name="label" defaultValue={t.label} className={`${CELL_INPUT} w-40`} />
              <input name="sort" type="number" defaultValue={t.sort} className={`${CELL_INPUT} w-16`} />
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="active" defaultChecked={t.active} /> Active
              </label>
              <Button type="submit" variant="outline" size="sm">Save</Button>
            </form>
          ))}
          <form action={saveType} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Input name="key" placeholder="new-type-key" className="h-8 w-36" required />
            <Input name="label" placeholder="Label" className="h-8 w-40" required />
            <input name="sort" type="number" defaultValue={types.length + 1} className={`${CELL_INPUT} w-16`} />
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="active" defaultChecked /> Active
            </label>
            <Button type="submit" size="sm">Add</Button>
          </form>
        </div>
      </section>

      {/* Tags */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Tags</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tags are created from the resource editor; delete unused ones here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <form key={t.id} action={deleteTag} className="inline-flex">
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                title="Delete tag"
                className="rounded-btn border border-border px-2 py-1 text-xs transition-ui hover:border-danger hover:text-danger"
              >
                {t.name} ×
              </button>
            </form>
          ))}
          {!tags.length && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        </div>
      </section>
    </div>
  );
}
