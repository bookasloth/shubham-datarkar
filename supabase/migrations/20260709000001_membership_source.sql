-- Distinguish paid subscriptions from admin-granted gifts.
-- Gifts are activated manually (no Razorpay subscription) and must NOT be
-- counted as paid members. Lifetime gifts use a far-future period end.
alter table public.memberships
  add column if not exists source text not null default 'paid'
    check (source in ('paid', 'gift'));
