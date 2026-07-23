import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Book a free working session — Shubham Datarkar";

export default async function Image() {
  return ogImage({
    category: "Booking",
    title: "Book a free working session",
    subtitle: "30 focused minutes · one concrete next step.",
    kind: "book",
  });
}
