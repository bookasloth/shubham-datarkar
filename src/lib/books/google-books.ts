import "server-only";

const BASE = "https://www.googleapis.com/books/v1";
const KEY = process.env.GOOGLE_BOOKS_API_KEY;

export type BookMetadata = {
  googleId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  cover: string | null;
  isbn: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
  categories: string[];
};

export type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

export function googleBooksConfigured(): boolean {
  return true; // keyless works; key only raises quota
}

export function normalizeVolume(v: GoogleVolume): BookMetadata {
  const info = v.volumeInfo ?? {};
  const ids = info.industryIdentifiers ?? [];
  const isbn =
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier ??
    null;
  const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  return {
    googleId: v.id,
    title: info.title ?? "",
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    description: info.description ?? null,
    cover: rawCover ? rawCover.replace(/^http:\/\//, "https://") : null,
    isbn,
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    categories: info.categories ?? [],
  };
}

type GoogleVolumesResponse = { items?: GoogleVolume[] };

async function gbFetch<T>(path: string): Promise<T | null> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${KEY ? `${sep}key=${KEY}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await gbFetch<GoogleVolumesResponse>(`/volumes?q=${encodeURIComponent(q)}&maxResults=12`);
  const items: GoogleVolume[] = data?.items ?? [];
  return items.map(normalizeVolume);
}

export async function getBookDetails(googleId: string): Promise<BookMetadata | null> {
  const data = await gbFetch<GoogleVolume>(`/volumes/${encodeURIComponent(googleId)}`);
  if (!data?.id) return null;
  return normalizeVolume(data);
}
