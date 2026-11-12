-- ============================================================
-- AGC Phone Registry — Cross-Device Duplicate Detection
-- Run this in: Supabase Dashboard → SQL Editor
-- Project: https://supabase.com/dashboard/project/sejiretcywvqbzbqalbg/sql
-- ============================================================

-- 1. Create a lightweight public phone registry table
CREATE TABLE IF NOT EXISTS public.agc_phone_registry (
  phone_digits   TEXT PRIMARY KEY,          -- last-9 digits of phone (normalized)
  full_phone     TEXT NOT NULL,             -- full E.164 phone e.g. +2348031234567
  username       TEXT NOT NULL DEFAULT '',  -- @username they chose
  avatar_url     TEXT DEFAULT '',
  registered_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disable RLS entirely on this table — it's a public phone lookup registry
ALTER TABLE public.agc_phone_registry DISABLE ROW LEVEL SECURITY;

-- 3. Grant anon (public) read + write access
GRANT SELECT, INSERT, UPDATE ON public.agc_phone_registry TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agc_phone_registry TO authenticated;

-- 4. Also open SELECT on profiles so phone lookup works there too
-- (keeps the existing profiles table as a secondary source)
DROP POLICY IF EXISTS "Public phone lookup" ON public.profiles;
CREATE POLICY "Public phone lookup"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 5. Index for fast last-9-digit lookup
CREATE INDEX IF NOT EXISTS idx_agc_phone_registry_full ON public.agc_phone_registry (full_phone);

-- Done! The app will now write to agc_phone_registry on every signup
-- and check it cross-device before sending OTP.
