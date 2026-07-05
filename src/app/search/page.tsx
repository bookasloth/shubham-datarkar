import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchClient } from "@/components/search/search-client";
import { getPublishedPosts } from "@/lib/blog/queries";

export const metadata = buildMetadata({
  title: "Search",
  description: "Search across articles, case studies, services, and tools.",
  path: "/search",
  noIndex: true,
});

export default async function SearchPage() {
  const articles = await getPublishedPosts();
  return (
    <>
      <PageHero
        eyebrow="Search"
        title="Find anything"
        description="Search the whole site — or press ⌘K from any page for the command palette."
        crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
      />
      <Section>
        <Container size="narrow">
          <Suspense fallback={<Skeleton className="h-12 w-full" />}>
            <SearchClient articles={articles} />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}
