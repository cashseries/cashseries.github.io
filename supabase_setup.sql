-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- https://supabase.com/dashboard/project/cilzolvntbwnloszjstv/sql/new

-- 1. Create the reviews table
create table if not exists reviews (
  id          bigint generated always as identity primary key,
  name        text    not null default 'Anonymous',
  rating      int     not null check (rating between 1 and 5),
  review_text text    not null,
  created_at  timestamptz not null default now(),
  approved    boolean not null default true
);

-- 2. Enable Row-Level Security
alter table reviews enable row level security;

-- 3. Allow the service_role (used by Netlify functions) to read & write
--    (service_role bypasses RLS by default — no extra policy needed)

-- 4. Optional: allow public/anon role to read approved reviews
--    (only needed if you ever query directly from the client without the proxy)
create policy "public can read approved reviews"
  on reviews for select
  using (approved = true);

-- 5. Allow service_role to insert (already allowed by default, but explicit is better)
create policy "service_role can insert reviews"
  on reviews for insert
  with check (true);

-- Done! Verify with:
-- select * from reviews limit 10;
