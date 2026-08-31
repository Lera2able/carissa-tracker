-- Realtime-ish class race support (polling-based)
-- Run this once in the Supabase SQL editor for the connected project.
--
-- This table stores short-lived "race room" progress snapshots so learners
-- can see who is winning while the race is running.
--
-- NOTE:
-- - The website currently uses the Supabase anon key in the browser.
-- - If you enable RLS on this table, you must add policies; otherwise the app
--   cannot read/write and the live race will not work.

create table if not exists public.carissa_class_race_progress (
  room_id text not null,
  client_id text not null,
  racer_name text,
  progress numeric default 0,
  wpm integer default 0,
  accuracy integer default 100,
  status text default 'racing',
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  primary key (room_id, client_id)
);

create index if not exists carissa_class_race_progress_room_idx
  on public.carissa_class_race_progress (room_id);

create index if not exists carissa_class_race_progress_updated_idx
  on public.carissa_class_race_progress (updated_at);

-- Optional (use with care): keep RLS OFF for internal deployments.
-- alter table public.carissa_class_race_progress enable row level security;
-- create policy "allow anon read race progress"
--   on public.carissa_class_race_progress for select
--   to anon using (true);
-- create policy "allow anon write race progress"
--   on public.carissa_class_race_progress for insert
--   to anon with check (true);
-- create policy "allow anon update race progress"
--   on public.carissa_class_race_progress for update
--   to anon using (true) with check (true);

