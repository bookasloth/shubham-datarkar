"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  RECOMMENDATION_TYPES,
  MOODS,
  type Movie,
  type Genre,
  type Collection,
  type CastMember,
} from "@/lib/movies/types";
import {
  createMovie,
  updateMovie,
  searchTmdb,
  importFromTmdb,
  type MovieInput,
} from "@/lib/movies/actions";
import type { TmdbSearchResult } from "@/lib/movies/tmdb";

const SELECT = "rounded-btn border border-border bg-background px-2 py-2 text-sm";
const TEXTAREA = "w-full rounded-btn border border-border bg-background p-2 text-sm";

// TMDB genre names that differ from ours.
const GENRE_ALIAS: Record<string, string> = {
  "science fiction": "sci-fi",
  "tv movie": "drama",
};

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function MovieEditor({
  mode,
  movie,
  genreIds: initialGenreIds = [],
  collectionIds: initialCollectionIds = [],
  allGenres,
  allCollections,
  tmdbConfigured,
}: {
  mode: "create" | "edit";
  movie?: Movie;
  genreIds?: string[];
  collectionIds?: string[];
  allGenres: Genre[];
  allCollections: Collection[];
  tmdbConfigured: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const r = movie?.review;

  // Metadata
  const [title, setTitle] = React.useState(movie?.title ?? "");
  const [overview, setOverview] = React.useState(movie?.overview ?? "");
  const [tagline, setTagline] = React.useState(movie?.tagline ?? "");
  const [posterUrl, setPosterUrl] = React.useState(movie?.posterUrl ?? "");
  const [backdropUrl, setBackdropUrl] = React.useState(movie?.backdropUrl ?? "");
  const [trailerUrl, setTrailerUrl] = React.useState(movie?.trailerUrl ?? "");
  const [releaseDate, setReleaseDate] = React.useState(movie?.releaseDate ?? "");
  const [releaseYear, setReleaseYear] = React.useState(movie?.releaseYear?.toString() ?? "");
  const [runtime, setRuntime] = React.useState(movie?.runtime?.toString() ?? "");
  const [language, setLanguage] = React.useState(movie?.originalLanguage ?? "");
  const [country, setCountry] = React.useState(movie?.country ?? "");
  const [director, setDirector] = React.useState(movie?.director ?? "");
  const [ageRating, setAgeRating] = React.useState(movie?.ageRating ?? "");
  const [cast, setCast] = React.useState<CastMember[]>(movie?.cast ?? []);
  const [tmdbId, setTmdbId] = React.useState<number | null>(movie?.tmdbId ?? null);

  // Review
  const [rating, setRating] = React.useState(r?.rating?.toString() ?? "");
  const [verdict, setVerdict] = React.useState(r?.verdict ?? "");
  const [recommendationType, setRecommendationType] = React.useState(r?.recommendationType ?? "");
  const [shortReview, setShortReview] = React.useState(r?.shortReview ?? "");
  const [fullReview, setFullReview] = React.useState(r?.fullReview ?? "");
  const [whyRecommend, setWhyRecommend] = React.useState(r?.whyRecommend ?? "");
  const [bestFor, setBestFor] = React.useState(r?.bestFor ?? "");
  const [watchIf, setWatchIf] = React.useState(r?.watchIf ?? "");
  const [notFor, setNotFor] = React.useState(r?.notFor ?? "");
  const [spoilerFree, setSpoilerFree] = React.useState(r?.spoilerFree ?? true);
  const [reviewPublished, setReviewPublished] = React.useState(r?.published ?? false);

  // Taxonomy
  const [moods, setMoods] = React.useState<Set<string>>(new Set(movie?.moods ?? []));
  const [genreSet, setGenreSet] = React.useState<Set<string>>(new Set(initialGenreIds));
  const [collectionSet, setCollectionSet] = React.useState<Set<string>>(new Set(initialCollectionIds));
  const [isPublished, setIsPublished] = React.useState(movie?.isPublished ?? false);

  // TMDB
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [importingId, setImportingId] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setFn(n);
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchTmdb(query);
    setSearching(false);
    if ("error" in res) toast({ title: res.error, variant: "danger" });
    else setResults(res.results);
  }

  async function pick(result: TmdbSearchResult) {
    setImportingId(result.tmdbId);
    const res = await importFromTmdb(result.tmdbId);
    setImportingId(null);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    if (res.existingSlug && mode === "create") {
      toast({
        title: "Already in your library",
        description: "This movie was imported before — edit the existing entry instead.",
        variant: "warning",
      });
    }
    const d = res.details;
    // Fill metadata; never overwrite editorial fields.
    setTitle((t) => t || d.title);
    setOverview(d.overview);
    setTagline(d.tagline ?? "");
    setPosterUrl(d.posterUrl ?? "");
    setBackdropUrl(d.backdropUrl ?? "");
    setTrailerUrl(d.trailerUrl ?? "");
    setReleaseDate(d.releaseDate ?? "");
    setReleaseYear(d.releaseYear?.toString() ?? "");
    setRuntime(d.runtime?.toString() ?? "");
    setLanguage(d.originalLanguage ?? "");
    setCountry(d.country ?? "");
    setDirector(d.director ?? "");
    setAgeRating(d.ageRating ?? "");
    setCast(d.cast);
    setTmdbId(d.tmdbId);
    // Auto-match TMDB genres to ours.
    const bySlug = new Map(allGenres.map((g) => [g.slug, g.id]));
    const byName = new Map(allGenres.map((g) => [g.name.toLowerCase(), g.id]));
    const matched = new Set(genreSet);
    for (const name of d.genres) {
      const key = name.toLowerCase();
      const id = byName.get(key) ?? bySlug.get(GENRE_ALIAS[key] ?? "");
      if (id) matched.add(id);
    }
    setGenreSet(matched);
    setResults([]);
    setQuery("");
    toast({ title: `Imported "${d.title}"`, variant: "success" });
  }

  async function save() {
    if (!title.trim()) {
      toast({ title: "Give the movie a title.", variant: "danger" });
      return;
    }
    setSaving(true);
    const input: MovieInput = {
      title,
      overview,
      tagline,
      posterUrl,
      backdropUrl,
      trailerUrl,
      releaseDate: releaseDate || null,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      runtime: runtime ? Number(runtime) : null,
      originalLanguage: language,
      country,
      director,
      ageRating,
      cast,
      moods: [...moods],
      tmdbId,
      isPublished,
      genreIds: [...genreSet],
      collectionIds: [...collectionSet],
      review: {
        rating: rating ? Number(rating) : null,
        verdict,
        recommendationType,
        shortReview,
        fullReview,
        whyRecommend,
        bestFor,
        watchIf,
        notFor,
        spoilerFree,
        published: reviewPublished,
      },
    };
    const res = mode === "create" ? await createMovie(input) : await updateMovie(movie!.id, input);
    setSaving(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "danger" });
      return;
    }
    toast({ title: mode === "create" ? "Movie created" : "Saved", variant: "success" });
    router.push("/admin/movies");
    router.refresh();
  }

  return (
    <div className="grid max-w-3xl gap-6">
      {/* TMDB import */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Import from TMDB</legend>
        {!tmdbConfigured && (
          <p className="text-xs text-warning">
            TMDB isn&apos;t configured (set TMDB_ACCESS_TOKEN). You can still enter everything manually.
          </p>
        )}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search a movie title…"
            disabled={!tmdbConfigured}
          />
          <Button type="button" onClick={runSearch} loading={searching} disabled={!tmdbConfigured}>
            <Search /> Search
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="divide-y divide-border rounded-btn border border-border">
            {results.map((res) => (
              <li key={res.tmdbId} className="flex items-center gap-3 p-2">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {res.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={res.posterUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {res.title} {res.releaseYear ? `(${res.releaseYear})` : ""}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{res.overview}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => pick(res)}
                  loading={importingId === res.tmdbId}
                >
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {/* Metadata */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Movie metadata</legend>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Tagline" htmlFor="tagline">
          <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="Overview" htmlFor="overview">
          <textarea id="overview" value={overview} onChange={(e) => setOverview(e.target.value)} className={TEXTAREA} rows={3} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Poster URL" htmlFor="poster">
            <Input id="poster" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://image.tmdb.org/…" />
          </Field>
          <Field label="Backdrop URL" htmlFor="backdrop">
            <Input id="backdrop" value={backdropUrl} onChange={(e) => setBackdropUrl(e.target.value)} />
          </Field>
        </div>
        <Field label="Trailer URL (YouTube)" htmlFor="trailer">
          <Input id="trailer" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Release date" htmlFor="rdate">
            <Input id="rdate" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
          </Field>
          <Field label="Year" htmlFor="ryear">
            <Input id="ryear" inputMode="numeric" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} />
          </Field>
          <Field label="Runtime (min)" htmlFor="rt">
            <Input id="rt" inputMode="numeric" value={runtime} onChange={(e) => setRuntime(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Language" htmlFor="lang">
            <Input id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          <Field label="Age rating" htmlFor="age">
            <Input id="age" value={ageRating} onChange={(e) => setAgeRating(e.target.value)} placeholder="PG-13" />
          </Field>
        </div>
        <Field label="Director" htmlFor="dir">
          <Input id="dir" value={director} onChange={(e) => setDirector(e.target.value)} />
        </Field>
        {cast.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Cast ({cast.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {cast.map((c, i) => (
                <span key={`${c.name}-${i}`} className="inline-flex items-center gap-1 rounded-btn border border-border px-2 py-0.5 text-xs">
                  {c.name}
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => setCast(cast.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      {/* Review */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">My review</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating (0–10)" htmlFor="rating">
            <Input id="rating" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="8.5" />
          </Field>
          <Field label="Recommendation" htmlFor="rec">
            <select id="rec" value={recommendationType} onChange={(e) => setRecommendationType(e.target.value)} className={SELECT}>
              <option value="">— none —</option>
              {RECOMMENDATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Verdict (one punchy line)" htmlFor="verdict">
          <Input id="verdict" value={verdict} onChange={(e) => setVerdict(e.target.value)} />
        </Field>
        <Field label="Short review (card + modal)" htmlFor="short">
          <textarea id="short" value={shortReview} onChange={(e) => setShortReview(e.target.value)} className={TEXTAREA} rows={2} />
        </Field>
        <Field label="Full review" htmlFor="full">
          <textarea id="full" value={fullReview} onChange={(e) => setFullReview(e.target.value)} className={TEXTAREA} rows={8} />
        </Field>
        <Field label="Why I recommend it" htmlFor="why">
          <textarea id="why" value={whyRecommend} onChange={(e) => setWhyRecommend(e.target.value)} className={TEXTAREA} rows={4} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who should watch it?" htmlFor="bestfor">
            <textarea id="bestfor" value={bestFor} onChange={(e) => setBestFor(e.target.value)} className={TEXTAREA} rows={2} />
          </Field>
          <Field label="Watch if…" htmlFor="watchif">
            <textarea id="watchif" value={watchIf} onChange={(e) => setWatchIf(e.target.value)} className={TEXTAREA} rows={2} />
          </Field>
        </div>
        <Field label="Who might not like it?" htmlFor="notfor">
          <textarea id="notfor" value={notFor} onChange={(e) => setNotFor(e.target.value)} className={TEXTAREA} rows={2} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={spoilerFree} onChange={(e) => setSpoilerFree(e.target.checked)} /> Spoiler-free
        </label>
      </fieldset>

      {/* Taxonomy */}
      <fieldset className="grid gap-4 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Genres, moods & collections</legend>
        <div className="grid gap-1.5">
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-1.5">
            {allGenres.map((g) => (
              <Chip key={g.id} active={genreSet.has(g.id)} onClick={() => toggle(genreSet, setGenreSet, g.id)}>
                {g.name}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Moods</Label>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <Chip
                key={m}
                active={moods.has(m)}
                onClick={() => {
                  const n = new Set(moods);
                  if (n.has(m)) n.delete(m);
                  else n.add(m);
                  setMoods(n);
                }}
              >
                {m}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Collections</Label>
          {allCollections.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No collections yet — <Link href="/admin/collections/new" className="underline">create one</Link>.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allCollections.map((c) => (
                <Chip key={c.id} active={collectionSet.has(c.id)} onClick={() => toggle(collectionSet, setCollectionSet, c.id)}>
                  {c.title}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      {/* Publish */}
      <fieldset className="grid gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-sm font-medium">Visibility</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Publish movie (public page live)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={reviewPublished} onChange={(e) => setReviewPublished(e.target.checked)} />
          Publish my review (show editorial content)
        </label>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={save} loading={saving}>
          {mode === "create" ? "Create movie" : "Save changes"}
        </Button>
        {movie && (
          <Button type="button" variant="outline" asChild>
            <Link href={`/movies/${movie.slug}`} target="_blank">Preview</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/movies")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-btn border px-2.5 py-1 text-xs transition-ui " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
