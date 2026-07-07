import type { ContentBlock } from "@/lib/data/types";
import type { Visibility } from "@/lib/members/access";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ResourceType = {
  key: string;
  label: string;
  icon: string | null;
  sort: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort: number;
};

export type Tag = { id: string; name: string; slug: string };

/** Metadata subset used on every list surface. Content never leaves the server ungated. */
export type ResourceCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  category: { name: string; slug: string } | null;
  difficulty: Difficulty | null;
  visibility: Visibility;
  cover_image: string | null;
  featured: boolean;
  reading_time: number | null;
  published_at: string | null;
};

export type Resource = ResourceCard & {
  category_id: string | null;
  excerpt: string | null;
  content: ContentBlock[];
  meta: ResourceMeta;
  status: "draft" | "published" | "archived";
  author: string;
  view_count: number;
  download_count: number;
  bookmark_count: number;
  updated_at: string;
};

/* ---- type-specific meta (stored in resources.meta jsonb) ---- */

export type PromptMeta = {
  role?: string;
  goal?: string;
  promptBody?: string;
  variables?: string[];
  model?: string;
  exampleOutput?: string;
};

export type DownloadMeta = {
  filePath?: string;
  fileSize?: number;
  version?: string;
  changelog?: { version: string; date: string; note: string }[];
};

export type WorkflowStep = {
  title: string;
  body?: string;
  promptSlug?: string;
  toolSlug?: string;
  output?: string;
};

export type WorkflowMeta = { steps?: WorkflowStep[] };

export type TemplateMeta = { links?: { label: string; url: string }[] };

export type VideoMeta = { url?: string };

export type ToolMeta = { toolSlug?: string };

export type ResourceMeta = PromptMeta &
  DownloadMeta &
  WorkflowMeta &
  TemplateMeta &
  VideoMeta &
  ToolMeta;
