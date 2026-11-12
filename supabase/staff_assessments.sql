-- Staff practical assessment (Administrative Clerk: Asset Control)
-- Already applied to the Supabase project. Kept here for your records.
-- Candidates (anonymous) can only INSERT a fresh, unmarked submission.
-- Results are read only through carissa_staff_assessment_results(pin).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.carissa_staff_assessments (
  id uuid primary key default gen_random_uuid(),
  position_title text not null default 'Administrative Clerk: Asset Control',
  candidate_name text not null check (char_length(candidate_name) between 1 and 80),
  candidate_surname text not null check (char_length(candidate_surname) between 1 and 80),
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  time_used_seconds integer check (time_used_seconds between 0 and 20000),
  auto_submitted boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  auto_marks jsonb,
  auto_total numeric,
  status text not null default 'submitted' check (status in ('submitted','marked')),
  report jsonb,
  final_total numeric,
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint answers_size check (pg_column_size(answers) < 200000)
);

create table if not exists public.carissa_staff_assessment_admin (
  id integer primary key default 1 check (id = 1),
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.carissa_staff_assessments enable row level security;
alter table public.carissa_staff_assessment_admin enable row level security;
revoke all on public.carissa_staff_assessments from anon, authenticated;
revoke all on public.carissa_staff_assessment_admin from anon, authenticated;
grant insert on public.carissa_staff_assessments to anon;

create policy staff_assessment_insert_only on public.carissa_staff_assessments
  for insert to anon
  with check (status = 'submitted' and report is null and final_total is null and marked_at is null);

create or replace function public.carissa_staff_assessment_results(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean; out jsonb;
begin
  select (a.pin_hash = extensions.crypt(coalesce(p_pin,''), a.pin_hash)) into ok
  from public.carissa_staff_assessment_admin a where a.id = 1;
  if ok is distinct from true then
    perform pg_sleep(1.5);
    raise exception 'invalid pin' using errcode = '28000';
  end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.submitted_at desc), '[]'::jsonb) into out
  from public.carissa_staff_assessments s;
  return out;
end; $$;

revoke all on function public.carissa_staff_assessment_results(text) from public;
grant execute on function public.carissa_staff_assessment_results(text) to anon;

-- To change the results PIN later:
-- update public.carissa_staff_assessment_admin
--   set pin_hash = extensions.crypt('NEWPIN', extensions.gen_salt('bf')), updated_at = now() where id = 1;

-- ---------------------------------------------------------------
-- Access codes (applied later): each candidate needs a one-time code
-- such as "candidate 1". Candidates can no longer insert directly; they use
-- carissa_staff_assessment_start(code,name,surname) and
-- carissa_staff_assessment_submit(code,payload). Admin helpers (PIN checked):
-- carissa_staff_assessment_codes_list / _codes_add / _codes_reopen.
-- Table: public.carissa_staff_assessment_codes (code, status unused|started|submitted).
-- To add codes by hand:
-- insert into public.carissa_staff_assessment_codes(code) values ('candidate 11');

-- Admin reset (PIN checked): carissa_staff_assessment_codes_reset(pin, code) makes a code usable again
-- (any submitted paper is kept, renamed "candidate N (reset ...)"), and
-- carissa_staff_assessment_delete(pin, id) permanently removes one paper.
