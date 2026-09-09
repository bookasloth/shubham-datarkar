"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createCollection,
  updateCollection,
  setCollectionBooks,
} from "@/lib/books/actions";

const TEXTAREA = "w-full rounded-btn border border-border bg-background p-2 text-sm";

export type PickBook = { id: string; title: string; coverUrl: string | null; year: string };

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ShelfEditor({
  mode,
  shelf,
  allBooks = [],
  initialBooks = [],
}: {
  mode: "create" | "edit";
  shelf?: { id: string; title: string; description: string | null; coverUrl: string | null; isPublished: boolean };
  allBooks?: PickBook[];
  initialBooks?: PickBook[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = React.useState(shelf?.title ?? "");
  const [description, setDescription] = React.useState(shelf?.description ?? "");
  const [coverUrl, setCoverUrl] = React.useState(shelf?.coverUrl ?? "");
  const [isPublished, setIsPublished] = React.useState(shelf?.isPublished ?? true);
  const [savingInfo, setSavingInfo] = React.useState(false);

  const [items, setItems] = React.useState<PickBook[]>(initialBooks);
  const [savingBooks, setSavingBooks] = React.useState(false);
  const [pickQuery, setPickQuery] = React.useState("");

  async function saveInfo() {
    if (!title.trim()) {
      toast({ title: "Give the shelf a title.", variant: "danger" });
      return;
    }
    setSavingInfo(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("coverUrl", coverUrl);
    fd.set("isPublished", isPublished ? "true" : "false");
    const res = mode === "create" ? await createCollection(fd) : await updateCollection(shelf!.id, fd);
    setSavingInfo(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: mode === "create" ? "Shelf created" : "Saved", variant: "success" });
    if (mode === "create") router.push(`/admin/books/shelves/${res.id}`);
    else router.refresh();
  }

  async function persist(next: PickBook[]) {
    if (!shelf) return;
    setItems(next);
    setSavingBooks(true);
    const res = await setCollectionBooks(shelf.id, next.map((b) => b.id));
    setSavingBooks(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      router.refresh();
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  }

  function remove(id: string) {
    persist(items.filter((b) => b.id !== id));
  }

  function add(book: PickBook) {
    if (items.some((b) => b.id === book.id)) return;
    persist([...items, book]);
    setPickQuery("");
  }

  const onShelf = new Set(items.map((b) => b.id));
  const matches = pickQuery.trim()
    ? allBooks
        .filter((b) => !onShelf.has(b.id) && b.title.toLowerCase().includes(pickQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <div className="grid max-w-3xl gap-6">
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Shelf</legend>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Description" htmlFor="desc">
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <Field label="Cover image URL (optional — defaults to first book)" htmlFor="cover">
          <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Published
        </label>
        <div>
          <Button type="button" onClick={saveInfo} loading={savingInfo}>
            {mode === "create" ? "Create shelf" : "Save shelf"}
          </Button>
        </div>
      </fieldset>

      {mode === "edit" && shelf && (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">
            Books {savingBooks && <span className="text-xs text-muted-foreground">· saving…</span>}
          </legend>

          {/* Picker */}
          <div className="relative">
            <Input
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
              placeholder="Add a book by title…"
            />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-btn border border-border bg-popover shadow-md">
                {matches.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => add(b)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Plus className="size-3.5 text-muted-foreground" />
                      {b.title} {b.year && <span className="text-muted-foreground">({b.year})</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ordered list */}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books yet — search above to add some.</p>
          ) : (
            <ol className="divide-y divide-border rounded-btn border border-border">
              {items.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 p-2">
                  <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    {b.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {b.title} {b.year && <span className="text-muted-foreground">({b.year})</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></IconBtn>
                    <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown /></IconBtn>
                    <IconBtn label="Remove" onClick={() => remove(b.id)}><X /></IconBtn>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </fieldset>
      )}

      {mode === "edit" && (
        <div>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/books/shelves")}>
            Back to shelves
          </Button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-7 items-center justify-center rounded-btn border border-border text-muted-foreground transition-ui hover:bg-accent hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
