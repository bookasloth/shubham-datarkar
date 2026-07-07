import Link from "next/link";
import { ArrowRight, Download, ExternalLink } from "lucide-react";
import type { Resource } from "@/lib/resources/types";
import { ArticleBody } from "@/components/content/article-body";
import { PromptView } from "./prompt-view";
import { WorkflowView } from "./workflow-view";

function Blocks({ resource }: { resource: Resource }) {
  if (!resource.content?.length) return null;
  return <ArticleBody blocks={resource.content} />;
}

function TemplateLinks({ resource }: { resource: Resource }) {
  const links = resource.meta.links ?? [];
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
        >
          {l.label}
          <ExternalLink className="size-3.5" />
        </a>
      ))}
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  const src = yt
    ? `https://www.youtube-nocookie.com/embed/${yt[1]}`
    : vimeo
      ? `https://player.vimeo.com/video/${vimeo[1]}`
      : null;

  if (!src) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
      >
        Watch video <ExternalLink className="size-3.5" />
      </a>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-card border border-border">
      <iframe
        src={src}
        title="Video"
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/** Download UI lands with the member-features phase; show version info until then. */
function DownloadInfo({ resource }: { resource: Resource }) {
  const { version, changelog } = resource.meta;
  return (
    <div className="rounded-card border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-card bg-muted">
          <Download className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">
            {version ? `Version ${version}` : "Downloadable file"}
          </div>
          <div className="text-xs text-muted-foreground">
            {resource.download_count} download{resource.download_count === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      {changelog && changelog.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {changelog.map((c) => (
            <li key={c.version}>
              <span className="font-medium text-foreground">{c.version}</span> ({c.date}) — {c.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResourceContent({ resource }: { resource: Resource }) {
  switch (resource.type) {
    case "prompt":
      return (
        <div className="space-y-8">
          <PromptView meta={resource.meta} />
          <Blocks resource={resource} />
        </div>
      );
    case "workflow":
      return (
        <div className="space-y-8">
          <Blocks resource={resource} />
          <WorkflowView meta={resource.meta} />
        </div>
      );
    case "template":
      return (
        <div className="space-y-8">
          <TemplateLinks resource={resource} />
          <Blocks resource={resource} />
        </div>
      );
    case "video":
      return (
        <div className="space-y-8">
          {resource.meta.url && <VideoEmbed url={resource.meta.url} />}
          <Blocks resource={resource} />
        </div>
      );
    case "download":
      return (
        <div className="space-y-8">
          <Blocks resource={resource} />
          <DownloadInfo resource={resource} />
        </div>
      );
    case "tool":
      return (
        <div className="space-y-8">
          <Blocks resource={resource} />
          {resource.meta.toolSlug && (
            <Link
              href={`/members/tools/${resource.meta.toolSlug}`}
              className="inline-flex items-center gap-1.5 rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Open tool <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      );
    default:
      return <Blocks resource={resource} />;
  }
}
