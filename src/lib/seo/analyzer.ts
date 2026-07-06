import fs from "node:fs";
import path from "node:path";
import type { PageEntry, PageAnalysis, MetadataSource } from "./types";
import { SCHEMA_FUNCTIONS } from "./constants";

function readSource(filePath: string): string {
  const abs = path.join(process.cwd(), filePath);
  try {
    return fs.readFileSync(abs, "utf-8");
  } catch {
    return "";
  }
}

function detectMetadataSource(source: string): MetadataSource {
  if (/export\s+(async\s+)?function\s+generateMetadata/.test(source)) return "generateMetadata";
  if (/buildMetadata\s*\(/.test(source)) return "buildMetadata";
  if (/export\s+const\s+metadata/.test(source)) return "static-export";
  return "none";
}

function extractBuildMetadataArg(source: string, key: string): string | null {
  const pattern = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const buildCall = source.match(/buildMetadata\s*\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/);
  if (!buildCall) return null;
  const match = buildCall[1].match(pattern);
  return match?.[1] ?? null;
}

function extractStaticMetadataField(source: string, key: string): string | null {
  const metadataBlock = source.match(/export\s+const\s+metadata[^=]*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (!metadataBlock) return null;
  const pattern = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const match = metadataBlock[1].match(pattern);
  return match?.[1] ?? null;
}

function detectSchemas(source: string): string[] {
  return SCHEMA_FUNCTIONS.filter((fn) => source.includes(fn));
}

function checkOgImage(filePath: string): "dedicated" | "root-fallback" | "none" {
  const dir = path.join(process.cwd(), path.dirname(filePath));
  const ogFile = path.join(dir, "opengraph-image.tsx");
  if (fs.existsSync(ogFile)) return "dedicated";
  const rootOg = path.join(process.cwd(), "src", "app", "opengraph-image.tsx");
  if (fs.existsSync(rootOg)) return "root-fallback";
  return "none";
}

function countPattern(source: string, pattern: RegExp): number {
  return (source.match(pattern) || []).length;
}

function estimateWordCount(source: string): number {
  // Strip imports, JSX tags, and code constructs; count remaining words
  const text = source
    .replace(/import\s+.*?from\s+["'].*?["'];?/g, "")
    .replace(/export\s+(default\s+)?(async\s+)?function\s+\w+/g, "")
    .replace(/export\s+const\s+\w+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/className="[^"]*"/g, "")
    .replace(/["'`]([^"'`]{2,})["'`]/g, "$1");
  const words = text.split(/\s+/).filter((w) => w.length > 1 && !/^[{}()[\];,.<>=!&|?:]+$/.test(w));
  return Math.round(words.length * 0.4); // discount code tokens
}

function countMissingAlt(source: string): number {
  const imgTags = source.match(/<(?:img|Image)\s[^>]*>/g) || [];
  return imgTags.filter((tag) => !/alt\s*=/.test(tag)).length;
}

export async function analyzePage(entry: PageEntry): Promise<PageAnalysis> {
  const source = readSource(entry.filePath);
  const metadataSource = detectMetadataSource(source);

  let title: string | null = null;
  let description: string | null = null;

  if (metadataSource === "buildMetadata") {
    title = extractBuildMetadataArg(source, "title");
    description = extractBuildMetadataArg(source, "description");
  } else if (metadataSource === "static-export") {
    title = extractStaticMetadataField(source, "title");
    description = extractStaticMetadataField(source, "description");
  }
  // generateMetadata: can't extract static values, leave null

  const hasMetadata = metadataSource !== "none";
  const hasBuildMetadata = metadataSource === "buildMetadata";

  const schemas = detectSchemas(source);

  const wordCount = estimateWordCount(source);

  return {
    hasMetadata,
    metadataSource,
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    // buildMetadata always sets canonical, OG, and Twitter
    hasCanonical: hasBuildMetadata || metadataSource === "generateMetadata",
    hasOgTags: hasBuildMetadata || metadataSource === "generateMetadata",
    hasTwitterCard: hasBuildMetadata || metadataSource === "generateMetadata",
    robotsIndex: !source.includes("noIndex: true") && !source.includes("index: false"),
    robotsFollow: !source.includes("follow: false"),

    schemas: schemas.map((fn) => fn.replace("Schema", "")),
    hasBreadcrumbs: schemas.includes("breadcrumbSchema"),

    ogImageSource: checkOgImage(entry.filePath),

    h1Count: countPattern(source, /<h1[\s>]/gi),
    h2Count: countPattern(source, /<h2[\s>]/gi),
    h3Count: countPattern(source, /<h3[\s>]/gi),
    wordCount,
    readingTime: Math.max(1, Math.round(wordCount / 200)),
    internalLinks: countPattern(source, /href=["']\/[^"']*/g),
    externalLinks: countPattern(source, /href=["']https?:\/\//g),
    imageCount: countPattern(source, /<(?:img|Image)[\s>]/gi),
    missingAltCount: countMissingAlt(source),
  };
}
