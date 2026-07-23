import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const alt = "Shubham Datarkar — SEO, AEO & GEO";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    category: "Shubham Datarkar",
    title: "Get your brand cited by AI",
    subtitle: "SEO, AEO & GEO for founder-led companies.",
    kind: "home",
  });
}
