-- Carissa Tracker security hardening
-- Goal: ensure `public.carissa_learner_activity_results` cannot be read/written from the browser
-- (anon/authenticated keys), and is only accessed via the Cloudflare Worker using the service role.

begin;

-- 1) Turn on RLS (no policies => no rows for anon/authenticated)
alter table if exists public.carissa_learner_activity_results enable row level security;

-- 2) Drop any existing policies on this table (safety: avoids accidentally open policies)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'carissa_learner_activity_results'
  loop
    execute format('drop policy if exists %I on public.carissa_learner_activity_results', pol.policyname);
  end loop;
end $$;

-- 3) Remove direct grants to anon/authenticated roles (defence-in-depth)
revoke all on table public.carissa_learner_activity_results from anon, authenticated;

-- Revoke the sequence tied to `id` if it exists (for serial / identity columns).
do $$
declare
  seq regclass;
begin
  select pg_get_serial_sequence('public.carissa_learner_activity_results', 'id')::regclass into seq;
  if seq is not null then
    execute format('revoke all on sequence %s from anon, authenticated', seq);
  end if;
exception when others then
  -- ignore (table may not use a sequence-backed id)
  null;
end $$;

commit;

