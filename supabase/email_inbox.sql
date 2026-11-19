-- Incoming email inbox for replies sent to replies@carissaprimary.co.za.
-- Emails routed to the Cloudflare Worker are stored here via the service role.
-- Locked: no browser (anon / authenticated) access. Only the Worker reads/writes.

create table if not exists public.carissa_email_inbox (
  id uuid primary key default gen_random_uuid(),
  to_addr text,
  from_addr text,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  headers jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists carissa_email_inbox_created_idx
  on public.carissa_email_inbox (created_at desc);

create index if not exists carissa_email_inbox_unread_idx
  on public.carissa_email_inbox (is_read, created_at desc);

alter table public.carissa_email_inbox enable row level security;
revoke all on table public.carissa_email_inbox from anon, authenticated;
