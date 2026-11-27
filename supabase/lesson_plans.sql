-- Lesson plans: private to Mrs E. Makandiwona (access is enforced by the Worker).
-- One row per teacher email; the plans live in data->'lesson_plans'.
-- Run once in Supabase -> SQL Editor.

create table if not exists public.carissa_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null unique,
  teacher_name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carissa_lesson_plans_updated_idx
  on public.carissa_lesson_plans (updated_at desc);

alter table public.carissa_lesson_plans enable row level security;
revoke all on table public.carissa_lesson_plans from anon, authenticated;

-- The Worker accesses this table with its server-only service_role key.
grant usage on schema public to service_role;
grant all on table public.carissa_lesson_plans to service_role;

notify pgrst, 'reload schema';
