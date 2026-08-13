-- SEO4AI schema for self-hosted Postgres (Coolify).
--
-- GENERATED from supabase/schema.sql by scripts/gen-coolify-schema.mjs.
-- Edit schema.sql and regenerate rather than editing this file.
--
-- Three differences from the Supabase original, and only three:
--
--   1. gen_random_uuid() replaces uuid_generate_v4(). Built into Postgres 13+,
--      so no extension is required.
--
--   2. Foreign keys into auth.users become plain uuid columns. Supabase still
--      owns identity under this split, so user ids arrive as opaque values and
--      there is no local table to reference.
--
--   3. auth.uid() becomes current_setting('app.user_id', true)::uuid.
--      Row-level security is deliberately PRESERVED. Postgres RLS never needed
--      Supabase, only a way to identify the caller, so every policy is carried
--      over verbatim against a per-transaction setting instead.
--
-- Because of (3), any connection that reads user-scoped tables MUST set the
-- caller first, inside the same transaction:
--
--     BEGIN;
--     SELECT set_config('app.user_id', '<supabase user uuid>', true);
--     ... queries ...
--     COMMIT;
--
-- With the setting absent, current_setting(..., true) returns NULL, every
-- policy evaluates false, and queries return no rows. That is the intended
-- failure mode: a forgotten caller yields nothing rather than everything.

-- AuraRank Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Brands table
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  brand_name text not null,
  website text,
  industry text not null,
  competitors text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references public.brands(id) on delete cascade not null,
  user_id uuid,
  scan_date timestamptz default now(),
  visibility_score integer default 0,
  mention_count integer default 0,
  competitor_mention_count integer default 0,
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamptz default now()
);

-- Prompt Results table
create table public.prompt_results (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  prompt text not null,
  ai_model text not null default 'gpt-4o-mini',
  ai_response text,
  brand_mentioned boolean default false,
  brand_sentiment text check (brand_sentiment in ('positive', 'neutral', 'negative')),
  competitors_mentioned text[] default '{}',
  sentiment_score integer default 0,
  position integer,
  created_at timestamptz default now()
);

-- Competitor Analysis table
create table public.competitor_analysis (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  competitor_name text not null,
  mention_count integer default 0,
  gap_score integer default 0,
  avg_position numeric(3,1),
  prompts_appeared text[] default '{}',
  created_at timestamptz default now()
);

-- Prompt Opportunities table
create table public.prompt_opportunities (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  prompt text not null,
  competitors_found text[] default '{}',
  opportunity_score integer default 0,
  search_intent text,
  created_at timestamptz default now()
);

-- Recommendations table
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  scan_id uuid references public.scans(id) on delete cascade not null,
  task_title text not null,
  task_description text,
  category text check (category in ('content', 'technical', 'authority', 'optimization')),
  priority text check (priority in ('high', 'medium', 'low')),
  impact_score integer default 0,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.brands enable row level security;
alter table public.scans enable row level security;
alter table public.prompt_results enable row level security;
alter table public.competitor_analysis enable row level security;
alter table public.prompt_opportunities enable row level security;
alter table public.recommendations enable row level security;

-- Brands policies
create policy "Users can view own brands" on public.brands
  for select using (current_setting('app.user_id', true)::uuid = user_id);
create policy "Users can insert own brands" on public.brands
  for insert with check (current_setting('app.user_id', true)::uuid = user_id);
create policy "Users can update own brands" on public.brands
  for update using (current_setting('app.user_id', true)::uuid = user_id);
create policy "Users can delete own brands" on public.brands
  for delete using (current_setting('app.user_id', true)::uuid = user_id);

-- Scans policies
create policy "Users can view own scans" on public.scans
  for select using (
    exists (select 1 from public.brands where brands.id = scans.brand_id and brands.user_id = current_setting('app.user_id', true)::uuid)
  );
create policy "Users can insert own scans" on public.scans
  for insert with check (
    exists (select 1 from public.brands where brands.id = scans.brand_id and brands.user_id = current_setting('app.user_id', true)::uuid)
  );
create policy "Users can update own scans" on public.scans
  for update using (
    exists (select 1 from public.brands where brands.id = scans.brand_id and brands.user_id = current_setting('app.user_id', true)::uuid)
  );
create policy "Users can view own scans by user_id" on public.scans
  for select using (current_setting('app.user_id', true)::uuid = user_id);

-- Prompt Results policies
create policy "Users can view own prompt results" on public.prompt_results
  for select using (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = prompt_results.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );
create policy "Users can insert own prompt results" on public.prompt_results
  for insert with check (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = prompt_results.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Competitor Analysis policies
create policy "Users can view own competitor analysis" on public.competitor_analysis
  for select using (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = competitor_analysis.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );
create policy "Users can insert own competitor analysis" on public.competitor_analysis
  for insert with check (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = competitor_analysis.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Prompt Opportunities policies
create policy "Users can view own prompt opportunities" on public.prompt_opportunities
  for select using (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = prompt_opportunities.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );
create policy "Users can insert own prompt opportunities" on public.prompt_opportunities
  for insert with check (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = prompt_opportunities.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Recommendations policies
create policy "Users can view own recommendations" on public.recommendations
  for select using (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = recommendations.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );
create policy "Users can insert own recommendations" on public.recommendations
  for insert with check (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = recommendations.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );
create policy "Users can update own recommendations" on public.recommendations
  for update using (
    exists (
      select 1 from public.scans
      join public.brands on brands.id = scans.brand_id
      where scans.id = recommendations.scan_id and brands.user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- ============================================
-- INDEXES
-- ============================================

create index idx_brands_user_id on public.brands(user_id);
create index idx_scans_brand_id on public.scans(brand_id);
create index idx_scans_user_id on public.scans(user_id);
create index idx_scans_scan_date on public.scans(scan_date desc);
create index idx_prompt_results_scan_id on public.prompt_results(scan_id);
create index idx_competitor_analysis_scan_id on public.competitor_analysis(scan_id);
create index idx_prompt_opportunities_scan_id on public.prompt_opportunities(scan_id);
create index idx_recommendations_scan_id on public.recommendations(scan_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_brand_updated
  before update on public.brands
  for each row execute procedure public.handle_updated_at();
