-- GENERATED from supabase/add_auto_scan.sql. Edit the original and regenerate.

-- Scheduled auto-scans: Pro = weekly, Max = daily.
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS auto_scan text DEFAULT 'off' CHECK (auto_scan IN ('off', 'weekly', 'daily')),
  ADD COLUMN IF NOT EXISTS last_auto_scan_at timestamptz;
