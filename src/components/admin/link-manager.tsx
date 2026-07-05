"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { AdminLink, AdminLinkCategory } from "@/lib/links/queries";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createLink,
  updateLink,
  deleteLink,
} from "@/lib/links/actions";

function CategoryForm({
  category,
  action,
  onDone,
}: {
  category?: AdminLinkCategory;
  action: (formData: FormData) => void | Promise<void>;
  onDone?: () => void;
}) {
  return (
    <form
      action={action}
      onSubmit={() => onDone?.()}
      className="grid gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name ?? ""} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={category?.slug ?? ""} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sort">Sort order</Label>
        <Input id="sort" name="sort" type="number" defaultValue={category?.sort ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={category?.published ?? true}
        />
        Published
      </label>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

function LinkForm({
  categoryId,
  link,
  action,
  onDone,
}: {
  categoryId: string;
  link?: AdminLink;
  action: (formData: FormData) => void | Promise<void>;
  onDone?: () => void;
}) {
  return (
    <form action={action} onSubmit={() => onDone?.()} className="grid gap-4">
      <input type="hidden" name="category_id" value={categoryId} />
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={link?.title ?? ""} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="url">URL</Label>
        <Input id="url" name="url" defaultValue={link?.url ?? ""} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="color">Color</Label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={link?.color ?? "#000000"}
            className="h-10 w-full rounded-btn border border-border bg-background p-1"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sort">Sort order</Label>
          <Input id="sort" name="sort" type="number" defaultValue={link?.sort ?? 0} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={link?.published ?? true} />
        Published
      </label>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

export function LinkManager({ categories }: { categories: AdminLinkCategory[] }) {
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [editCategoryId, setEditCategoryId] = React.useState<string | null>(null);
  const [addLinkForCategory, setAddLinkForCategory] = React.useState<string | null>(null);
  const [editLinkId, setEditLinkId] = React.useState<string | null>(null);

  const editingCategory = categories.find((c) => c.id === editCategoryId);
  const editingLink = categories
    .flatMap((c) => c.links)
    .find((l) => l.id === editLinkId);

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}" and all its links?`)) return;
    await deleteCategory(id);
  }

  async function handleDeleteLink(id: string, title: string) {
    if (!confirm(`Delete link "${title}"?`)) return;
    await deleteLink(id);
  }

  return (
    <div className="grid gap-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Categories</h2>
          <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
            <Button size="sm" onClick={() => setAddCategoryOpen(true)}>
              Add category
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add category</DialogTitle>
              </DialogHeader>
              <CategoryForm action={createCategory} onDone={() => setAddCategoryOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}

        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Sort</th>
                <th className="p-3">Published</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.slug}</td>
                  <td className="p-3 text-muted-foreground">{c.sort}</td>
                  <td className="p-3 text-muted-foreground">{c.published ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditCategoryId(c.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Links</h2>
        <div className="grid gap-6">
          {categories.map((c) => (
            <div key={c.id} className="rounded-card border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">{c.name}</h3>
                <Dialog
                  open={addLinkForCategory === c.id}
                  onOpenChange={(open) => setAddLinkForCategory(open ? c.id : null)}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddLinkForCategory(c.id)}
                  >
                    Add link
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add link to {c.name}</DialogTitle>
                    </DialogHeader>
                    <LinkForm
                      categoryId={c.id}
                      action={createLink}
                      onDone={() => setAddLinkForCategory(null)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {c.links.length === 0 && (
                <p className="text-sm text-muted-foreground">No links yet.</p>
              )}

              {c.links.length > 0 && (
                <div className="overflow-x-auto rounded-card border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="p-3">Title</th>
                        <th className="p-3">URL</th>
                        <th className="p-3">Color</th>
                        <th className="p-3">Sort</th>
                        <th className="p-3">Published</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {c.links.map((l) => (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="p-3 font-medium">{l.title}</td>
                          <td className="max-w-[16rem] truncate p-3 text-muted-foreground">
                            {l.url}
                          </td>
                          <td className="p-3">
                            <span
                              className="inline-block size-4 rounded-full border border-border align-middle"
                              style={{ backgroundColor: l.color }}
                              title={l.color}
                            />
                          </td>
                          <td className="p-3 text-muted-foreground">{l.sort}</td>
                          <td className="p-3 text-muted-foreground">
                            {l.published ? "Yes" : "No"}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditLinkId(l.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteLink(l.id, l.title)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditCategoryId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              action={updateCategory.bind(null, editingCategory.id)}
              onDone={() => setEditCategoryId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditLinkId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
          </DialogHeader>
          {editingLink && (
            <LinkForm
              categoryId={editingLink.category_id}
              link={editingLink}
              action={updateLink.bind(null, editingLink.id)}
              onDone={() => setEditLinkId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
