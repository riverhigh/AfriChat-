-- ============================================================
-- AGC Super-App: Enable Live Public Creation & Discovery
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Allows any registered user to publish Stores, Artisan Stations,
-- Spaces, Communities (Groups & Channels), and Services live.
-- ============================================================

-- 1. Town Communities (Groups & Channels)
ALTER TABLE public.town_communities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_town" ON public.town_communities;
DROP POLICY IF EXISTS "allow_all_insert_town" ON public.town_communities;
DROP POLICY IF EXISTS "allow_all_update_town" ON public.town_communities;

CREATE POLICY "allow_all_read_town" ON public.town_communities
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_town" ON public.town_communities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_town" ON public.town_communities
  FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Audio Spaces (Street Radio / Spaces)
ALTER TABLE public.audio_spaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_spaces" ON public.audio_spaces;
DROP POLICY IF EXISTS "allow_all_insert_spaces" ON public.audio_spaces;
DROP POLICY IF EXISTS "allow_all_update_spaces" ON public.audio_spaces;

CREATE POLICY "allow_all_read_spaces" ON public.audio_spaces
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_spaces" ON public.audio_spaces
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_spaces" ON public.audio_spaces
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Artisan Stations & Workshop Hub
ALTER TABLE public.artisan_stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_artisan" ON public.artisan_stations;
DROP POLICY IF EXISTS "allow_all_insert_artisan" ON public.artisan_stations;
DROP POLICY IF EXISTS "allow_all_update_artisan" ON public.artisan_stations;

CREATE POLICY "allow_all_read_artisan" ON public.artisan_stations
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_artisan" ON public.artisan_stations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_artisan" ON public.artisan_stations
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Service Providers
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_services" ON public.service_providers;
DROP POLICY IF EXISTS "allow_all_insert_services" ON public.service_providers;
DROP POLICY IF EXISTS "allow_all_update_services" ON public.service_providers;

CREATE POLICY "allow_all_read_services" ON public.service_providers
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_services" ON public.service_providers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_services" ON public.service_providers
  FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Store Subscriptions (Merchant Stores)
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_stores" ON public.store_subscriptions;
DROP POLICY IF EXISTS "allow_all_insert_stores" ON public.store_subscriptions;
DROP POLICY IF EXISTS "allow_all_update_stores" ON public.store_subscriptions;

CREATE POLICY "allow_all_read_stores" ON public.store_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_stores" ON public.store_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_stores" ON public.store_subscriptions
  FOR UPDATE USING (true) WITH CHECK (true);

-- 6. Products & Marketplace
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_products" ON public.products;
DROP POLICY IF EXISTS "allow_all_insert_products" ON public.products;
DROP POLICY IF EXISTS "allow_all_update_products" ON public.products;

CREATE POLICY "allow_all_read_products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_products" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

-- 7. Chat Threads & Messages
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_chats" ON public.chat_threads;
DROP POLICY IF EXISTS "allow_all_insert_chats" ON public.chat_threads;

CREATE POLICY "allow_all_read_chats" ON public.chat_threads
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_chats" ON public.chat_threads
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_all_insert_messages" ON public.messages;

CREATE POLICY "allow_all_read_messages" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- 8. Add all relevant tables to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.town_communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audio_spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artisan_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
