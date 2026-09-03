-- One-time report unlocks.
--
-- The citation map is the part of a report that is actually actionable, so it is
-- the part that is paid for. A single $9 purchase unlocks one scan permanently;
-- it is not a subscription and grants nothing else.
--
-- Written by the Polar webhook on order.paid, keyed on the scan id carried in
-- the checkout metadata. Nothing else may insert into it: a client that could
-- write here could unlock reports for free.

CREATE TABLE IF NOT EXISTS public.report_unlocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scan_id uuid NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  polar_order_id text,
  amount_cents integer,
  currency text,
  created_at timestamptz DEFAULT now()
);

-- One unlock per scan. A duplicate webhook delivery must not create a second
-- row, and Polar retries deliveries, so this is load-bearing rather than tidy.
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_unlocks_scan
  ON public.report_unlocks(scan_id);

-- The dashboard asks "which of these scans are unlocked" for one user at a time.
CREATE INDEX IF NOT EXISTS idx_report_unlocks_user
  ON public.report_unlocks(user_id, created_at);

ALTER TABLE public.report_unlocks ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner. There is deliberately no user INSERT policy: unlocks
-- are created by the service role from a verified Polar webhook, never by a
-- client, or the paywall would be bypassable with a single API call.
CREATE POLICY "Users can view own unlocks" ON public.report_unlocks
  FOR SELECT USING (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Service role can manage unlocks" ON public.report_unlocks
  FOR ALL USING (true);
