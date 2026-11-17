-- Outside Events, Parties, Concerts & RSVP Ticket Passes
-- Run this migration in your Supabase SQL Editor

create table if not exists public.parties (
  id uuid default gen_random_uuid() primary key,
  organizer_id uuid references auth.users(id),
  organizer_name text,
  organizer_phone text,
  organizer_verified boolean default false,
  title text not null,
  description text,
  category text default 'party', -- 'party', 'concert', 'rave', 'tech_mixer', 'rooftop', 'hangout'
  city text not null, -- e.g. 'Lagos Mainland', 'Lagos Island', 'Abuja', 'Port Harcourt'
  venue_name text not null,
  address text not null,
  lat numeric,
  lng numeric,
  is_paid boolean default false,
  ticket_price numeric default 0,
  currency text default 'NGN',
  max_capacity integer,
  rsvp_count integer default 0,
  flyer_url text not null,
  event_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for RSVPs and Ticket Claims
create table if not exists public.party_rsvps (
  id uuid default gen_random_uuid() primary key,
  party_id uuid references public.parties(id) on delete cascade not null,
  user_id uuid references auth.users(id),
  user_name text,
  user_phone text,
  ticket_code text unique not null, -- Unique entry code or QR string (e.g. OUT-8F3K2P)
  status text default 'confirmed', -- 'confirmed', 'checked_in', 'cancelled'
  payment_method text default 'free', -- 'free', 'wallet', 'paystack'
  payment_reference text,
  amount_paid numeric default 0,
  checked_in_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(party_id, user_id)
);

-- Helpful indexes for city/date discovery
create index if not exists idx_parties_city_date on public.parties (city, event_date);
create index if not exists idx_party_rsvps_ticket_code on public.party_rsvps (ticket_code);
create index if not exists idx_party_rsvps_party_id on public.party_rsvps (party_id);

-- Enable RLS
alter table public.parties enable row level security;
alter table public.party_rsvps enable row level security;

drop policy if exists "Public read parties" on public.parties;
create policy "Public read parties"
  on public.parties
  for select
  using (true);

drop policy if exists "Authenticated create parties" on public.parties;
create policy "Authenticated create parties"
  on public.parties
  for insert
  with check (auth.uid() = organizer_id or organizer_id is null);

drop policy if exists "Organizers update own parties" on public.parties;
create policy "Organizers update own parties"
  on public.parties
  for update
  using (auth.uid() = organizer_id);

drop policy if exists "Organizers delete own parties" on public.parties;
create policy "Organizers delete own parties"
  on public.parties
  for delete
  using (auth.uid() = organizer_id);

drop policy if exists "Users manage own rsvps" on public.party_rsvps;
create policy "Users manage own rsvps"
  on public.party_rsvps
  for all
  using (auth.uid() = user_id or user_id is null);
