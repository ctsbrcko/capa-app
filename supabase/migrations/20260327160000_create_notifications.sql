create schema if not exists core;

create table if not exists core.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  event_type text not null,
  event_key text null unique,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on core.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on core.notifications(user_id, is_read);

