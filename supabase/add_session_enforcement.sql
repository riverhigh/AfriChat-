-- ============================================================
-- AGC: Single-Session & Phone-Uniqueness Schema Additions
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Add AFTER the existing schema (safe to run on existing DB)
-- ============================================================

-- 1. Ensure phone_number uniqueness on profiles (already UNIQUE in full schema,
--    but add if running incrementally on an older DB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_number_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- 2. Add session_token column to profiles (single-device enforcement)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS session_token text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_device_hint text; -- e.g. "iPhone / Safari 17"

-- 3. Create index for fast session-token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles (phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_session_token ON public.profiles (session_token);

-- 4. RLS policy: users can only update their own session_token
-- (Assumes RLS is already enabled on profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'users_update_own_session'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY users_update_own_session ON public.profiles
        FOR UPDATE USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone')
        WITH CHECK (phone_number = current_setting('request.jwt.claims', true)::json->>'phone');
    $policy$;
  END IF;
END $$;

-- 5. Helper function: register or update a phone session (called from server-side)
CREATE OR REPLACE FUNCTION public.upsert_phone_session(
  p_phone        text,
  p_full_name    text,
  p_avatar_url   text DEFAULT NULL,
  p_session_token text DEFAULT NULL,
  p_device_hint  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.profiles (phone_number, full_name, avatar_url, session_token, last_login_at, last_device_hint, is_phone_verified)
  VALUES (p_phone, p_full_name, p_avatar_url, p_session_token, now(), p_device_hint, true)
  ON CONFLICT (phone_number) DO UPDATE
    SET session_token  = EXCLUDED.session_token,
        last_login_at  = now(),
        last_device_hint = COALESCE(EXCLUDED.last_device_hint, profiles.last_device_hint),
        full_name      = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url     = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
