-- ============================================================
-- Competition Pro — Supabase Database Schema
-- Run this in your Supabase SQL editor (one time setup)
-- ============================================================

-- Competitions table
create table if not exists competitions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  date        date not null,
  data        jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Recipes table
create table if not exists recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- User settings table
create table if not exists user_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  competition_type text not null default 'kcbs4',
  updated_at       timestamptz default now()
);

-- ── Indexes ────────────────────────────────────────────────────
create index if not exists competitions_user_id_idx on competitions(user_id);
create index if not exists competitions_date_idx on competitions(user_id, date desc);
create index if not exists recipes_user_id_idx on recipes(user_id);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger competitions_updated_at
  before update on competitions
  for each row execute function update_updated_at();

create or replace trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

-- ── Row Level Security (RLS) ──────────────────────────────────
-- This is the key part — users can ONLY see and edit their own data.

alter table competitions   enable row level security;
alter table recipes        enable row level security;
alter table user_settings  enable row level security;

-- Competitions policies
create policy "Users can view own competitions"
  on competitions for select
  using (auth.uid() = user_id);

create policy "Users can insert own competitions"
  on competitions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own competitions"
  on competitions for update
  using (auth.uid() = user_id);

create policy "Users can delete own competitions"
  on competitions for delete
  using (auth.uid() = user_id);

-- Recipes policies
create policy "Users can view own recipes"
  on recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on recipes for delete
  using (auth.uid() = user_id);

-- User settings policies
create policy "Users can view own settings"
  on user_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update
  using (auth.uid() = user_id);
