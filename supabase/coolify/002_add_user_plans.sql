-- GENERATED from supabase/add_user_plans.sql. Edit the original and regenerate.

-- User Plans table for subscription management
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan text DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'max')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'past_due')),
  polar_customer_id text,
  polar_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan" ON public.user_plans
  FOR SELECT USING (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Service role can manage plans" ON public.user_plans
  FOR ALL USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_polar_customer ON public.user_plans(polar_customer_id);
