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

-- 8. User Statuses (24h Stories: Photo, Video, Thought)
CREATE TABLE IF NOT EXISTS public.user_statuses (
  id              text primary key,
  user_id         text not null,
  user_phone      text,
  user_name       text not null,
  user_avatar     text,
  status_type     text default 'thought',
  thought_bg      text,
  media_url       text,
  video_url       text,
  caption         text,
  views_count     int default 0,
  likes_count     int default 0,
  expires_at      timestamptz default (now() + interval '24 hours'),
  created_at      timestamptz default now()
);

ALTER TABLE public.user_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_statuses" ON public.user_statuses;
DROP POLICY IF EXISTS "allow_all_insert_statuses" ON public.user_statuses;
DROP POLICY IF EXISTS "allow_all_update_statuses" ON public.user_statuses;
DROP POLICY IF EXISTS "allow_all_delete_statuses" ON public.user_statuses;

CREATE POLICY "allow_all_read_statuses" ON public.user_statuses
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert_statuses" ON public.user_statuses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update_statuses" ON public.user_statuses
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_delete_statuses" ON public.user_statuses
  FOR DELETE USING (true);

-- 9. Add tables to Supabase Realtime publication (safely ignores already added tables)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'public.town_communities',
      'public.audio_spaces',
      'public.artisan_stations',
      'public.store_subscriptions',
      'public.service_providers',
      'public.products',
      'public.chat_threads',
      'public.user_statuses'
    ])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', tbl);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table is already a member of publication, ignore
        NULL;
    END;
  END LOOP;
END $$;
