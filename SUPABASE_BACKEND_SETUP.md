# Supabase Full Project Setup (Auth + Camera Streams)

This project now uses Supabase in two places:

1. Frontend auth (`surveillance-frontend`) with anon key.
2. Backend camera stream storage (`main.py`) with service role key.

## 1) Create Supabase project

1. Open https://supabase.com and create a project.
2. In **Settings -> API**, copy:
   - Project URL
   - Anon/public key
   - Service role key

## 2) Create streams table in Supabase

Run this SQL in **SQL Editor**:

```sql
create table if not exists public.camera_streams (
  id text primary key,
  name text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_camera_streams()
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

alter table public.camera_streams enable row level security;

drop policy if exists "allow_select_camera_streams" on public.camera_streams;
create policy "allow_select_camera_streams"
on public.camera_streams
for select
to authenticated
using (true);
```

Notes:
- Backend writes with service role key, so it can upsert all rows.
- Frontend currently does not write this table directly.

## 3) Configure frontend env

File: `surveillance-frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 4) Configure backend env

File: `.env`

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STREAMS_TABLE=camera_streams
SUPABASE_TIMEOUT_SEC=10
```

Keep `STREAMS_STORE_PATH=streams_store.json` as fallback storage if Supabase is unavailable.

## 5) Run project

Backend:

```powershell
cd "D:\With_Front_End_CCTV-001 - Copy\CCTV"
python main.py
```

Frontend:

```powershell
cd "D:\With_Front_End_CCTV-001 - Copy\CCTV\surveillance-frontend"
npm run dev
```

## 6) Verify Supabase backend integration

Open:

- `GET http://localhost:5000/api/supabase/status`
- `GET http://localhost:5000/api/info`

Expected:
- `configured: true` for supabase status
- `stream_storage.provider: "supabase"` in api info

## 7) Security checklist

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend.
2. Keep backend `.env` out of version control.
3. Rotate keys immediately if exposed.
