-- GENERATED from supabase/add_market_region.sql. Edit the original and regenerate.

-- Add market_region column to brands table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS market_region jsonb DEFAULT '{"type": "global"}'::jsonb;

-- Example values:
-- {"type": "global"}
-- {"type": "country", "country": "India"}
-- {"type": "state", "state": "Maharashtra", "country": "India"}
-- {"type": "city", "city": "Mumbai", "state": "Maharashtra", "country": "India"}
