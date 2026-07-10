-- The step machine crawls (R2) and runs TF-IDF (R3) in SEPARATE invocations on
-- Hobby, so the extracted body text must persist between them — it can't live in
-- memory across the boundary. Store it; RLS keeps kalamai_pages service-role only.
-- ponytail: a post-'complete' sweep could null body_text to reclaim space; not
--           needed at current volume.
alter table public.kalamai_pages add column if not exists body_text text;
