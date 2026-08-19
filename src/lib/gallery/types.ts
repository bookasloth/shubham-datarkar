export type GalleryImage = {
  id: string;
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

/** DB row shape (snake_case) as selected by the gallery queries. */
export type GalleryRow = {
  id: string;
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

export const GALLERY_SELECT =
  "id, caption, description, location, photographer, image_url, width, height, is_published, display_order, created_at";

export function mapGalleryRow(r: GalleryRow): GalleryImage {
  return {
    id: r.id,
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
