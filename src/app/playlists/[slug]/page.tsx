import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Play } from "lucide-react";
import { buildMetadata, musicPlaylistSchema, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  getPublishedPlaylistBySlug,
  getPublishedPlaylistSlugs,
  getRelatedPlaylists,
} from "@/lib/playlists/queries";
import { platformLabel } from "@/lib/playlists/types";
import { PlaylistCover } from "@/components/playlists/playlist-cover";
import { PlatformBadge } from "@/components/playlists/platform-badge";
import { PlaylistEmbed } from "@/components/playlists/playlist-embed";
import { PlaylistSection } from "@/components/playlists/playlist-section";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublishedPlaylistSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPublishedPlaylistBySlug(slug);
  if (!playlist) return buildMetadata({ title: "Playlist", path: `/playlists/${slug}`, noIndex: true });

  const description =
    playlist.description ||
    `A ${playlist.category ? `${playlist.category.toLowerCase()} ` : ""}playlist I curated on ${platformLabel(playlist.platform)}.`;

  const base = buildMetadata({
    title: `${playlist.title} — Playlist`,
    description,
    path: `/playlists/${playlist.slug}`,
    type: "article",
    publishedTime: playlist.createdAt,
    modifiedTime: playlist.updatedAt,
  });
  return playlist.coverUrl
    ? { ...base, openGraph: { ...base.openGraph, images: [{ url: playlist.coverUrl }] } }
    : base;
}

export default async function PlaylistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const playlist = await getPublishedPlaylistBySlug(slug);
  if (!playlist) notFound();

  const related = await getRelatedPlaylists(playlist, 4);
  const showEmbed = playlist.allowEmbed && !!playlist.embedUrl;

  return (
    <article className="space-y-10">
      <JsonLd
        data={[
          musicPlaylistSchema({
            title: playlist.title,
            description: playlist.description ?? playlist.title,
            path: `/playlists/${playlist.slug}`,
            image: playlist.coverUrl,
            creator: playlist.creatorName,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Playlists", path: "/playlists" },
            { name: playlist.title, path: `/playlists/${playlist.slug}` },
          ]),
        ]}
      />

      <Breadcrumb items={[{ label: "Playlists", href: "/playlists" }, { label: playlist.title }]} />

      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-img border border-border bg-muted shadow-lg sm:w-56">
          <PlaylistCover src={playlist.coverUrl} alt={playlist.title} sizes="224px" priority />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <PlatformBadge platform={playlist.platform} />
            {playlist.category && (
              <span className="rounded-btn border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {playlist.category}
              </span>
            )}
            {playlist.mood && (
              <span className="rounded-btn border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {playlist.mood}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            {playlist.title}
          </h1>
          {playlist.creatorName && (
            <p className="mt-2 text-sm text-muted-foreground">By {playlist.creatorName}</p>
          )}
          <div className="mt-4">
            <a
              href={playlist.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-btn bg-foreground px-6 text-sm font-medium text-background transition-ui hover:opacity-90"
            >
              <Play className="size-4 fill-current" aria-hidden /> Listen on {platformLabel(playlist.platform)}
            </a>
          </div>
        </div>
      </header>

      {showEmbed && (
        <PlaylistEmbed platform={playlist.platform} embedUrl={playlist.embedUrl} title={playlist.title} />
      )}

      {playlist.description && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">About this playlist</h2>
          <p className="max-w-2xl whitespace-pre-line leading-relaxed text-foreground">
            {playlist.description}
          </p>
        </section>
      )}

      {related.length > 0 && (
        <PlaylistSection title={`More ${playlist.category ?? "Playlists"}`} playlists={related} />
      )}

      <div>
        <Link href="/playlists" className="text-sm text-muted-foreground transition-ui hover:text-foreground">
          ← All playlists
        </Link>
      </div>
    </article>
  );
}
