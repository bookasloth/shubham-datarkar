"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  RECOMMENDATION_TYPES,
  READING_STATUSES,
  MOODS,
  type BookWithRelations,
  type BookReview,
  type BookReading,
  type BookNote,
  type BookPage,
} from "@/lib/books/types";
import {
  createBook,
  updateBook,
  searchGoogleBooks,
  saveNote,
  deleteNote,
  saveBookPage,
  deleteBookPage,
  reorderBookPages,
  type BookInput,
} from "@/lib/books/actions";
import type { BookMetadata } from "@/lib/books/google-books";

const SELECT = "rounded-btn border border-border bg-background px-2 py-2 text-sm";
const TEXTAREA = "w-full rounded-btn border border-border bg-background p-2 text-sm";

// Mirrors the unexported PAGE_TYPES in lib/books/actions.ts (kept in sync manually —
// this file was scoped to book-editor.tsx only, so it isn't re-exported from there).
const PAGE_TYPES = [
  "cover",
  "text",
  "review",
  "notes",
  "lessons",
  "quote",
  "image",
  "book_info",
  "recommendations",
] as const;

type BookEditorProps = {
  mode: "create" | "edit";
  book?: BookWithRelations & { review?: BookReview | null; reading?: BookReading | null };
  genreIds?: string[];
  collectionIds?: string[];
  notes?: BookNote[];
  pages?: BookPage[];
  allGenres: { id: string; name: string; slug: string }[];
  allShelves: { id: string; title: string }[];
};

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-btn border px-2.5 py-1 text-xs transition-ui " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function toggle<T>(set: Set<T>, setFn: (s: Set<T>) => void, id: T) {
  const n = new Set(set);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  setFn(n);
}

const emptyNoteForm = { chapter: "", page: "", quote: "", note: "", tags: "", published: false };
const emptyPageForm = { pageType: "text" as string, title: "", content: "", published: true };

export function BookEditor({
  mode,
  book,
  genreIds: initialGenreIds = [],
  collectionIds: initialCollectionIds = [],
  notes: initialNotes = [],
  pages: initialPages = [],
  allGenres,
  allShelves,
}: BookEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const r = book?.review;
  const rd = book?.reading;

  // Metadata
  const [title, setTitle] = React.useState(book?.title ?? "");
  const [subtitle, setSubtitle] = React.useState(book?.subtitle ?? "");
  const [author, setAuthor] = React.useState(book?.author ?? "");
  const [authors, setAuthors] = React.useState((book?.authors ?? []).join(", "));
  const [description, setDescription] = React.useState(book?.description ?? "");
  const [coverUrl, setCoverUrl] = React.useState(book?.coverUrl ?? "");
  const [backdropUrl, setBackdropUrl] = React.useState(book?.backdropUrl ?? "");
  const [isbn, setIsbn] = React.useState(book?.isbn ?? "");
  const [publisher, setPublisher] = React.useState(book?.publisher ?? "");
  const [publicationDate, setPublicationDate] = React.useState(book?.publicationDate ?? "");
  const [publicationYear, setPublicationYear] = React.useState(book?.publicationYear?.toString() ?? "");
  const [pageCount, setPageCount] = React.useState(book?.pageCount?.toString() ?? "");
  const [language, setLanguage] = React.useState(book?.language ?? "");
  const [country, setCountry] = React.useState(book?.country ?? "");
  const [googleId, setGoogleId] = React.useState(book?.googleId ?? "");

  // Reading
  const [status, setStatus] = React.useState(rd?.status ?? "want_to_read");
  const [currentPage, setCurrentPage] = React.useState(rd?.currentPage?.toString() ?? "");
  const [totalPages, setTotalPages] = React.useState(rd?.totalPages?.toString() ?? "");
  const [startedAt, setStartedAt] = React.useState(rd?.startedAt ?? "");
  const [lastReadAt, setLastReadAt] = React.useState(rd?.lastReadAt ?? "");
  const [finishedAt, setFinishedAt] = React.useState(rd?.finishedAt ?? "");

  // Review
  const [rating, setRating] = React.useState(r?.rating?.toString() ?? "");
  const [verdict, setVerdict] = React.useState(r?.verdict ?? "");
  const [recommendationType, setRecommendationType] = React.useState(r?.recommendationType ?? "");
  const [shortReview, setShortReview] = React.useState(r?.shortReview ?? "");
  const [fullReview, setFullReview] = React.useState(r?.fullReview ?? "");
  const [whyRead, setWhyRead] = React.useState(r?.whyRead ?? "");
  const [whyRecommend, setWhyRecommend] = React.useState(r?.whyRecommend ?? "");
  const [whatILearned, setWhatILearned] = React.useState(r?.whatILearned ?? "");
  const [whoShouldRead, setWhoShouldRead] = React.useState(r?.whoShouldRead ?? "");
  const [whoShouldNotRead, setWhoShouldNotRead] = React.useState(r?.whoShouldNotRead ?? "");
  const [reviewPublished, setReviewPublished] = React.useState(r?.published ?? false);

  // Taxonomy
  const [moods, setMoods] = React.useState<Set<string>>(new Set(book?.moods ?? []));
  const [genreSet, setGenreSet] = React.useState<Set<string>>(new Set(initialGenreIds));
  const [shelfSet, setShelfSet] = React.useState<Set<string>>(new Set(initialCollectionIds));
  const [isPublished, setIsPublished] = React.useState(book?.isPublished ?? false);

  // Google Books search
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<BookMetadata[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [pickingId, setPickingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Notes
  const [notes, setNotes] = React.useState<BookNote[]>(initialNotes);
  const [noteForm, setNoteForm] = React.useState(emptyNoteForm);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [savingNote, setSavingNote] = React.useState(false);

  // Pages
  const [pages, setPages] = React.useState<BookPage[]>(initialPages);
  const [pageForm, setPageForm] = React.useState(emptyPageForm);
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [savingPage, setSavingPage] = React.useState(false);

  const cp = currentPage ? Number(currentPage) : null;
  const tp = totalPages ? Number(totalPages) : null;
  const livePercent = cp && tp && tp > 0 ? Math.round((cp / tp) * 100) : null;

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchGoogleBooks(query);
    setSearching(false);
    if ("error" in res) toast({ title: res.error, variant: "danger" });
    else setResults(res.results);
  }

  function pick(result: BookMetadata) {
    setPickingId(result.googleId);
    // Fill metadata; never touch review/reading fields.
    setTitle((t) => t || result.title);
    setSubtitle(result.subtitle ?? "");
    setAuthors(result.authors.join(", "));
    setAuthor((a) => a || result.authors[0] || "");
    setDescription(result.description ?? "");
    setCoverUrl(result.cover ?? "");
    setIsbn(result.isbn ?? "");
    setPublisher(result.publisher ?? "");
    setPublicationDate(result.publishedDate ?? "");
    setPublicationYear(result.publishedDate ? result.publishedDate.slice(0, 4) : "");
    setPageCount(result.pageCount?.toString() ?? "");
    setLanguage(result.language ?? "");
    setGoogleId(result.googleId);
    // Auto-match Google Books categories to our genres.
    const bySlug = new Map(allGenres.map((g) => [g.slug, g.id]));
    const byName = new Map(allGenres.map((g) => [g.name.toLowerCase(), g.id]));
    const matched = new Set(genreSet);
    for (const category of result.categories) {
      const key = category.toLowerCase();
      const id = byName.get(key) ?? bySlug.get(key);
      if (id) matched.add(id);
    }
    setGenreSet(matched);
    setResults([]);
    setQuery("");
    setPickingId(null);
    toast({ title: `Imported "${result.title}"`, variant: "success" });
  }

  async function save() {
    if (!title.trim()) {
      toast({ title: "Give the book a title.", variant: "danger" });
      return;
    }
    setSaving(true);
    const input: BookInput = {
      title,
      subtitle,
      description,
      author,
      authors: authors.split(",").map((s) => s.trim()).filter(Boolean),
      coverUrl,
      backdropUrl,
      isbn,
      publisher,
      publicationDate: publicationDate || null,
      publicationYear: publicationYear ? Number(publicationYear) : null,
      pageCount: pageCount ? Number(pageCount) : null,
      language,
      country,
      moods: [...moods],
      googleId,
      isPublished,
      genreIds: [...genreSet],
      collectionIds: [...shelfSet],
      review: {
        rating: rating ? Number(rating) : null,
        verdict,
        recommendationType,
        shortReview,
        fullReview,
        whyRead,
        whyRecommend,
        whatILearned,
        whoShouldRead,
        whoShouldNotRead,
        published: reviewPublished,
      },
      reading: {
        status,
        currentPage: cp,
        totalPages: tp,
        startedAt: startedAt || null,
        lastReadAt: lastReadAt || null,
        finishedAt: finishedAt || null,
      },
    };
    const res = mode === "create" ? await createBook(input) : await updateBook(book!.id, input);
    setSaving(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: mode === "create" ? "Book created" : "Saved", variant: "success" });
    if (mode === "create") {
      // Notes/pages need a persisted book.id — route there so those panels unlock.
      router.push(`/admin/books/${res.id}`);
    } else {
      router.push("/admin/books");
    }
    router.refresh();
  }

  async function saveNoteForm() {
    if (!book) return;
    setSavingNote(true);
    const res = await saveNote({
      id: editingNoteId ?? undefined,
      bookId: book.id,
      chapter: noteForm.chapter,
      page: noteForm.page ? Number(noteForm.page) : null,
      quote: noteForm.quote,
      note: noteForm.note,
      tags: noteForm.tags.split(",").map((s) => s.trim()).filter(Boolean),
      published: noteForm.published,
    });
    setSavingNote(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    const tagList = noteForm.tags.split(",").map((s) => s.trim()).filter(Boolean);
    const now = new Date().toISOString();
    if (editingNoteId) {
      setNotes((cur) =>
        cur.map((n) =>
          n.id === editingNoteId
            ? {
                ...n,
                chapter: noteForm.chapter || null,
                page: noteForm.page ? Number(noteForm.page) : null,
                quote: noteForm.quote || null,
                note: noteForm.note || null,
                tags: tagList,
                published: noteForm.published,
                updatedAt: now,
              }
            : n,
        ),
      );
    } else {
      setNotes((cur) => [
        ...cur,
        {
          id: res.id,
          bookId: book.id,
          chapter: noteForm.chapter || null,
          page: noteForm.page ? Number(noteForm.page) : null,
          quote: noteForm.quote || null,
          note: noteForm.note || null,
          tags: tagList,
          position: cur.length,
          published: noteForm.published,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    setNoteForm(emptyNoteForm);
    setEditingNoteId(null);
    router.refresh();
  }

  function editNote(n: BookNote) {
    setEditingNoteId(n.id);
    setNoteForm({
      chapter: n.chapter ?? "",
      page: n.page?.toString() ?? "",
      quote: n.quote ?? "",
      note: n.note ?? "",
      tags: n.tags.join(", "),
      published: n.published,
    });
  }

  async function removeNote(id: string) {
    setNotes((cur) => cur.filter((n) => n.id !== id));
    const res = await deleteNote(id);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      router.refresh();
    }
  }

  async function savePageForm() {
    if (!book) return;
    setSavingPage(true);
    const res = await saveBookPage({
      id: editingPageId ?? undefined,
      bookId: book.id,
      pageType: pageForm.pageType,
      title: pageForm.title,
      content: pageForm.content,
      published: pageForm.published,
    });
    setSavingPage(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    const now = new Date().toISOString();
    if (editingPageId) {
      setPages((cur) =>
        cur.map((p) =>
          p.id === editingPageId
            ? {
                ...p,
                pageType: pageForm.pageType,
                title: pageForm.title || null,
                content: pageForm.content || null,
                published: pageForm.published,
                updatedAt: now,
              }
            : p,
        ),
      );
    } else {
      setPages((cur) => [
        ...cur,
        {
          id: res.id,
          bookId: book.id,
          position: cur.length,
          pageType: pageForm.pageType,
          title: pageForm.title || null,
          content: pageForm.content || null,
          metadata: {},
          published: pageForm.published,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    setPageForm(emptyPageForm);
    setEditingPageId(null);
    router.refresh();
  }

  function editPage(p: BookPage) {
    setEditingPageId(p.id);
    setPageForm({
      pageType: p.pageType,
      title: p.title ?? "",
      content: p.content ?? "",
      published: p.published,
    });
  }

  async function removePage(id: string) {
    setPages((cur) => cur.filter((p) => p.id !== id));
    const res = await deleteBookPage(id);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      router.refresh();
    }
  }

  async function movePage(i: number, dir: -1 | 1) {
    if (!book) return;
    const j = i + dir;
    if (j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    setPages(next);
    const res = await reorderBookPages(book.id, next.map((p) => p.id));
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      router.refresh();
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      {/* Google Books import */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Find the book (Google Books)</legend>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search a book title…"
          />
          <Button type="button" onClick={runSearch} loading={searching}>
            <Search /> Search
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="divide-y divide-border rounded-btn border border-border">
            {results.map((res) => (
              <li key={res.googleId} className="flex items-center gap-3 p-2">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {res.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={res.cover} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {res.title} {res.publishedDate ? `(${res.publishedDate.slice(0, 4)})` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{res.authors.join(", ")}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => pick(res)}
                  loading={pickingId === res.googleId}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {/* Book details */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Book details</legend>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle">
          <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author" htmlFor="author">
            <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </Field>
          <Field label="Authors (comma-separated)" htmlFor="authors">
            <Input id="authors" value={authors} onChange={(e) => setAuthors(e.target.value)} />
          </Field>
        </div>
        <Field label="Description" htmlFor="description">
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cover URL" htmlFor="cover">
            <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Backdrop URL" htmlFor="backdrop">
            <Input id="backdrop" value={backdropUrl} onChange={(e) => setBackdropUrl(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ISBN" htmlFor="isbn">
            <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          </Field>
          <Field label="Publisher" htmlFor="publisher">
            <Input id="publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Publication date" htmlFor="pdate">
            <Input id="pdate" type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} />
          </Field>
          <Field label="Year" htmlFor="pyear">
            <Input id="pyear" inputMode="numeric" value={publicationYear} onChange={(e) => setPublicationYear(e.target.value)} />
          </Field>
          <Field label="Page count" htmlFor="pcount">
            <Input id="pcount" inputMode="numeric" value={pageCount} onChange={(e) => setPageCount(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language" htmlFor="lang">
            <Input id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
        </div>
      </fieldset>

      {/* Reading */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Reading</legend>
        <Field label="Status" htmlFor="status">
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current page" htmlFor="cpage">
            <Input id="cpage" inputMode="numeric" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
          </Field>
          <Field label="Total pages" htmlFor="tpage">
            <Input id="tpage" inputMode="numeric" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
          </Field>
        </div>
        {livePercent != null && <p className="text-xs text-muted-foreground">{livePercent}% complete</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Started" htmlFor="started">
            <Input id="started" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </Field>
          <Field label="Last read" htmlFor="lastread">
            <Input id="lastread" type="date" value={lastReadAt} onChange={(e) => setLastReadAt(e.target.value)} />
          </Field>
          <Field label="Finished" htmlFor="finished">
            <Input id="finished" type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
          </Field>
        </div>
      </fieldset>

      {/* Review */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">My review</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating (0–10)" htmlFor="rating">
            <Input id="rating" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="8.5" />
          </Field>
          <Field label="Recommendation" htmlFor="rec">
            <select id="rec" value={recommendationType} onChange={(e) => setRecommendationType(e.target.value)} className={SELECT}>
              <option value="">— none —</option>
              {RECOMMENDATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Verdict (one punchy line)" htmlFor="verdict">
          <Input id="verdict" value={verdict} onChange={(e) => setVerdict(e.target.value)} />
        </Field>
        <Field label="Short review (card + modal)" htmlFor="short">
          <textarea id="short" value={shortReview} onChange={(e) => setShortReview(e.target.value)} className={TEXTAREA} rows={2} />
        </Field>
        <Field label="Full review" htmlFor="full">
          <textarea id="full" value={fullReview} onChange={(e) => setFullReview(e.target.value)} className={TEXTAREA} rows={8} />
        </Field>
        <Field label="Why I read it" htmlFor="whyread">
          <textarea id="whyread" value={whyRead} onChange={(e) => setWhyRead(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <Field label="Why I recommend it" htmlFor="whyrec">
          <textarea id="whyrec" value={whyRecommend} onChange={(e) => setWhyRecommend(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <Field label="What I learned" htmlFor="learned">
          <textarea id="learned" value={whatILearned} onChange={(e) => setWhatILearned(e.target.value)} className={TEXTAREA} rows={4} />
        </Field>
        <p className="-mt-2 text-xs text-muted-foreground">One lesson per line.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who should read it?" htmlFor="whoread">
            <textarea id="whoread" value={whoShouldRead} onChange={(e) => setWhoShouldRead(e.target.value)} className={TEXTAREA} rows={2} />
          </Field>
          <Field label="Who shouldn't?" htmlFor="whonot">
            <textarea id="whonot" value={whoShouldNotRead} onChange={(e) => setWhoShouldNotRead(e.target.value)} className={TEXTAREA} rows={2} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reviewPublished} onChange={(e) => setReviewPublished(e.target.checked)} />
          Publish my review (show editorial content)
        </label>
      </fieldset>

      {/* Taxonomy */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Genres, moods & shelves</legend>
        <div className="grid gap-1.5">
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-1.5">
            {allGenres.map((g) => (
              <Chip key={g.id} active={genreSet.has(g.id)} onClick={() => toggle(genreSet, setGenreSet, g.id)}>
                {g.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Moods</Label>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <Chip key={m} active={moods.has(m)} onClick={() => toggle(moods, setMoods, m)}>
                {m}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Shelves</Label>
          {allShelves.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No shelves yet — <Link href="/admin/collections/new" className="underline">create one</Link>.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allShelves.map((s) => (
                <Chip key={s.id} active={shelfSet.has(s.id)} onClick={() => toggle(shelfSet, setShelfSet, s.id)}>
                  {s.title}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      {/* Notes */}
      {mode === "edit" && book ? (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Notes</legend>
          {notes.length > 0 && (
            <ul className="divide-y divide-border rounded-btn border border-border">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">
                      {n.chapter && <span className="text-muted-foreground">{n.chapter} · </span>}
                      {n.page != null && <span className="text-muted-foreground">p.{n.page} · </span>}
                      {n.published && <span className="text-xs text-success">published</span>}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.quote || n.note}</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => editNote(n)}>Edit</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeNote(n.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 rounded-btn border border-border p-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chapter" htmlFor="nchapter">
                <Input id="nchapter" value={noteForm.chapter} onChange={(e) => setNoteForm({ ...noteForm, chapter: e.target.value })} />
              </Field>
              <Field label="Page" htmlFor="npage">
                <Input id="npage" inputMode="numeric" value={noteForm.page} onChange={(e) => setNoteForm({ ...noteForm, page: e.target.value })} />
              </Field>
            </div>
            <Field label="Quote" htmlFor="nquote">
              <textarea id="nquote" value={noteForm.quote} onChange={(e) => setNoteForm({ ...noteForm, quote: e.target.value })} className={TEXTAREA} rows={2} />
            </Field>
            <Field label="Note" htmlFor="nnote">
              <textarea id="nnote" value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} className={TEXTAREA} rows={2} />
            </Field>
            <Field label="Tags (comma-separated)" htmlFor="ntags">
              <Input id="ntags" value={noteForm.tags} onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noteForm.published} onChange={(e) => setNoteForm({ ...noteForm, published: e.target.checked })} />
              Published
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={saveNoteForm} loading={savingNote}>
                {editingNoteId ? "Save note" : "Add note"}
              </Button>
              {editingNoteId && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingNoteId(null); setNoteForm(emptyNoteForm); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </fieldset>
      ) : (
        mode === "create" && (
          <p className="text-xs text-muted-foreground">Save the book first to add notes and pages.</p>
        )
      )}

      {/* Pages */}
      {mode === "edit" && book && (
        <fieldset className="grid gap-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-medium">Pages</legend>
          {pages.length > 0 && (
            <ol className="divide-y divide-border rounded-btn border border-border">
              {pages.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-muted-foreground">{p.pageType}</span> {p.title}
                  </span>
                  <Button type="button" size="sm" variant="ghost" disabled={i === 0} onClick={() => movePage(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={i === pages.length - 1} onClick={() => movePage(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => editPage(p)}>Edit</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removePage(p.id)}>Delete</Button>
                </li>
              ))}
            </ol>
          )}
          <div className="grid gap-3 rounded-btn border border-border p-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Page type" htmlFor="ptype">
                <select id="ptype" value={pageForm.pageType} onChange={(e) => setPageForm({ ...pageForm, pageType: e.target.value })} className={SELECT}>
                  {PAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title" htmlFor="ptitle">
                <Input id="ptitle" value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} />
              </Field>
            </div>
            <Field label="Content" htmlFor="pcontent">
              <textarea id="pcontent" value={pageForm.content} onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })} className={TEXTAREA} rows={4} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pageForm.published} onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })} />
              Published
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={savePageForm} loading={savingPage}>
                {editingPageId ? "Save page" : "Add page"}
              </Button>
              {editingPageId && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingPageId(null); setPageForm(emptyPageForm); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </fieldset>
      )}

      {/* Publish */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Visibility</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Publish book (public page live)
        </label>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={save} loading={saving}>
          {mode === "create" ? "Create book" : "Save changes"}
        </Button>
        {book && (
          <Button type="button" variant="outline" asChild>
            <Link href={`/books/${book.slug}`} target="_blank">Preview</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/books")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
