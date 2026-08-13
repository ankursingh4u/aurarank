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
