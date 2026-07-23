import type { Product } from "@/lib/data/types";
import { getPublishedEntityBySlug } from "@/lib/content/queries";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Product — Shubham Datarkar";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedEntityBySlug<Product>("products", slug);
  return ogImage({
    eyebrow: product?.category ?? "Product",
    title: product?.name ?? "Products",
  });
}
