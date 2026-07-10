import { getPublishedCategoriesWithLinks } from "@/lib/links/queries";
import { buildMetadata } from "@/lib/seo";
import { LinkPage } from "@/components/link-page";

export const revalidate = 300;

export const metadata = buildMetadata({
  // No brand in title: the root layout's title.template appends " — Shubham Datarkar".
  title: "Every Link in One Place",
  description:
    "All my links in one place — projects, products, writing, social, and resources. Every destination worth following, collected in a single hub.",
  ogTitle: "Every link in one place",
  ogDescription:
    "Projects, products, writing, social, and resources — every link worth following, collected in one hub.",
  path: "/link",
});

export default async function LinkPageRoute() {
  const categories = await getPublishedCategoriesWithLinks();

  if (!categories.length) {
    return <p className="p-8 text-center text-muted-foreground">No links yet.</p>;
  }

  return <LinkPage categories={categories} />;
}
