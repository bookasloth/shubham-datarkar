-- Point the search RPC at required_capability instead of visibility.
create or replace function public.search_resources(q text, lim int default 20)
returns table (
  id uuid, slug text, title text, description text, type text,
  category_id uuid, difficulty text, required_capability text, cover_image text,
  featured boolean, published_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.slug, r.title, r.description, r.type, r.category_id,
         r.difficulty, r.required_capability, r.cover_image, r.featured, r.published_at
  from resources r
  where r.status = 'published' and coalesce(r.required_capability,'') <> 'admin_only'
    and (
      r.search @@ plainto_tsquery('english', q)
      or r.title ilike '%' || q || '%'
      or exists (
        select 1 from resource_tag rt join tags t on t.id = rt.tag_id
        where rt.resource_id = r.id and t.name ilike '%' || q || '%'
      )
    )
  order by ts_rank(r.search, plainto_tsquery('english', q)) desc,
           r.published_at desc nulls last
  limit lim;
$$;
