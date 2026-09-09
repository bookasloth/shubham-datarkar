import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getBookBySlug, getPublicNotes } from "@/lib/books/queries";
import type { BookNote } from "@/lib/books/types";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return buildMetadata({ title: "Notes", path: `/books/${slug}/notes`, noIndex: true });
  return buildMetadata({
    title: `${book.title} — My Notes`,
    description: `My reading notes and highlights from ${book.title}.`,
    path: `/books/${slug}/notes`,
  });
}

export default async function BookNotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const notes = await getPublicNotes(book.id);
  const groups = groupByChapter(notes);

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Books", path: "/books" },
          { name: book.title, path: `/books/${slug}` },
          { name: "Notes", path: `/books/${slug}/notes` },
        ])}
      />

      <Breadcrumb
        items={[
          { label: "Books", href: "/books" },
          { label: book.title, href: `/books/${slug}` },
          { label: "Notes" },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          My Notes — {book.title}
        </h1>
        <Link
          href={`/books/${slug}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-ui hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to {book.title}
        </Link>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-10 text-center text-muted-foreground">
          No notes yet.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.chapter} className="space-y-4">
              <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">{group.chapter}</h2>
              <div className="space-y-4">
                {group.notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: BookNote }) {
  return (
    <div className="rounded-card border border-border bg-card p-5">
      {note.page != null && (
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Page {note.page}
        </p>
      )}
      {note.quote && (
        <blockquote className="mt-2 border-l-2 border-border pl-4 text-sm italic text-foreground/90">
          {note.quote}
        </blockquote>
      )}
      {note.note && <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">{note.note}</p>}
      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-btn border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Groups notes by chapter, preserving position order; null chapter → "Notes". */
function groupByChapter(notes: BookNote[]): { chapter: string; notes: BookNote[] }[] {
  const groups: { chapter: string; notes: BookNote[] }[] = [];
  const byChapter = new Map<string, BookNote[]>();
  for (const note of notes) {
    const key = note.chapter ?? "Notes";
    if (!byChapter.has(key)) {
      byChapter.set(key, []);
      groups.push({ chapter: key, notes: byChapter.get(key)! });
    }
    byChapter.get(key)!.push(note);
  }
  return groups;
}
