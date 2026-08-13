-- GENERATED from supabase/add_scan_user_id.sql. Edit the original and regenerate.

-- Add user_id to scans for per-user quota enforcement and direct ownership.
-- The API (src/app/api/scans/route.ts) inserts and filters scans by user_id.
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill existing scans from their brand owner
UPDATE public.scans s
SET user_id = b.user_id
FROM public.brands b
WHERE s.brand_id = b.id AND s.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);

-- Direct-ownership RLS policy (complements the existing brand-join policies)
DROP POLICY IF EXISTS "Users can view own scans by user_id" ON public.scans;
CREATE POLICY "Users can view own scans by user_id" ON public.scans
  FOR SELECT USING (current_setting('app.user_id', true)::uuid = user_id);
