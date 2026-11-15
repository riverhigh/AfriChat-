-- ============================================================
-- AGC Sponsored Status Ads & Analytics Click Tracking Schema
-- Run in Supabase Dashboard -> SQL Editor if not yet applied
-- ============================================================

-- 1. Add sponsored ad columns to user_statuses & statuses
ALTER TABLE IF EXISTS public.user_statuses
  ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_brand text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS ad_clicks_count int DEFAULT 0;

ALTER TABLE IF EXISTS public.statuses
  ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_brand text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS ad_clicks_count int DEFAULT 0;

-- 2. Ad Clicks Analytics table
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id text NOT NULL,
  target_url text,
  clicked_by text,
  clicked_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_insert_ad_clicks" ON public.ad_clicks;
CREATE POLICY "allow_all_insert_ad_clicks" ON public.ad_clicks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_read_ad_clicks" ON public.ad_clicks;
CREATE POLICY "allow_all_read_ad_clicks" ON public.ad_clicks
  FOR SELECT USING (true);
