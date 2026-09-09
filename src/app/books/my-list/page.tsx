import Link from "next/link";
import { Bookmark } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { isLoggedIn } from "@/lib/movies/queries";
import { getMyBookListBooks } from "@/lib/books/queries";
import { BookGrid } from "@/components/books/book-grid";

// Per-user content — always rendered fresh, never indexed.
export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "My List",
  description: "Books you've saved to read.",
  path: "/books/my-list",
  noIndex: true,
});

export default async function MyListPage() {
  const [loggedIn, books] = await Promise.all([isLoggedIn(), getMyBookListBooks()]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">My List</h1>

      {!loggedIn ? (
        <Empty
          title="Sign in to build your list"
          body="Save books from anywhere on the site and find them here."
          cta={{ href: "/login?returnTo=/books/my-list", label: "Sign in" }}
        />
      ) : books.length === 0 ? (
        <Empty
          title="Nothing on your list yet."
          body="Tap “My List” on any book to save it for later."
          cta={{ href: "/books", label: "Browse books" }}
        />
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      <Bookmark className="mb-3 size-7 text-muted-foreground" aria-hidden />
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      <Link
        href={cta.href}
        className="mt-4 inline-flex h-10 items-center rounded-btn border border-border px-4 text-sm font-medium transition-ui hover:bg-accent"
      >
        {cta.label}
      </Link>
    </div>
  );
}
