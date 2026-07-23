import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Building in Public — Shubham Datarkar";

export default function Image() {
  return ogImage({
    eyebrow: "Shubham Datarkar",
    title: "Building in Public",
    metricLabel: "Work, writing, and the receipts behind it",
  });
}
