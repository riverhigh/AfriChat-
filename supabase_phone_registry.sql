-- ============================================================
-- AGC Cross-Device Phone Duplicate Check
-- Run ALL of this in Supabase Dashboard → SQL Editor:
-- https://supabase.com/dashboard/project/sejiretcywvqbzbqalbg/sql/new
-- ============================================================

-- ── STEP 1: Public phone registry table (no RLS) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.agc_phone_registry (
  phone_digits   TEXT PRIMARY KEY,
  full_phone     TEXT NOT NULL,
  username       TEXT NOT NULL DEFAULT '',
  avatar_url     TEXT DEFAULT '',
  registered_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.agc_phone_registry DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.agc_phone_registry TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agc_phone_registry TO authenticated;

-- ── STEP 2: RPC function (SECURITY DEFINER — bypasses RLS on profiles) ─────
CREATE OR REPLACE FUNCTION public.check_phone_registered(
  p_phone TEXT,
  p_last9 TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  -- Check agc_phone_registry first (fastest)
  SELECT username, avatar_url INTO v_row
  FROM public.agc_phone_registry
  WHERE phone_digits = p_last9
     OR full_phone = p_phone
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'registered', true,
      'username', COALESCE(v_row.username, ''),
      'avatar_url', COALESCE(v_row.avatar_url, '')
    );
  END IF;

  -- Fallback: check profiles table
  SELECT full_name, avatar_url INTO v_row
  FROM public.profiles
  WHERE phone_number = p_phone
     OR phone_number ILIKE ('%' || p_last9)
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'registered', true,
      'username', COALESCE(v_row.full_name, ''),
      'avatar_url', COALESCE(v_row.avatar_url, '')
    );
  END IF;

  RETURN json_build_object('registered', false, 'username', '', 'avatar_url', '');
END;
$$;

-- Allow anon to call the RPC
GRANT EXECUTE ON FUNCTION public.check_phone_registered(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_phone_registered(TEXT, TEXT) TO authenticated;

-- ── STEP 3: Allow public SELECT on profiles (phone lookup) ─────────────────
DROP POLICY IF EXISTS "Public phone lookup" ON public.profiles;
CREATE POLICY "Public phone lookup"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ── STEP 4: Allow anon INSERT on profiles (new registrations) ──────────────
DROP POLICY IF EXISTS "Allow new profile insert" ON public.profiles;
CREATE POLICY "Allow new profile insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- ── Done ───────────────────────────────────────────────────────────────────
-- After running this, ANY device can:
--   READ:  check if a phone is already registered
--   WRITE: register a new phone (on signup completion)
