import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Building in Public — Shubham Datarkar";

export default async function Image() {
  return ogImage({
    category: "Building in Public",
    title: "Everything I'm building, out loud",
    subtitle: "Work, writing, and the receipts behind it.",
    kind: "me",
  });
}
