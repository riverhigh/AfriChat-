-- Verified Professionals Marketplace Schema (AfriLaw, AfriHealth, Errands)
-- Run this migration in Supabase SQL Editor if provisioning standalone Postgres tables.

CREATE TABLE IF NOT EXISTS public.lawyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  user_phone text,
  full_name text NOT NULL,
  supreme_court_number text UNIQUE NOT NULL, -- SCN number for Nigerian lawyers verification
  firm_name text,
  specialization text[] NOT NULL DEFAULT ARRAY['CAC Business & Corporate'],
  years_of_experience integer DEFAULT 1,
  office_address text NOT NULL,
  city text NOT NULL,
  consultation_fee numeric NOT NULL DEFAULT 15000,
  currency text NOT NULL DEFAULT 'NGN',
  bio text,
  avatar_url text,
  is_verified boolean DEFAULT false, -- Manual admin verification of SCN credentials
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rating numeric DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read verified lawyers" ON public.lawyers
  FOR SELECT USING (is_verified = true OR approval_status = 'approved');
CREATE POLICY IF NOT EXISTS "Users register own lawyer profile" ON public.lawyers
  FOR INSERT WITH CHECK (true);

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

ALTER TABLE public.clinics_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read verified clinics doctors" ON public.clinics_doctors
  FOR SELECT USING (is_verified = true OR approval_status = 'approved');
CREATE POLICY IF NOT EXISTS "Users register own clinic or doctor" ON public.clinics_doctors
  FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.errand_runners (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  nin_or_id_ref text NOT NULL,
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

ALTER TABLE public.errand_runners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read errand runners" ON public.errand_runners
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users register errand runner" ON public.errand_runners
  FOR INSERT WITH CHECK (true);
