-- Background term-frequency tables for distill's Fightin' Words prior (module 4).
-- Populated by the corpus script after the crawl; distill falls back to a uniform
-- prior while these are empty (flags no_background_corpus). Idempotent.

create table if not exists public.kalamai_corpus_terms (
  language text not null,
  term text not null,
  ngram int not null default 1,
  count bigint not null default 0,
  primary key (language, term)
);
create index if not exists kalamai_corpus_terms_lang_idx on public.kalamai_corpus_terms (language);

create table if not exists public.kalamai_corpus_totals (
  language text primary key,
  total_tokens bigint not null default 0,
  doc_count int not null default 0
);

alter table public.kalamai_corpus_terms enable row level security;
alter table public.kalamai_corpus_totals enable row level security;
-- service-role only (no client policy)
