-- GENERATED from supabase/add_article_generations.sql. Edit the original and regenerate.

-- Article-generation tracking — caps OpenAI cost per billing period.
-- Generating an article calls OpenAI (a real cost); saving drafts / publishing
-- does not. This table counts generations per period (Pro 5 / Max 20).
-- Run in the Supabase SQL Editor (after add_wordpress_publishes.sql).

CREATE TABLE IF NOT EXISTS public.article_generations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.article_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations" ON public.article_generations
  FOR SELECT USING (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Users can insert own generations" ON public.article_generations
  FOR INSERT WITH CHECK (current_setting('app.user_id', true)::uuid = user_id);

CREATE POLICY "Service role can manage generations" ON public.article_generations
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_article_generations_user_date
  ON public.article_generations(user_id, created_at);
