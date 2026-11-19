-- SPIP drafts: one saved Subject Performance Improvement Plan per teacher,
-- tied to the teacher's account (email) so it follows them to any device.
-- Run once in Supabase -> SQL Editor.

create table if not exists public.carissa_spip_drafts (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null unique,
  teacher_name text,
  class_name text,
  subject text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carissa_spip_drafts_updated_idx
  on public.carissa_spip_drafts (updated_at desc);

alter table public.carissa_spip_drafts enable row level security;
revoke all on table public.carissa_spip_drafts from anon, authenticated;
