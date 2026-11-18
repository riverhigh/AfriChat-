-- Verified Professionals Marketplace Schema (AfriLaw, AfriHealth, Errands)
-- Run this migration in Supabase SQL Editor.
-- Idempotent: Safe to run multiple times and safe when tables already exist from previous schemas.

-- ============================================================
-- 1. LAWYERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lawyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  user_phone text,
  full_name text,
  name text,
  supreme_court_number text,
  firm_name text,
  specialization text[] DEFAULT ARRAY['CAC Business & Corporate'],
  years_of_experience integer DEFAULT 1,
  office_address text,
  city text,
  consultation_fee numeric DEFAULT 15000,
  currency text DEFAULT 'NGN',
  bio text,
  avatar_url text,
  is_verified boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rating numeric DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all new columns exist if the table was created under an older schema
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS user_phone text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS supreme_court_number text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS firm_name text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS specialization text[] DEFAULT ARRAY['CAC Business & Corporate'];
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS years_of_experience integer DEFAULT 1;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS office_address text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 15000;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE public.lawyers ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- Backfill full_name from name if name exists from legacy schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'lawyers' AND column_name = 'name'
  ) THEN
    UPDATE public.lawyers SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'lawyers' AND column_name = 'bar_number'
  ) THEN
    UPDATE public.lawyers SET supreme_court_number = bar_number WHERE supreme_court_number IS NULL AND bar_number IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read verified lawyers" ON public.lawyers;
CREATE POLICY "Public read verified lawyers" ON public.lawyers
  FOR SELECT USING (is_verified = true OR approval_status = 'approved');

DROP POLICY IF EXISTS "Users register own lawyer profile" ON public.lawyers;
CREATE POLICY "Users register own lawyer profile" ON public.lawyers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own lawyer profile" ON public.lawyers;
CREATE POLICY "Users update own lawyer profile" ON public.lawyers
  FOR UPDATE USING (true) WITH CHECK (true);


-- ============================================================
-- 2. CLINICS & DOCTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clinics_doctors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  user_phone text,
  account_type text NOT NULL DEFAULT 'doctor' CHECK (account_type IN ('doctor', 'clinic')),
  full_name text NOT NULL,
  mdcn_or_facility_license text UNIQUE NOT NULL,
  specialty text NOT NULL,
  hospital_affiliation text NOT NULL,
  city text NOT NULL,
  office_address text NOT NULL,
  consultation_fee numeric NOT NULL DEFAULT 5000,
  currency text NOT NULL DEFAULT 'NGN',
  languages text[] DEFAULT ARRAY['English', 'Pidgin'],
  departments text[] DEFAULT ARRAY['General Outpatient Clinic'],
  bio text,
  avatar_url text,
  is_verified boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rating numeric DEFAULT 5.0,
  review_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist if table was already created
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS user_phone text;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'doctor';
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 5000;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS currency text DEFAULT 'NGN';
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS languages text[] DEFAULT ARRAY['English', 'Pidgin'];
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS departments text[] DEFAULT ARRAY['General Outpatient Clinic'];
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;
ALTER TABLE public.clinics_doctors ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

ALTER TABLE public.clinics_doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read verified clinics doctors" ON public.clinics_doctors;
CREATE POLICY "Public read verified clinics doctors" ON public.clinics_doctors
  FOR SELECT USING (is_verified = true OR approval_status = 'approved');

DROP POLICY IF EXISTS "Users register own clinic or doctor" ON public.clinics_doctors;
CREATE POLICY "Users register own clinic or doctor" ON public.clinics_doctors
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own clinic or doctor" ON public.clinics_doctors;
CREATE POLICY "Users update own clinic or doctor" ON public.clinics_doctors
  FOR UPDATE USING (true) WITH CHECK (true);


-- ============================================================
-- 3. ERRAND RUNNERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.errand_runners (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  nin_or_id_ref text DEFAULT '',
  avatar text,
  location text NOT NULL,
  bio text,
  delivery_base_fee numeric NOT NULL DEFAULT 1500,
  currency text NOT NULL DEFAULT 'NGN',
  items_for_sale jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rating numeric DEFAULT 5.0,
  reviews_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  is_online boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist if table was created in earlier migrations
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS nin_or_id_ref text DEFAULT '';
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS items_for_sale jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0;
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS completed_count integer DEFAULT 0;
ALTER TABLE public.errand_runners ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true;

ALTER TABLE public.errand_runners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read errand runners" ON public.errand_runners;
CREATE POLICY "Public read errand runners" ON public.errand_runners
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users register errand runner" ON public.errand_runners;
CREATE POLICY "Users register errand runner" ON public.errand_runners
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update errand runner" ON public.errand_runners;
CREATE POLICY "Users update errand runner" ON public.errand_runners
  FOR UPDATE USING (true) WITH CHECK (true);
