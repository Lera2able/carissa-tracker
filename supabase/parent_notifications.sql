-- Parent notifications for discipline entries (already applied to the live project).
-- Both tables are locked: no browser access. Only the Cloudflare Worker (service role) uses them.

create table if not exists public.carissa_learner_guardians (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  learner_no integer,
  surname text not null,
  firstname text not null,
  guardian_name text,
  relationship text,
  whatsapp text,
  alt_phone text,
  email text,
  wants_whatsapp boolean not null default true,
  wants_email boolean not null default false,
  guardian2_name text,
  guardian2_relationship text,
  guardian2_phone text,
  consent boolean not null default false,
  is_test boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_name, surname, firstname)
);

create table if not exists public.carissa_parent_notifications (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references public.carissa_learner_guardians(id) on delete set null,
  class_name text,
  surname text,
  firstname text,
  entry_type text,
  entry_summary text,
  channel text not null,            -- 'email' | 'whatsapp'
  status text not null default 'sent', -- sent | failed | queued | link_opened | dismissed
  error text,
  sent_by_email text,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carissa_parent_notifications_learner_idx
  on public.carissa_parent_notifications (class_name, surname, firstname, created_at desc);
create index if not exists carissa_parent_notifications_queue_idx
  on public.carissa_parent_notifications (channel, status, created_at);

alter table public.carissa_learner_guardians enable row level security;
alter table public.carissa_parent_notifications enable row level security;
revoke all on table public.carissa_learner_guardians from anon, authenticated;
revoke all on table public.carissa_parent_notifications from anon, authenticated;

-- Who may send from the school WhatsApp (everyone else queues). Set the real email(s):
-- insert into public.carissa_config (key, value)
-- values ('parent_whatsapp_senders', '["admin-email@example.com"]')
-- on conflict (key) do update set value = excluded.value;
