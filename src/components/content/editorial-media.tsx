import * as React from "react";
import { ImageIcon, MapPin, MessageCircle } from "lucide-react";
import type { EditorialImage } from "@/lib/data/types";
import { RichText } from "@/components/content/rich-text";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Monochrome SVG placeholder — deterministic from a seed string.     */
/*  Keeps the showcase asset-free and on-brand (no external images).   */
/* ------------------------------------------------------------------ */
function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  return Math.abs(h);
}

export function MonoImage({ seed, alt, ratio = "16/9" }: { seed: string; alt: string; ratio?: string }) {
  const h = hash(seed);
  const cols = 6 + (h % 4);
  const rows = 4 + ((h >> 3) % 3);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = (hash(`${seed}-${r}-${c}`) % 5) < 2;
      if (!on) continue;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={(c / cols) * 100}
          y={(r / rows) * 100}
          width={100 / cols}
          height={100 / rows}
          className="fill-foreground"
          opacity={0.04 + (hash(`${seed}-${c}-${r}`) % 8) * 0.012}
        />,
      );
    }
  }
  return (
    <div
      className="relative w-full overflow-hidden rounded-img border border-border bg-muted/40"
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={alt}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {cells}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="size-7 text-foreground/25" aria-hidden />
      </div>
    </div>
  );
}

/** Figure with optional caption. `featured` widens it beyond the prose column. */
export function Figure({ image, featured }: { image: EditorialImage; featured?: boolean }) {
  return (
    <figure className={cn(featured && "lg:-mx-24 xl:-mx-32")}>
      <MonoImage seed={image.seed} alt={image.alt} ratio={image.ratio ?? "16/9"} />
      {image.caption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          <RichText value={image.caption} />
        </figcaption>
      )}
    </figure>
  );
}

/** Two images side by side; stacks on mobile. */
export function SideBySide({ images }: { images: EditorialImage[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {images.map((img, i) => (
        <Figure key={i} image={{ ...img, ratio: img.ratio ?? "4/3" }} />
      ))}
    </div>
  );
}

/** Swipeable gallery built on the shared Carousel. */
export function Gallery({ images }: { images: EditorialImage[] }) {
  return (
    <Carousel itemClassName="w-[78%] sm:w-[56%]">
      {images.map((img, i) => (
        <Figure key={i} image={{ ...img, ratio: img.ratio ?? "4/3" }} />
      ))}
    </Carousel>
  );
}

/** Responsive 16:9 video embed (YouTube privacy-enhanced by default). */
export function VideoEmbed({
  id,
  title,
  caption,
}: {
  id: string;
  title: string;
  caption?: EditorialImage["caption"];
}) {
  return (
    <figure>
      <div className="relative aspect-video w-full overflow-hidden rounded-img border border-border bg-muted/40">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          <RichText value={caption} />
        </figcaption>
      )}
    </figure>
  );
}

/** Responsive map embed via OpenStreetMap (no API key required). */
export function MapEmbed({ query, label }: { query: string; label: string }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=72.77%2C18.89%2C73.03%2C19.30&layer=mapnik&marker=19.07,72.87`;
  return (
    <figure className="not-prose">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-img border border-border bg-muted/40">
        <iframe
          src={src}
          title={`Map: ${query}`}
          loading="lazy"
          className="absolute inset-0 size-full grayscale"
        />
      </div>
      <figcaption className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden /> {label}
      </figcaption>
    </figure>
  );
}

/** Social-post embed placeholder — styled card, no third-party script. */
export function SocialEmbed({
  author,
  handle,
  text,
  date,
}: {
  author: string;
  handle: string;
  text: string;
  date: string;
}) {
  return (
    <figure className="not-prose rounded-card border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted font-display text-sm font-bold">
          {author
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{author}</div>
          <div className="text-xs text-muted-foreground">{handle}</div>
        </div>
        <MessageCircle className="ml-auto size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{text}</p>
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{date}</div>
    </figure>
  );
}
