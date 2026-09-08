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
  setCollectionMovies,
} from "@/lib/movies/actions";

const TEXTAREA = "w-full rounded-btn border border-border bg-background p-2 text-sm";

export type PickMovie = { id: string; title: string; posterUrl: string | null; year: string };

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function CollectionEditor({
  mode,
  collection,
  allMovies = [],
  initialMovies = [],
}: {
  mode: "create" | "edit";
  collection?: { id: string; title: string; description: string | null; coverUrl: string | null; isPublished: boolean };
  allMovies?: PickMovie[];
  initialMovies?: PickMovie[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = React.useState(collection?.title ?? "");
  const [description, setDescription] = React.useState(collection?.description ?? "");
  const [coverUrl, setCoverUrl] = React.useState(collection?.coverUrl ?? "");
  const [isPublished, setIsPublished] = React.useState(collection?.isPublished ?? true);
  const [savingInfo, setSavingInfo] = React.useState(false);

  const [items, setItems] = React.useState<PickMovie[]>(initialMovies);
  const [savingMovies, setSavingMovies] = React.useState(false);
  const [pickQuery, setPickQuery] = React.useState("");

  async function saveInfo() {
    if (!title.trim()) {
      toast({ title: "Give the collection a title.", variant: "danger" });
      return;
    }
    setSavingInfo(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("coverUrl", coverUrl);
    fd.set("isPublished", isPublished ? "true" : "false");
    const res = mode === "create" ? await createCollection(fd) : await updateCollection(collection!.id, fd);
    setSavingInfo(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: mode === "create" ? "Collection created" : "Saved", variant: "success" });
    if (mode === "create") router.push(`/admin/collections/${res.id}`);
    else router.refresh();
  }

  async function persist(next: PickMovie[]) {
    if (!collection) return;
    setItems(next);
    setSavingMovies(true);
    const res = await setCollectionMovies(collection.id, next.map((m) => m.id));
    setSavingMovies(false);
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
    persist(items.filter((m) => m.id !== id));
  }

  function add(movie: PickMovie) {
    if (items.some((m) => m.id === movie.id)) return;
    persist([...items, movie]);
    setPickQuery("");
  }

  const inCollection = new Set(items.map((m) => m.id));
  const matches = pickQuery.trim()
    ? allMovies
        .filter((m) => !inCollection.has(m.id) && m.title.toLowerCase().includes(pickQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <div className="grid max-w-3xl gap-6">
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Collection</legend>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Description" htmlFor="desc">
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <Field label="Cover image URL (optional — defaults to first movie)" htmlFor="cover">
          <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Published
        </label>
        <div>
          <Button type="button" onClick={saveInfo} loading={savingInfo}>
            {mode === "create" ? "Create collection" : "Save collection"}
          </Button>
        </div>
      </fieldset>

      {mode === "edit" && collection && (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">
            Movies {savingMovies && <span className="text-xs text-muted-foreground">· saving…</span>}
          </legend>

          {/* Picker */}
          <div className="relative">
            <Input
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
              placeholder="Add a movie by title…"
            />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-btn border border-border bg-popover shadow-md">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => add(m)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Plus className="size-3.5 text-muted-foreground" />
                      {m.title} {m.year && <span className="text-muted-foreground">({m.year})</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ordered list */}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movies yet — search above to add some.</p>
          ) : (
            <ol className="divide-y divide-border rounded-btn border border-border">
              {items.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 p-2">
                  <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    {m.posterUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.posterUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.title} {m.year && <span className="text-muted-foreground">({m.year})</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></IconBtn>
                    <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown /></IconBtn>
                    <IconBtn label="Remove" onClick={() => remove(m.id)}><X /></IconBtn>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </fieldset>
      )}

      {mode === "edit" && (
        <div>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/collections")}>
            Back to collections
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
