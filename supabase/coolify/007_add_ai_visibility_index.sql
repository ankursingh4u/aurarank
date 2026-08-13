-- GENERATED from supabase/add_ai_visibility_index.sql. Edit the original and regenerate.

-- AI Visibility Index: the public /index dataset.
-- Run this in your Supabase SQL Editor.
--
-- One row per indexed company. It holds both the scan configuration (industry,
-- competitors) and the latest result, so the public page can be rendered from a
-- single query and a re-scan is an upsert rather than an insert + cleanup.

CREATE TABLE IF NOT EXISTS public.index_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Configuration
  company text NOT NULL UNIQUE,
  industry text NOT NULL,
  competitors text[] DEFAULT '{}',

  -- Latest result (null until the first scan completes)
  score integer,
  label text,
  mentions integer,
  scored_prompts integer,
  discovery_prompts integer,
  discovery_mentions integer,
  top_competitor text,
  top_competitor_mentions integer,
  competitor_breakdown jsonb DEFAULT '[]'::jsonb,
  missed_prompts jsonb DEFAULT '[]'::jsonb,
  errored_prompts integer DEFAULT 0,
  engines text[] DEFAULT '{}',

  -- Full per-prompt rows, so results can be audited or recomputed without
  -- paying to re-scan.
  raw_rows jsonb DEFAULT '[]'::jsonb,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message text,

  scanned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: the index is public data, so anyone may read a completed row. All writes
-- go through the service-role client in admin-gated API routes.
ALTER TABLE public.index_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read completed index entries" ON public.index_entries;
CREATE POLICY "Anyone can read completed index entries" ON public.index_entries
  FOR SELECT USING (status = 'completed');

CREATE INDEX IF NOT EXISTS idx_index_entries_score ON public.index_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_index_entries_status ON public.index_entries(status);
