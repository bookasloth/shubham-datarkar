export type GalleryImage = {
  id: string;
  albumId: string | null;
  caption: string;
  description: string | null;
  location: string | null;
  photographer: string | null;
  imageUrl: string;
  width: number;
  height: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageId: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  /** Published-image count + resolved cover URL, when the query joins them in. */
  imageCount?: number;
  coverUrl?: string | null;
};

/** DB row shape (snake_case) as selected by the gallery queries. */
export type GalleryRow = {
  id: string;
  album_id: string | null;
  caption: string | null;
  description: string | null;
  location: string | null;
  photographer: string | null;
  image_url: string;
  width: number;
  height: number;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export type GalleryAlbumRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_id: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export const GALLERY_SELECT =
  "id, album_id, caption, description, location, photographer, image_url, width, height, is_published, display_order, created_at";

export const ALBUM_SELECT =
  "id, title, slug, description, cover_image_id, is_published, display_order, created_at";

export function mapGalleryRow(r: GalleryRow): GalleryImage {
  return {
    id: r.id,
    albumId: r.album_id ?? null,
    caption: r.caption ?? "",
    description: r.description ?? null,
    location: r.location ?? null,
    photographer: r.photographer ?? null,
    imageUrl: r.image_url,
    width: r.width,
    height: r.height,
    isPublished: r.is_published,
    displayOrder: r.display_order,
    createdAt: r.created_at,
  };
}

export function mapAlbumRow(r: GalleryAlbumRow): GalleryAlbum {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description ?? null,
    coverImageId: r.cover_image_id ?? null,
    isPublished: r.is_published,
    displayOrder: r.display_order,
    createdAt: r.created_at,
  };
}

/** URL-safe slug from a title. Empty → "album" so the column is never blank. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "album"
  );
}
