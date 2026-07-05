import type { Metadata } from "next";
import { getPublishedCategoriesWithLinks } from "@/lib/links/queries";
import { LinkPage } from "@/components/link-page";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shubham Datarkar | Links",
  description: "All my links in one place — projects, resources, social, and more.",
};

export default async function LinkPageRoute() {
  const categories = await getPublishedCategoriesWithLinks();

  if (!categories.length) {
    return <p className="p-8 text-center text-muted-foreground">No links yet.</p>;
  }

  return <LinkPage categories={categories} />;
}
