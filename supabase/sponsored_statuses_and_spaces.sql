-- ============================================================
-- AGC Super-App: Sponsored Status Ads & Audio Space Creator Guard
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add Sponsored Ad columns to public.user_statuses
ALTER TABLE public.user_statuses
  ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_brand text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS ad_clicks_count int DEFAULT 0;

-- 2. Sponsored Ad Clicks Analytics Table
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id         bigserial primary key,
  status_id  text not null,
  target_url text,
  clicked_by text,
  clicked_at timestamptz default now()
);

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_ad_clicks" ON public.ad_clicks;
DROP POLICY IF EXISTS "allow_all_insert_ad_clicks" ON public.ad_clicks;

CREATE POLICY "allow_all_read_ad_clicks" ON public.ad_clicks
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_ad_clicks" ON public.ad_clicks
  FOR INSERT WITH CHECK (true);

-- 3. Audio Spaces Creator Phone column for cross-device creator enforcement
ALTER TABLE public.audio_spaces
  ADD COLUMN IF NOT EXISTS host_phone text;
