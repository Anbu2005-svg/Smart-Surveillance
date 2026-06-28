-- Run this once in Supabase SQL Editor
-- It creates all tables used by this project.

-- Public bucket used by the backend to store detected/annotated JPEG frames.
-- The backend uploads with the service-role key; the frontend reads public URLs.
insert into storage.buckets (id, name, public)
values ('detected-images', 'detected-images', true)
on conflict (id) do update set public = excluded.public;

create table if not exists public.camera_streams (
  id text primary key,
  name text not null,
  source text not null,
  input_method text,
  target_classes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.camera_streams
  add column if not exists input_method text,
  add column if not exists target_classes jsonb not null default '[]'::jsonb;

create table if not exists public.camera_feeds (
  id bigserial primary key,
  stream_id text not null,
  stream_name text,
  source text,
  input_method text,
  status text,
  event_type text,
  event_time timestamptz not null default now()
);

create table if not exists public.detections (
  id bigserial primary key,
  stream_id text not null,
  stream_name text,
  class_name text not null,
  confidence double precision,
  bbox jsonb,
  image_url text,
  event_time timestamptz not null default now()
);

create table if not exists public.security_events (
  id bigserial primary key,
  stream_id text not null,
  stream_name text,
  event_type text not null,
  severity text,
  details jsonb,
  event_time timestamptz not null default now()
);

create table if not exists public.auth_attempts (
  id bigserial primary key,
  email text,
  provider text,
  success boolean not null,
  reason text,
  attempted_at timestamptz not null default now()
);

-- Per-user Telegram destination for user-specific alerts.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  telegram_chat_id text,
  telegram_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backend-owned tables are written through the server with the service role key.
-- Keep direct client access closed; service_role bypasses RLS for backend jobs.
alter table public.camera_streams enable row level security;
alter table public.camera_feeds enable row level security;
alter table public.detections enable row level security;
alter table public.security_events enable row level security;

revoke all on table public.camera_streams from anon, authenticated;
revoke all on table public.camera_feeds from anon, authenticated;
revoke all on table public.detections from anon, authenticated;
revoke all on table public.security_events from anon, authenticated;

-- Keep camera_streams updated_at fresh on updates
create or replace function public.set_updated_at_camera_streams()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_at_user_profiles()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_camera_streams_updated_at on public.camera_streams;
create trigger trg_camera_streams_updated_at
before update on public.camera_streams
for each row execute function public.set_updated_at_camera_streams();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at_user_profiles();

-- Optional RLS setup (auth_attempts is written from frontend with anon key)
alter table public.auth_attempts enable row level security;
drop policy if exists "allow_insert_auth_attempts" on public.auth_attempts;
create policy "allow_insert_auth_attempts"
on public.auth_attempts
for insert
to anon, authenticated
with check (
  (email is null or length(email) <= 320)
  and (provider is null or length(provider) <= 64)
  and (reason is null or length(reason) <= 512)
);

alter table public.user_profiles enable row level security;
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Telegram OTP verification audit trail (primary verification is in-memory)
create table if not exists public.telegram_otp_sessions (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  telegram_number text not null,
  status text not null default 'pending',
  chat_id_discovered text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);

alter table public.telegram_otp_sessions enable row level security;
revoke all on table public.telegram_otp_sessions from anon, authenticated;
