-- GENERATED from supabase/add_grounded_scanning.sql. Edit the original and regenerate.

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
