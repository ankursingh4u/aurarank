-- GENERATED from supabase/add_wordpress_publishes.sql. Edit the original and regenerate.

-- WordPress publish tracking + subscription-period anchors for publish quotas
-- Run this in your Supabase SQL Editor (after add_user_plans.sql).

-- 1) Anchor the publish quota to the user's billing period. Populated by the
--    Polar webhook on subscription create/renew. When a period rolls over,
--    current_period_start moves forward, so the publish count (which only
--    counts rows since current_period_start) effectively resets to 0.
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end   timestamptz;

-- 2) One row per successful WordPress publish — used to enforce the monthly
--    quota (Free 0 / Pro 1 / Max 3) and to show publish history.
CREATE TABLE IF NOT EXISTS public.wordpress_publishes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  wordpress_post_id integer,
  title text,
  link text,
  status text,
  published_at timestamptz DEFAULT now()
);

-- RLS — users see and create only their own publish records.
ALTER TABLE public.wordpress_publishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own publishes" ON public.wordpress_publishes
  FOR SELECT USING (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Users can insert own publishes" ON public.wordpress_publishes
  FOR INSERT WITH CHECK (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Service role can manage publishes" ON public.wordpress_publishes
  FOR ALL USING (true);

-- Quota counting is keyed on (user_id, published_at).
CREATE INDEX IF NOT EXISTS idx_wp_publishes_user_date
  ON public.wordpress_publishes(user_id, published_at);
