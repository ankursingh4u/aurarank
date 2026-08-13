-- SEO4AI: all outstanding migrations, in dependency order.
--
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- Every statement is guarded with IF NOT EXISTS, so re-running is harmless.
--
-- Verified missing on 2026-08-13:
--   public.index_entries          table does not exist
--   prompt_results.citations      column does not exist
--
-- The application already runs correctly without these; they are what switch
-- the public index and the citation map on.


-- ====================================================================
-- add_ai_visibility_index.sql
-- Creates index_entries. This one has never run, which is why the public index page renders its empty state.
-- ====================================================================

-- AI Visibility Index: the public /index dataset.
-- Run this in your Supabase SQL Editor.
--
-- One row per indexed company. It holds both the scan configuration (industry,
-- competitors) and the latest result, so the public page can be rendered from a
-- single query and a re-scan is an upsert rather than an insert + cleanup.

CREATE TABLE IF NOT EXISTS public.index_entries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,

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


-- ====================================================================
-- add_index_sampling.sql
-- Multi-run sampling: how many times each question was asked, and how often the runs agreed.
-- ====================================================================

-- Multi-run sampling for the AI Visibility Index.
--
-- Index entries are published data, so they have to survive someone re-running
-- the same question and getting a different answer. Each prompt is now asked
-- several times and scored on the majority verdict; these two columns record how
-- many samples were taken and how often those samples agreed, so every published
-- score can state its own repeatability.
--
-- Existing rows predate sampling: they are single-sample scans, and their
-- stability is unmeasured (0) rather than assumed perfect.

ALTER TABLE public.index_entries
  ADD COLUMN IF NOT EXISTS runs_per_prompt integer NOT NULL DEFAULT 1;

ALTER TABLE public.index_entries
  ADD COLUMN IF NOT EXISTS stability integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.index_entries.runs_per_prompt IS
  'How many times each prompt was asked. 1 = single sample (pre-sampling scan).';

COMMENT ON COLUMN public.index_entries.stability IS
  'Percent of multi-sample prompts whose samples unanimously agreed on whether the brand was named. 0 when nothing was sampled more than once.';


-- ====================================================================
-- add_grounded_scanning.sql
-- Citations, per-engine citations, channel and winnability. Turns the citation map on.
-- ====================================================================

-- Grounded scanning: record which channel produced a result, which pages the AI
-- actually read, and whether a missed question is worth working on.
--
-- Background: before this, every scan asked the models with no web access, so it
-- measured what they absorbed during training. That number barely moves in
-- response to anything a customer does, which meant a customer could do all the
-- recommended work, re-scan, and see no change. Grounded scans let the model
-- search the live web and report the sources it read, and those sources are the
-- actual deliverable: the named pages to go and get listed on.

-- ── Customer scans ────────────────────────────────────────────────────
ALTER TABLE public.prompt_results
  ADD COLUMN IF NOT EXISTS citations text[] NOT NULL DEFAULT '{}';

-- Kept per engine as well as merged, because the engines overlap far less than
-- expected: measured 2026-08-10, ChatGPT and Gemini each cited about eleven
-- domains for the same question and shared exactly one. A single merged list
-- would hide that a brand is winning on one engine and invisible on another.
ALTER TABLE public.prompt_results
  ADD COLUMN IF NOT EXISTS citations_by_engine jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.prompt_results
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'parametric';

ALTER TABLE public.prompt_results
  ADD COLUMN IF NOT EXISTS winnability text;

-- ── Public index ──────────────────────────────────────────────────────
-- The index deliberately stays parametric: a public leaderboard that reshuffles
-- every week because search results moved is a bad leaderboard. Frozen weights
-- make it comparable across months.
ALTER TABLE public.index_entries
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'parametric';

ALTER TABLE public.index_entries
  ADD COLUMN IF NOT EXISTS winnability jsonb NOT NULL DEFAULT '{"winnable":0,"hard":0,"locked":0}'::jsonb;

-- Constrain to the two channels so a typo cannot quietly create a third.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompt_results_channel_check') THEN
    ALTER TABLE public.prompt_results
      ADD CONSTRAINT prompt_results_channel_check CHECK (channel IN ('grounded', 'parametric'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompt_results_winnability_check') THEN
    ALTER TABLE public.prompt_results
      ADD CONSTRAINT prompt_results_winnability_check
      CHECK (winnability IS NULL OR winnability IN ('winnable', 'hard', 'locked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'index_entries_channel_check') THEN
    ALTER TABLE public.index_entries
      ADD CONSTRAINT index_entries_channel_check CHECK (channel IN ('grounded', 'parametric'));
  END IF;
END $$;

COMMENT ON COLUMN public.prompt_results.citations IS
  'Source domains the engines read to answer. Empty on a parametric scan.';
COMMENT ON COLUMN public.prompt_results.channel IS
  'grounded = live web search with citations; parametric = training weights only.';
COMMENT ON COLUMN public.prompt_results.winnability IS
  'winnable = retrieved set is thin or has self-serve sources; hard = independent sites needing outreach; locked = editorial or competitor-owned only.';
