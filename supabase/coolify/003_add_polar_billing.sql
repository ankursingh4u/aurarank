-- GENERATED from supabase/add_polar_billing.sql. Edit the original and regenerate.

-- Migrate billing columns from Stripe → Polar.sh
-- Run this in your Supabase SQL Editor after add_user_plans.sql.
-- Safe to run on existing projects: renames columns if the old Stripe names
-- exist, otherwise creates the Polar columns fresh.

DO $$
BEGIN
  -- customer id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_plans'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.user_plans RENAME COLUMN stripe_customer_id TO polar_customer_id;
  ELSE
    ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS polar_customer_id text;
  END IF;

  -- subscription id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_plans'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.user_plans RENAME COLUMN stripe_subscription_id TO polar_subscription_id;
  ELSE
    ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS polar_subscription_id text;
  END IF;
END $$;

-- Refresh the customer-lookup index under the new column name.
DROP INDEX IF EXISTS idx_user_plans_stripe_customer;
CREATE INDEX IF NOT EXISTS idx_user_plans_polar_customer ON public.user_plans(polar_customer_id);
