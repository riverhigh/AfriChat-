-- ============================================================
-- AGC Cross-Device Admin Global State & Broadcast Policies
-- Optional SQL enhancement for Supabase Dashboard -> SQL Editor
-- ============================================================

-- Allow reading/writing system_broadcasts across devices
ALTER TABLE IF EXISTS public.system_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "allow_all_write_broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "allow_all_update_broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "allow_all_delete_broadcasts" ON public.system_broadcasts;

CREATE POLICY "allow_all_read_broadcasts" ON public.system_broadcasts FOR SELECT USING (true);
CREATE POLICY "allow_all_write_broadcasts" ON public.system_broadcasts FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_broadcasts" ON public.system_broadcasts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_broadcasts" ON public.system_broadcasts FOR DELETE USING (true);

-- Dedicated global admin state table (optional alongside scam_reports __agc_sys_* store)
CREATE TABLE IF NOT EXISTS public.agc_admin_state (
  key        TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agc_admin_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_read_admin_state" ON public.agc_admin_state;
DROP POLICY IF EXISTS "allow_all_upsert_admin_state" ON public.agc_admin_state;
DROP POLICY IF EXISTS "allow_all_update_admin_state" ON public.agc_admin_state;

CREATE POLICY "allow_all_read_admin_state" ON public.agc_admin_state FOR SELECT USING (true);
CREATE POLICY "allow_all_upsert_admin_state" ON public.agc_admin_state FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_admin_state" ON public.agc_admin_state FOR UPDATE USING (true) WITH CHECK (true);

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agc_admin_state';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
