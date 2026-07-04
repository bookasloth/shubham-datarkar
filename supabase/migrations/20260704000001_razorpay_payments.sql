-- Razorpay payments: rename supports provider columns + drop the dead Zoho
-- integration surface. Target: OWN project (oyzzgjrefkppqkxjccot). Idempotent.
-- No paid rows exist yet, so the column renames are safe.

-- supports: rename provider columns (guard so re-runs don't error)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='supports' and column_name='zoho_session_id') then
    alter table public.supports rename column zoho_session_id to razorpay_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='supports' and column_name='zoho_payment_id') then
    alter table public.supports rename column zoho_payment_id to razorpay_payment_id;
  end if;
end $$;

alter index if exists public.supports_zoho_session_idx rename to supports_rzp_order_idx;

-- Drop the dead Zoho integration objects (Kit/Email keep supabase_vault).
drop function if exists public.set_zoho_secret(jsonb);
drop function if exists public.get_zoho_secret();
drop table if exists public.zoho_integration;
