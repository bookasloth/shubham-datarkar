-- KalamAI quota gate. One atomic function does dedupe + concurrency + hourly
-- cap + monthly quota, then inserts the job row. Service-role only (called via
-- supabaseAdmin() from quota-server.ts, exactly like bump_resource_counter).
--
-- The job row is the ledger: monthly usage = count of rows this period where
-- status <> 'failed'. A hard failure flips status to 'failed', which drops the
-- row out of the count — that IS the refund. No compensating write.

create or replace function public.kalamai_check_and_consume(
  p_user        uuid,
  p_role        text,
  p_kind        text,   -- 'analysis' | 'article'
  p_keyword     text default null,
  p_country     text default null,
  p_locale      text default null,
  p_analysis_id uuid default null
) returns table (id uuid, outcome text)
language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_used  int;
  v_conc  int;
  v_hour  int;
  v_hit   uuid;
begin
  -- Serialize one user's concurrent create attempts so count-then-insert can't
  -- race. Released at commit. This is the whole concurrency story — no Redis.
  -- ponytail: per-user xact advisory lock; fine for a single DB.
  perform pg_advisory_xact_lock(hashtext('kalamai:' || p_user::text));

  if p_kind = 'analysis' then
    -- Dedupe: same user+keyword+country+locale, not failed, within 10 minutes.
    select a.id into v_hit
    from kalamai_analyses a
    where a.user_id = p_user
      and lower(a.keyword) = lower(coalesce(p_keyword, ''))
      and a.country = coalesce(p_country, 'IN')
      and a.locale = coalesce(p_locale, 'en')
      and a.status <> 'failed'
      and a.created_at > now() - interval '10 minutes'
    order by a.created_at desc
    limit 1;
    if v_hit is not null then
      id := v_hit; outcome := 'deduped'; return next; return;
    end if;

    -- Concurrency cap: max 3 in-flight.
    select count(*) into v_conc from kalamai_analyses
      where user_id = p_user
        and status in ('queued','crawling','extracting','analyzing');
    if v_conc >= 3 then outcome := 'too_many_concurrent'; return next; return; end if;

    -- Hourly create cap: 10/hour.
    select count(*) into v_hour from kalamai_analyses
      where user_id = p_user and created_at > now() - interval '1 hour';
    if v_hour >= 10 then outcome := 'rate_limited'; return next; return; end if;

    -- Monthly quota (status <> 'failed' = auto-refund; -1 = unlimited).
    select analyses_limit into v_limit from kalamai_quotas where role = p_role;
    v_limit := coalesce(v_limit, 0);
    if v_limit = 0 then outcome := 'quota_exceeded'; return next; return; end if;
    if v_limit > 0 then
      select count(*) into v_used from kalamai_analyses
        where user_id = p_user and status <> 'failed'
          and created_at >= date_trunc('month', now());
      if v_used >= v_limit then outcome := 'quota_exceeded'; return next; return; end if;
    end if;

    insert into kalamai_analyses (user_id, keyword, country, locale)
      values (p_user, p_keyword, coalesce(p_country, 'IN'), coalesce(p_locale, 'en'))
      returning kalamai_analyses.id into id;
    outcome := 'created'; return next; return;

  else
    -- article: same concurrency/hourly/quota shape; no dedupe.
    select count(*) into v_conc from kalamai_articles
      where user_id = p_user and status not in ('complete','failed');
    if v_conc >= 3 then outcome := 'too_many_concurrent'; return next; return; end if;

    select count(*) into v_hour from kalamai_articles
      where user_id = p_user and created_at > now() - interval '1 hour';
    if v_hour >= 10 then outcome := 'rate_limited'; return next; return; end if;

    select articles_limit into v_limit from kalamai_quotas where role = p_role;
    v_limit := coalesce(v_limit, 0);
    if v_limit = 0 then outcome := 'quota_exceeded'; return next; return; end if;
    if v_limit > 0 then
      select count(*) into v_used from kalamai_articles
        where user_id = p_user and status <> 'failed'
          and created_at >= date_trunc('month', now());
      if v_used >= v_limit then outcome := 'quota_exceeded'; return next; return; end if;
    end if;

    insert into kalamai_articles (user_id, analysis_id)
      values (p_user, p_analysis_id)
      returning kalamai_articles.id into id;
    outcome := 'created'; return next; return;
  end if;
end $$;

revoke execute on function public.kalamai_check_and_consume(uuid, text, text, text, text, text, uuid)
  from public, anon, authenticated;
