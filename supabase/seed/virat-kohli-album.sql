-- Seed: "Virat Kohli Wallpaper" album, and file every currently-unfiled gallery
-- image into it (the existing gallery IS these wallpapers). Run AFTER
-- 20260819000002_gallery_albums.sql. Idempotent — safe to re-run.

insert into public.gallery_albums (title, slug, description)
values ('Virat Kohli Wallpaper', 'virat-kohli-wallpaper', 'Virat Kohli wallpapers.')
on conflict (slug) do nothing;

-- Assign existing unfiled images to the album (no-op once they're filed).
update public.gallery_images gi
set album_id = a.id
from public.gallery_albums a
where a.slug = 'virat-kohli-wallpaper'
  and gi.album_id is null;

-- Cover = the album's first image, only if not already set.
update public.gallery_albums a
set cover_image_id = (
  select gi.id
  from public.gallery_images gi
  where gi.album_id = a.id
  order by gi.display_order asc, gi.created_at desc
  limit 1
)
where a.slug = 'virat-kohli-wallpaper'
  and a.cover_image_id is null;
