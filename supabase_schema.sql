-- Run this once in Supabase SQL Editor
-- It creates all tables used by this project.

create table if not exists public.camera_streams (
  id text primary key,
  name text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
with check (true);

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
