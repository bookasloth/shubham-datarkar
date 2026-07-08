-- Capability-based membership: plans bundle capabilities; content requires them.

-- Free plan needs a non-billing interval; relax the check and add the row.
alter table public.membership_plans drop constraint if exists membership_plans_interval_check;
alter table public.membership_plans
  add constraint membership_plans_interval_check check (interval in ('monthly','yearly','free'));

insert into public.membership_plans (key, name, description, amount, interval, active, sort)
values ('free','Free','Today''s puzzle, yesterday''s puzzle, and public resources.',0,'free',true,0)
on conflict (key) do nothing;

-- Plan -> capability bundle (admin-editable).
create table if not exists public.plan_capabilities (
  plan_key text not null references public.membership_plans(key) on delete cascade,
  capability text not null,
  primary key (plan_key, capability)
);

-- Member tier = both paid plans get every grantable capability.
insert into public.plan_capabilities (plan_key, capability)
select p.key, c.cap
from (values ('premium-monthly'), ('premium-yearly')) as p(key)
cross join (values
  ('view_archive'),('view_premium_blog'),('view_premium_case_study'),
  ('view_premium_video'),('view_premium_course'),('view_premium_album'),
  ('view_premium_resource'),('download_assets'),('download_templates'),
  ('access_prompt_library'),('play_unlimited_games'),('earn_achievements'),
  ('streak_history'),('join_private_community'),('attend_live_sessions'),
  ('access_beta_features'),('early_access')
) as c(cap)
on conflict do nothing;

-- Resources declare the capability they need (null = public).
alter table public.resources add column if not exists required_capability text;

update public.resources set required_capability = case
  when visibility = 'hidden' then 'admin_only'
  when visibility in ('members','premium') then case type
    when 'article'    then 'view_premium_blog'
    when 'case-study' then 'view_premium_case_study'
    when 'video'      then 'view_premium_video'
    when 'prompt'     then 'access_prompt_library'
    when 'template'   then 'download_templates'
    when 'download'   then 'download_assets'
    else 'view_premium_resource'
  end
  else null
end
where required_capability is null;

create index if not exists resources_required_capability_idx
  on public.resources (required_capability);

-- RLS for the new table: public read, admin write.
alter table public.plan_capabilities enable row level security;
create policy plan_capabilities_public_read on public.plan_capabilities
  for select to anon, authenticated using (true);
create policy plan_capabilities_admin_all on public.plan_capabilities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
