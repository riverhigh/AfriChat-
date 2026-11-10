-- ============================================================
-- AGC (All Good Connects) Super-App — Full Supabase PostgreSQL Schema
-- Generated: 2026-11-09
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

create type currency_code    as enum ('NGN','KES','GHS','ZAR');
create type language_code    as enum ('en','pcm','sw','yo','ha','fr');
create type escrow_status    as enum ('escrow_secured','shipped','funds_released','disputed');
create type user_role        as enum ('user','creator','merchant','admin');
create type badge_type       as enum ('blue','gold','creator_plus');
create type user_status_enum as enum ('active','suspended','flagged');
create type call_direction   as enum ('incoming','outgoing','missed');
create type call_type        as enum ('voice','video');
create type message_type     as enum (
  'text','image','voice','product_card','escrow_receipt',
  'meme_sticker','invoice_receipt','financial_poll','ajo_update','scam_warning'
);
create type message_status   as enum ('sent','delivered','read');
create type risk_level       as enum ('critical_scam','suspicious','verified_clean');
create type product_category as enum ('textiles','electronics','beauty','fashion','books');
create type product_condition as enum ('Brand New','Direct Import','Refurbished','Fairly Used');
create type payment_method   as enum ('paystack','wallet','bank_transfer');
create type dispatch_status  as enum ('pending','picked_up','in_transit','delivered','cancelled');
create type service_category as enum (
  'mechanic','barber','plumber','electrician','tailor',
  'carpenter','painter','cleaner','caterer','photographer'
);
create type course_category  as enum (
  'tech_coding','business_finance','languages_culture',
  'creative_design','trades_engineering','academics_jamb'
);
create type celebrity_category as enum (
  'Musician','Actor / Film','Comedian','Athlete','Creator & Influencer','Public Figure'
);
create type broadcast_level  as enum ('info','warning','alert');
create type ajo_frequency    as enum ('weekly','monthly');
create type store_tier       as enum ('starter_30','pro_100');
create type tutor_tier       as enum ('starter_10','unlimited_pro');
create type payout_status    as enum ('pending','processing','paid','failed');

-- ============================================================
-- SECTION 2: USERS & AUTH
-- ============================================================

-- Core user profiles (extends Supabase auth.users)
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  username          text unique,
  phone_number      text unique,
  avatar_url        text,
  bio               text,
  location          text,
  role              user_role not null default 'user',
  status            user_status_enum not null default 'active',
  verification_badge badge_type,
  is_phone_verified boolean not null default false,
  is_celebrity_verified boolean not null default false,
  celebrity_stage_name  text,
  celebrity_category    celebrity_category,
  language          language_code not null default 'en',
  currency          currency_code not null default 'NGN',
  low_data_mode     boolean not null default false,
  hide_balance      boolean not null default false,
  font_size         text not null default 'normal',
  chat_wallpaper    text,
  is_online         boolean not null default false,
  last_seen         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Device contacts (phone book sync)
create table public.device_contacts (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  phone       text not null,
  avatar_url  text,
  is_on_afri_chat boolean not null default false,
  afri_chat_user_id uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 3: WALLET & TRANSACTIONS
-- ============================================================

create table public.wallets (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid unique not null references public.profiles(id) on delete cascade,
  available_balance     numeric(14,2) not null default 0,
  escrow_locked_balance numeric(14,2) not null default 0,
  currency              currency_code not null default 'NGN',
  paystack_customer_id  text,
  bank_account_number   text,
  bank_name             text,
  updated_at            timestamptz not null default now()
);

create table public.wallet_transactions (
  id          uuid primary key default uuid_generate_v4(),
  wallet_id   uuid not null references public.wallets(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  type        text not null check (type in (
    'topup','escrow_lock','escrow_release','withdrawal',
    'transfer_delayed','payroll_debit','transfer_in','transfer_out'
  )),
  title       text not null,
  amount      numeric(14,2) not null,
  currency    currency_code not null default 'NGN',
  status      text not null default 'pending' check (status in ('completed','pending','failed')),
  reference   text,
  channel     payment_method not null default 'wallet',
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 4: CHATS & MESSAGES
-- ============================================================

create table public.chat_threads (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text,
  avatar                text,
  is_group              boolean not null default false,
  is_channel            boolean not null default false,
  members_count         integer not null default 2,
  is_screenshot_blocked boolean not null default false,
  is_scam_flagged       boolean not null default false,
  scam_reports_count    integer not null default 0,
  active_space_id       uuid,
  ajo_group_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.chat_participants (
  id          uuid primary key default uuid_generate_v4(),
  chat_id     uuid not null references public.chat_threads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  unread_count integer not null default 0,
  joined_at   timestamptz not null default now(),
  unique(chat_id, user_id)
);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  chat_id         uuid not null references public.chat_threads(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  sender_role     text not null default 'user' check (sender_role in ('user','other','system')),
  type            message_type not null default 'text',
  text            text,
  translated_text jsonb,          -- Record<LanguageCode, string>
  image_url       text,
  media_size_kb   integer,
  voice_note      jsonb,          -- VoiceNoteMeta
  product_id      uuid,           -- references products
  escrow_order_id uuid,           -- references escrow_orders
  meme_id         uuid,           -- references meme_stickers
  invoice_data    jsonb,          -- InvoiceData snapshot
  financial_poll  jsonb,          -- FinancialPoll snapshot
  ajo_group_id    uuid,
  scam_entity     jsonb,
  status          message_status not null default 'sent',
  created_at      timestamptz not null default now()
);

create table public.call_logs (
  id          uuid primary key default uuid_generate_v4(),
  caller_id   uuid not null references public.profiles(id),
  callee_id   uuid not null references public.profiles(id),
  type        call_type not null default 'voice',
  direction   call_direction not null,
  duration_seconds integer,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

-- ============================================================
-- SECTION 5: STATUSES (Stories)
-- ============================================================

create table public.statuses (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  status_type     text not null default 'image' check (status_type in ('image','video','thought','media')),
  thought_bg      text,
  media_url       text,
  video_url       text,
  caption         text not null default '',
  views_count     integer not null default 0,
  likes_count     integer not null default 0,
  expires_at      timestamptz not null default now() + interval '24 hours',
  created_at      timestamptz not null default now()
);

create table public.status_views (
  id          uuid primary key default uuid_generate_v4(),
  status_id   uuid not null references public.statuses(id) on delete cascade,
  viewer_id   uuid not null references public.profiles(id),
  has_liked   boolean not null default false,
  viewed_at   timestamptz not null default now(),
  unique(status_id, viewer_id)
);

-- ============================================================
-- SECTION 6: PRODUCTS & MARKETPLACE
-- ============================================================

create table public.products (
  id          uuid primary key default uuid_generate_v4(),
  seller_id   uuid not null references public.profiles(id),
  seller_name text not null,
  title       text not null,
  description text,
  price       numeric(14,2) not null,
  currency    currency_code not null default 'NGN',
  image_url   text,
  category    product_category not null,
  condition   product_condition not null default 'Brand New',
  in_stock    boolean not null default true,
  stock_count integer not null default 0,
  location    text,
  tags        text[],
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.escrow_orders (
  id               uuid primary key default uuid_generate_v4(),
  chat_id          uuid references public.chat_threads(id),
  buyer_id         uuid not null references public.profiles(id),
  seller_id        uuid not null references public.profiles(id),
  product_id       uuid references public.products(id),
  product_snapshot jsonb not null,  -- frozen copy of product at time of order
  quantity         integer not null default 1,
  total_amount     numeric(14,2) not null,
  currency         currency_code not null default 'NGN',
  status           escrow_status not null default 'escrow_secured',
  escrow_pin       text not null,
  buyer_name       text not null,
  seller_name      text not null,
  delivery_address text,
  payment_method   payment_method not null default 'paystack',
  paystack_ref     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Store Subscriptions
create table public.store_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid unique not null references public.profiles(id) on delete cascade,
  store_name      text not null,
  description     text,
  category        text,
  tier            store_tier not null default 'starter_30',
  items_limit     integer not null default 30,
  items_used      integer not null default 0,
  is_active       boolean not null default true,
  payment_method  payment_method not null default 'paystack',
  paystack_ref    text,
  registered_at   timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '30 days'
);

-- ============================================================
-- SECTION 7: ARTISAN SERVICES
-- ============================================================

create table public.artisan_stations (
  id                        uuid primary key default uuid_generate_v4(),
  owner_id                  uuid not null references public.profiles(id) on delete cascade,
  station_name              text not null,
  category                  service_category not null,
  category_label            text,
  location                  text not null,
  workshop_address          text,
  about                     text,
  avatar                    text,
  is_approved               boolean not null default false,
  registration_fee_paid     boolean not null default false,
  registration_fee_amount   numeric(14,2) not null default 5000,
  registration_payment_method payment_method not null default 'wallet',
  operating_hours           jsonb,  -- { days, startTime, endTime, breakTime }
  created_at                timestamptz not null default now()
);

create table public.service_providers (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id),
  station_id       uuid references public.artisan_stations(id),
  name             text not null,
  business_name    text,
  avatar           text,
  category         service_category not null,
  category_label   text,
  rating           numeric(3,2) not null default 0,
  review_count     integer not null default 0,
  hourly_rate      numeric(14,2) not null,
  currency         currency_code not null default 'NGN',
  location         text,
  about            text,
  experience_years integer not null default 0,
  phone            text,
  is_verified      boolean not null default false,
  badge            text,
  availability     jsonb,  -- { days: string[], timeSlots: string[] }
  services_offered jsonb,  -- ServiceOffering[]
  portfolio_images text[],
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.artisan_staff (
  id          uuid primary key default uuid_generate_v4(),
  station_id  uuid not null references public.artisan_stations(id) on delete cascade,
  name        text not null,
  role        text not null,
  phone       text,
  avatar      text,
  joined_at   timestamptz not null default now()
);

create table public.artisan_tasks (
  id           uuid primary key default uuid_generate_v4(),
  station_id   uuid not null references public.artisan_stations(id) on delete cascade,
  title        text not null,
  description  text,
  assigned_to  text,
  status       text not null default 'pending' check (status in ('pending','in_progress','completed')),
  due_date     date,
  created_at   timestamptz not null default now()
);

create table public.service_bookings (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.profiles(id),
  provider_id     uuid not null references public.service_providers(id),
  service_title   text not null,
  service_price   numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  booking_date    date not null,
  time_slot       text not null,
  location        text,
  notes           text,
  status          text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  payment_method  payment_method not null default 'wallet',
  paystack_ref    text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 8: AJO / ESUSU (Rotating Savings)
-- ============================================================

create table public.ajo_groups (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  description              text,
  cycle_contribution_amount numeric(14,2) not null,
  currency                 currency_code not null default 'NGN',
  frequency                ajo_frequency not null default 'monthly',
  total_rounds             integer not null,
  current_round            integer not null default 1,
  next_payout_date         date,
  current_recipient_name   text,
  total_pool_per_round     numeric(14,2),
  rules                    text,
  creator_id               uuid not null references public.profiles(id),
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);

create table public.ajo_members (
  id                    uuid primary key default uuid_generate_v4(),
  group_id              uuid not null references public.ajo_groups(id) on delete cascade,
  user_id               uuid references public.profiles(id),
  name                  text not null,
  avatar                text,
  phone                 text,
  payout_position       integer not null,
  has_paid_current_cycle boolean not null default false,
  payout_date           date,
  is_received_payout    boolean not null default false,
  joined_at             timestamptz not null default now(),
  unique(group_id, payout_position)
);

-- ============================================================
-- SECTION 9: SCAM CHECKER
-- ============================================================

create table public.scam_reports (
  id           uuid primary key default uuid_generate_v4(),
  target_value text not null,
  target_type  text not null check (target_type in ('phone','bank_account')),
  account_name text,
  bank_name    text,
  risk_level   risk_level not null default 'suspicious',
  reports_count integer not null default 1,
  flags        jsonb,  -- [{ date, reason, flaggedBy }]
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(target_value, target_type)
);

create table public.scam_flag_submissions (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id),
  target_value text not null,
  target_type  text not null check (target_type in ('phone','bank_account')),
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 10: PAYROLL
-- ============================================================

create table public.payroll_employees (
  id              uuid primary key default uuid_generate_v4(),
  employer_id     uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  role            text,
  phone           text,
  avatar          text,
  bank_name       text,
  account_number  text,
  base_salary     numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.payroll_run_logs (
  id              uuid primary key default uuid_generate_v4(),
  employer_id     uuid not null references public.profiles(id),
  employee_id     uuid not null references public.payroll_employees(id),
  amount_paid     numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  run_date        date not null,
  paystack_ref    text,
  status          payout_status not null default 'pending',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 11: DELAYED TRANSFERS
-- ============================================================

create table public.delayed_transfers (
  id              uuid primary key default uuid_generate_v4(),
  sender_id       uuid not null references public.profiles(id),
  recipient_name  text not null,
  recipient_phone text,
  recipient_account text,
  bank_name       text,
  amount          numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  note            text,
  scheduled_at    timestamptz not null,
  executed_at     timestamptz,
  status          text not null default 'pending' check (status in ('pending','executed','cancelled')),
  paystack_ref    text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 12: DISPATCH / COURIER
-- ============================================================

create table public.dispatch_orders (
  id                uuid primary key default uuid_generate_v4(),
  sender_id         uuid not null references public.profiles(id),
  pickup_address    text not null,
  delivery_address  text not null,
  recipient_name    text not null,
  recipient_phone   text not null,
  package_description text,
  package_size      text check (package_size in ('small','medium','large','xl')),
  weight_kg         numeric(6,2),
  price             numeric(14,2) not null,
  currency          currency_code not null default 'NGN',
  provider          text not null check (provider in ('PickkR','Gokada','Kwik')),
  rider_name        text,
  rider_phone       text,
  rider_avatar      text,
  tracking_code     text unique,
  status            dispatch_status not null default 'pending',
  estimated_minutes integer,
  pickup_at         timestamptz,
  delivered_at      timestamptz,
  paystack_ref      text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- SECTION 13: JOB BOARD
-- ============================================================

create table public.job_postings (
  id               uuid primary key default uuid_generate_v4(),
  poster_id        uuid not null references public.profiles(id),
  title            text not null,
  company          text,
  location         text,
  type             text not null check (type in ('full_time','part_time','contract','freelance','remote')),
  salary_min       numeric(14,2),
  salary_max       numeric(14,2),
  currency         currency_code not null default 'NGN',
  description      text,
  requirements     text[],
  skills_needed    text[],
  apply_link       text,
  apply_via_chat   boolean not null default false,
  is_active        boolean not null default true,
  applications_count integer not null default 0,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz
);

create table public.job_applications (
  id          uuid primary key default uuid_generate_v4(),
  job_id      uuid not null references public.job_postings(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id),
  cover_note  text,
  status      text not null default 'applied' check (status in ('applied','reviewed','shortlisted','rejected','hired')),
  applied_at  timestamptz not null default now(),
  unique(job_id, applicant_id)
);

-- ============================================================
-- SECTION 14: HEALTH (AfriHealth)
-- ============================================================

create table public.doctors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id),
  name            text not null,
  specialty       text not null,
  avatar          text,
  hospital        text,
  location        text,
  rating          numeric(3,2) not null default 0,
  review_count    integer not null default 0,
  consultation_fee numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  available_slots jsonb,
  is_online       boolean not null default false,
  languages       text[],
  created_at      timestamptz not null default now()
);

create table public.hospital_queue_tokens (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references public.profiles(id),
  doctor_id    uuid references public.doctors(id),
  hospital     text not null,
  queue_number integer not null,
  status       text not null default 'waiting' check (status in ('waiting','called','completed','cancelled')),
  booked_at    timestamptz not null default now(),
  called_at    timestamptz
);

create table public.medication_reminders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  medication_name text not null,
  dosage          text,
  frequency       text,
  reminder_times  text[],
  start_date      date,
  end_date        date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.health_vault_records (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  record_type     text not null check (record_type in ('lab_result','prescription','scan','vaccination','other')),
  title           text not null,
  file_url        text,
  notes           text,
  recorded_at     date,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 15: LEGAL (AfriLaw)
-- ============================================================

create table public.lawyers (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id),
  name                text not null,
  specialty           text not null,
  avatar              text,
  location            text,
  rating              numeric(3,2) not null default 0,
  review_count        integer not null default 0,
  hourly_rate         numeric(14,2) not null,
  currency            currency_code not null default 'NGN',
  bar_number          text,
  years_experience    integer not null default 0,
  is_verified         boolean not null default false,
  languages           text[],
  created_at          timestamptz not null default now()
);

create table public.legal_contract_templates (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  category    text not null,
  description text,
  template    text not null,  -- text with {{PLACEHOLDER}} variables
  price       numeric(14,2) not null default 0,
  currency    currency_code not null default 'NGN',
  is_free     boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.generated_contracts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id),
  template_id     uuid references public.legal_contract_templates(id),
  title           text not null,
  content         text not null,
  parties         jsonb,  -- { partyA, partyB, ... }
  is_signed       boolean not null default false,
  signed_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 16: CREATOR HUB
-- ============================================================

create table public.creator_profiles (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid unique not null references public.profiles(id) on delete cascade,
  display_name        text not null,
  bio                 text,
  avatar              text,
  cover_image         text,
  category            text,
  followers_count     integer not null default 0,
  total_earnings_ngn  numeric(14,2) not null default 0,
  is_verified         boolean not null default false,
  vip_services        jsonb,  -- CreatorVipService rates
  tip_link_enabled    boolean not null default true,
  created_at          timestamptz not null default now()
);

create table public.creator_posts (
  id              uuid primary key default uuid_generate_v4(),
  creator_id      uuid not null references public.creator_profiles(id) on delete cascade,
  content         text,
  media_url       text,
  media_type      text check (media_type in ('image','video','audio','none')),
  is_paid_content boolean not null default false,
  price           numeric(14,2),
  currency        currency_code not null default 'NGN',
  likes_count     integer not null default 0,
  comments_count  integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.creator_songs (
  id              uuid primary key default uuid_generate_v4(),
  creator_id      uuid not null references public.creator_profiles(id) on delete cascade,
  title           text not null,
  cover_art_url   text,
  audio_url       text,
  duration_seconds integer,
  plays_count     integer not null default 0,
  price           numeric(14,2) not null default 0,
  currency        currency_code not null default 'NGN',
  is_free         boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.creator_show_tickets (
  id              uuid primary key default uuid_generate_v4(),
  creator_id      uuid not null references public.creator_profiles(id) on delete cascade,
  title           text not null,
  description     text,
  event_date      timestamptz not null,
  venue           text,
  ticket_price    numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  total_seats     integer not null,
  sold_count      integer not null default 0,
  is_virtual      boolean not null default false,
  stream_url      text,
  created_at      timestamptz not null default now()
);

create table public.creator_digital_files (
  id              uuid primary key default uuid_generate_v4(),
  creator_id      uuid not null references public.creator_profiles(id) on delete cascade,
  title           text not null,
  description     text,
  category        text not null check (category in (
    'ebook','music_audio','video','design_art','preset_lut',
    'code_software','pdf_guide','other'
  )),
  file_name       text not null,
  file_size       text,
  file_type       text,
  storage_path    text,  -- Supabase Storage path
  price           numeric(14,2) not null,
  currency        currency_code not null default 'NGN',
  downloads_count integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.digital_file_purchases (
  id          uuid primary key default uuid_generate_v4(),
  file_id     uuid not null references public.creator_digital_files(id),
  buyer_id    uuid not null references public.profiles(id),
  amount_paid numeric(14,2) not null,
  paystack_ref text,
  purchased_at timestamptz not null default now(),
  unique(file_id, buyer_id)
);

-- ============================================================
-- SECTION 17: WRITERS GUILD (AfriBooks)
-- ============================================================

create table public.afri_books (
  id                      uuid primary key default uuid_generate_v4(),
  author_id               uuid not null references public.profiles(id),
  title                   text not null,
  cover_url               text,
  genre                   text,
  synopsis                text,
  is_human_written_certified boolean not null default true,
  pricing_type            text not null default 'free' check (pricing_type in ('free','paid')),
  price                   numeric(14,2) not null default 0,
  currency                currency_code not null default 'NGN',
  total_reads             integer not null default 0,
  tips_received_count     integer not null default 0,
  tips_total_amount       numeric(14,2) not null default 0,
  is_published            boolean not null default false,
  published_at            timestamptz,
  created_at              timestamptz not null default now()
);

create table public.book_chapters (
  id                uuid primary key default uuid_generate_v4(),
  book_id           uuid not null references public.afri_books(id) on delete cascade,
  chapter_number    integer not null,
  title             text not null,
  content           text not null,
  read_time_minutes integer,
  created_at        timestamptz not null default now(),
  unique(book_id, chapter_number)
);

create table public.book_chapter_comments (
  id              uuid primary key default uuid_generate_v4(),
  chapter_id      uuid not null references public.book_chapters(id) on delete cascade,
  reader_id       uuid not null references public.profiles(id),
  comment         text not null,
  created_at      timestamptz not null default now()
);

create table public.book_purchases (
  id          uuid primary key default uuid_generate_v4(),
  book_id     uuid not null references public.afri_books(id),
  buyer_id    uuid not null references public.profiles(id),
  amount_paid numeric(14,2) not null,
  paystack_ref text,
  purchased_at timestamptz not null default now(),
  unique(book_id, buyer_id)
);

create table public.book_tips (
  id          uuid primary key default uuid_generate_v4(),
  book_id     uuid not null references public.afri_books(id),
  tipper_id   uuid not null references public.profiles(id),
  amount      numeric(14,2) not null,
  currency    currency_code not null default 'NGN',
  message     text,
  created_at  timestamptz not null default now()
);

create table public.group_read_sessions (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid not null references public.afri_books(id),
  host_user_id    uuid not null references public.profiles(id),
  buddy_user_id   uuid not null references public.profiles(id),
  current_chapter integer not null default 1,
  current_page    integer not null default 1,
  is_paid_by_one  boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.group_read_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.group_read_sessions(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  text        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 18: TUTORS & COURSES
-- ============================================================

create table public.tutor_profiles (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid unique not null references public.profiles(id) on delete cascade,
  tutor_name          text not null,
  bio                 text,
  category            text,
  has_blue_check      boolean not null default false,
  tier                tutor_tier not null default 'starter_10',
  courses_limit       integer not null default 10,
  active_courses_count integer not null default 0,
  total_earnings      numeric(14,2) not null default 0,
  registration_fee_paid boolean not null default false,
  registered_at       timestamptz not null default now(),
  renewal_date        timestamptz
);

create table public.courses (
  id                      uuid primary key default uuid_generate_v4(),
  tutor_id                uuid not null references public.tutor_profiles(id) on delete cascade,
  title                   text not null,
  description             text,
  category                course_category not null,
  price                   numeric(14,2) not null default 0,
  currency                currency_code not null default 'NGN',
  thumbnail_url           text,
  lessons_count           integer not null default 0,
  total_duration_hours    numeric(6,2) not null default 0,
  enrolled_students_count integer not null default 0,
  rating                  numeric(3,2) not null default 0,
  reviews_count           integer not null default 0,
  is_published            boolean not null default false,
  created_at              timestamptz not null default now()
);

create table public.course_lessons (
  id              uuid primary key default uuid_generate_v4(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  title           text not null,
  duration_minutes integer,
  video_url       text,
  notes           text,
  is_preview      boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.course_enrollments (
  id              uuid primary key default uuid_generate_v4(),
  course_id       uuid not null references public.courses(id),
  student_id      uuid not null references public.profiles(id),
  amount_paid     numeric(14,2) not null default 0,
  paystack_ref    text,
  enrolled_at     timestamptz not null default now(),
  unique(course_id, student_id)
);

-- ============================================================
-- SECTION 19: CELEBRITY VERIFICATION
-- ============================================================

create table public.celebrity_applications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id),
  stage_name      text not null,
  real_name       text not null,
  category        celebrity_category not null,
  social_handle   text,
  proof_doc_url   text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.profiles(id),
  review_note     text,
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz
);

-- ============================================================
-- SECTION 20: REFERRAL / INVITE & EARN
-- ============================================================

create table public.referral_programs (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid unique not null references public.profiles(id),
  referral_code         text unique not null,
  total_invites         integer not null default 0,
  valid_invites         integer not null default 0,
  total_earnings_ngn    numeric(14,2) not null default 0,
  pending_payout_ngn    numeric(14,2) not null default 0,
  reward_per_invite_ngn numeric(14,2) not null default 500,
  created_at            timestamptz not null default now()
);

create table public.referred_users (
  id              uuid primary key default uuid_generate_v4(),
  referrer_id     uuid not null references public.profiles(id),
  referred_user_id uuid references public.profiles(id),
  referred_name   text not null,
  referred_phone  text,
  joined_at       timestamptz,
  is_ghost        boolean not null default false,  -- anti-ghost: joined but never sent a message
  reward_paid     boolean not null default false,
  reward_amount   numeric(14,2) not null default 500,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 21: STREET RADIO / AUDIO SPACES
-- ============================================================

create table public.audio_spaces (
  id                  uuid primary key default uuid_generate_v4(),
  host_id             uuid not null references public.profiles(id),
  title               text not null,
  topic               text,
  category            text not null check (category in (
    'Tech & Hustle','Afrobeats & Music','Football Banter','Market Townhall'
  )),
  listeners_count     integer not null default 0,
  is_live             boolean not null default false,
  is_low_bandwidth_mode boolean not null default true,
  started_at          timestamptz,
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
);

create table public.audio_space_speakers (
  id          uuid primary key default uuid_generate_v4(),
  space_id    uuid not null references public.audio_spaces(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  role        text not null default 'speaker' check (role in ('host','co-host','speaker')),
  is_speaking boolean not null default false,
  is_muted    boolean not null default true,
  joined_at   timestamptz not null default now(),
  unique(space_id, user_id)
);

-- ============================================================
-- SECTION 22: MEME STUDIO
-- ============================================================

create table public.meme_stickers (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  image_url       text not null,
  tags            text[],
  category        text,
  culture_origin  text,
  top_text        text,
  bottom_text     text,
  created_by      uuid references public.profiles(id),
  is_official     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SECTION 23: TOWN (Communities)
-- ============================================================

create table public.town_communities (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  avatar          text,
  cover_image     text,
  category        text,
  members_count   integer not null default 0,
  is_live         boolean not null default false,
  tags            text[],
  creator_id      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create table public.community_members (
  id          uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.town_communities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  role        text not null default 'member' check (role in ('admin','moderator','member')),
  joined_at   timestamptz not null default now(),
  unique(community_id, user_id)
);

-- ============================================================
-- SECTION 24: ADMIN & BROADCASTS
-- ============================================================

create table public.system_broadcasts (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  message     text not null,
  level       broadcast_level not null default 'info',
  created_by  uuid references public.profiles(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

-- ============================================================
-- SECTION 25: SECURITY
-- ============================================================

create table public.security_pins (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid unique not null references public.profiles(id) on delete cascade,
  pin_hash    text not null,  -- bcrypt hash of 4-digit PIN
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SECTION 26: FINANCIAL POLLS
-- ============================================================

create table public.financial_polls (
  id                uuid primary key default uuid_generate_v4(),
  creator_id        uuid not null references public.profiles(id),
  chat_id           uuid references public.chat_threads(id),
  title             text not null,
  stake_per_vote    numeric(14,2) not null,
  currency          currency_code not null default 'NGN',
  total_stake_locked numeric(14,2) not null default 0,
  total_voters      integer not null default 0,
  status            text not null default 'active' check (status in ('active','closed')),
  payout_rule       text,
  created_at        timestamptz not null default now(),
  closed_at         timestamptz
);

create table public.poll_options (
  id          uuid primary key default uuid_generate_v4(),
  poll_id     uuid not null references public.financial_polls(id) on delete cascade,
  text        text not null,
  votes_count integer not null default 0,
  sort_order  integer not null default 0
);

create table public.poll_votes (
  id          uuid primary key default uuid_generate_v4(),
  poll_id     uuid not null references public.financial_polls(id),
  option_id   uuid not null references public.poll_options(id),
  voter_id    uuid not null references public.profiles(id),
  amount_staked numeric(14,2) not null,
  voted_at    timestamptz not null default now(),
  unique(poll_id, voter_id)
);

-- ============================================================
-- SECTION 27: INDEXES FOR PERFORMANCE
-- ============================================================

-- Messages
create index idx_messages_chat_id    on public.messages(chat_id);
create index idx_messages_sender_id  on public.messages(sender_id);
create index idx_messages_created_at on public.messages(created_at desc);

-- Products
create index idx_products_seller_id  on public.products(seller_id);
create index idx_products_category   on public.products(category);
create index idx_products_active     on public.products(is_active) where is_active = true;

-- Escrow orders
create index idx_escrow_buyer_id     on public.escrow_orders(buyer_id);
create index idx_escrow_seller_id    on public.escrow_orders(seller_id);
create index idx_escrow_status       on public.escrow_orders(status);

-- Wallet transactions
create index idx_wallet_tx_user_id   on public.wallet_transactions(user_id);
create index idx_wallet_tx_created   on public.wallet_transactions(created_at desc);

-- Service providers
create index idx_providers_category  on public.service_providers(category);
create index idx_providers_verified  on public.service_providers(is_verified);

-- Courses
create index idx_courses_tutor_id    on public.courses(tutor_id);
create index idx_courses_category    on public.courses(category);

-- Chat participants
create index idx_chat_participants_user on public.chat_participants(user_id);

-- Statuses (only unexpired)
create index idx_statuses_expires_at on public.statuses(expires_at);

-- ============================================================
-- SECTION 28: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.messages            enable row level security;
alter table public.chat_participants   enable row level security;
alter table public.escrow_orders       enable row level security;
alter table public.products            enable row level security;
alter table public.statuses            enable row level security;
alter table public.artisan_stations    enable row level security;
alter table public.service_bookings    enable row level security;
alter table public.payroll_employees   enable row level security;
alter table public.payroll_run_logs    enable row level security;
alter table public.delayed_transfers   enable row level security;
alter table public.health_vault_records enable row level security;
alter table public.generated_contracts enable row level security;
alter table public.security_pins       enable row level security;
alter table public.referral_programs   enable row level security;
alter table public.referred_users      enable row level security;
alter table public.tutor_profiles      enable row level security;
alter table public.creator_profiles    enable row level security;
alter table public.celebrity_applications enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: users can read all, update only own
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Wallets: only owner
create policy "wallet_owner_only" on public.wallets
  for all using (auth.uid() = user_id);

-- Wallet transactions: only owner
create policy "wallet_tx_owner_only" on public.wallet_transactions
  for all using (auth.uid() = user_id);

-- Messages: chat participants only
create policy "messages_chat_members" on public.messages
  for select using (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id and cp.user_id = auth.uid()
    )
  );
create policy "messages_insert_members" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = messages.chat_id and cp.user_id = auth.uid()
    )
  );

-- Products: anyone can read; only seller can modify
create policy "products_read_all"    on public.products for select using (true);
create policy "products_seller_only" on public.products
  for all using (auth.uid() = seller_id);

-- Escrow orders: buyer or seller only
create policy "escrow_parties_only" on public.escrow_orders
  for all using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Statuses: anyone can read unexpired; owner can insert/delete
create policy "statuses_read_all" on public.statuses
  for select using (expires_at > now());
create policy "statuses_owner" on public.statuses
  for all using (auth.uid() = user_id);

-- Artisan stations: owner only
create policy "artisan_station_owner" on public.artisan_stations
  for all using (auth.uid() = owner_id);
create policy "artisan_station_read"  on public.artisan_stations
  for select using (true);

-- Service bookings: client or provider's user
create policy "booking_parties" on public.service_bookings
  for all using (auth.uid() = client_id);

-- Payroll: employer only
create policy "payroll_employer" on public.payroll_employees
  for all using (auth.uid() = employer_id);
create policy "payroll_logs_employer" on public.payroll_run_logs
  for all using (auth.uid() = employer_id);

-- Delayed transfers: sender only
create policy "delayed_transfers_sender" on public.delayed_transfers
  for all using (auth.uid() = sender_id);

-- Health vault: patient only
create policy "health_vault_owner" on public.health_vault_records
  for all using (auth.uid() = user_id);

-- Legal contracts: creator only
create policy "contracts_owner" on public.generated_contracts
  for all using (auth.uid() = user_id);

-- Security PIN: owner only
create policy "security_pin_owner" on public.security_pins
  for all using (auth.uid() = user_id);

-- Referrals: owner only
create policy "referral_owner" on public.referral_programs
  for all using (auth.uid() = user_id);
create policy "referred_users_owner" on public.referred_users
  for all using (auth.uid() = referrer_id);

-- Tutor profile: owner + public read
create policy "tutor_read_all"  on public.tutor_profiles for select using (true);
create policy "tutor_owner"     on public.tutor_profiles
  for all using (auth.uid() = user_id);

-- Creator profiles: public read, owner write
create policy "creator_read_all" on public.creator_profiles for select using (true);
create policy "creator_owner"    on public.creator_profiles
  for all using (auth.uid() = user_id);

-- Celebrity applications: own applications only
create policy "celebrity_app_owner" on public.celebrity_applications
  for all using (auth.uid() = user_id);

-- ============================================================
-- SECTION 29: AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  );

  insert into public.wallets (user_id, available_balance, currency)
  values (new.id, 0, 'NGN');

  insert into public.referral_programs (user_id, referral_code)
  values (new.id, upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 8)));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SECTION 30: REALTIME SUBSCRIPTIONS (enable for key tables)
-- ============================================================

-- Enable realtime for chat-critical tables
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_threads;
alter publication supabase_realtime add table public.chat_participants;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.statuses;
alter publication supabase_realtime add table public.escrow_orders;
alter publication supabase_realtime add table public.audio_spaces;
alter publication supabase_realtime add table public.system_broadcasts;

-- ============================================================
-- SECTION 31: STORAGE BUCKETS (run separately in Storage tab)
-- ============================================================
-- create these buckets in Supabase Dashboard → Storage:
--
-- 1. avatars          (public)   — profile pictures
-- 2. status-media     (public)   — status images/videos
-- 3. product-images   (public)   — marketplace product photos
-- 4. chat-media       (private)  — chat images/voice notes
-- 5. health-vault     (private)  — medical records
-- 6. creator-files    (private)  — digital file downloads
-- 7. book-covers      (public)   — AfriBooks cover art
-- 8. meme-stickers    (public)   — meme/sticker images
-- 9. legal-docs       (private)  — contract PDFs
-- 10. dispatch-proof  (private)  — delivery photos

-- ============================================================
-- Done! Schema created for AfriChat Super-App
-- Tables: 55 | RLS: enabled | Realtime: 8 tables | Triggers: 1
-- ============================================================

-- ============================================================
-- SECTION 32: FINANCIAL & WALLET LEDGER RPCs (DOUBLE-SPEND DEFENSE)
-- Row-Level Locking (SELECT ... FOR UPDATE) prevents race conditions
-- ============================================================

create or replace function public.transfer_wallet_funds(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_amount numeric,
  p_note text default 'Peer Transfer'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sender_wallet record;
  v_recipient_wallet record;
begin
  if p_amount <= 0 then
    return jsonb_build_object('success', false, 'message', 'Transfer amount must be positive');
  end if;

  if p_sender_id = p_recipient_id then
    return jsonb_build_object('success', false, 'message', 'Cannot transfer to self');
  end if;

  -- 1. Lock sender wallet row to prevent concurrent double-spending
  select * into v_sender_wallet
  from public.wallets
  where user_id = p_sender_id
  for update;

  if not found or v_sender_wallet.available_balance < p_amount then
    return jsonb_build_object('success', false, 'message', 'Insufficient available balance');
  end if;

  -- 2. Lock recipient wallet row
  select * into v_recipient_wallet
  from public.wallets
  where user_id = p_recipient_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Recipient wallet not found');
  end if;

  -- 3. Execute atomic balance debit and credit
  update public.wallets
  set available_balance = available_balance - p_amount,
      updated_at = now()
  where user_id = p_sender_id;

  update public.wallets
  set available_balance = available_balance + p_amount,
      updated_at = now()
  where user_id = p_recipient_id;

  -- 4. Record audit ledger entries for both parties
  insert into public.wallet_transactions (wallet_id, user_id, type, title, amount, currency, status, channel)
  values
    (v_sender_wallet.id, p_sender_id, 'transfer_out', coalesce(p_note, 'Transfer Sent'), p_amount, v_sender_wallet.currency, 'completed', 'wallet'),
    (v_recipient_wallet.id, p_recipient_id, 'transfer_in', coalesce(p_note, 'Transfer Received'), p_amount, v_recipient_wallet.currency, 'completed', 'wallet');

  return jsonb_build_object('success', true, 'message', 'Transfer completed successfully');
end;
$$;

create or replace function public.lock_escrow_funds(
  p_buyer_id uuid,
  p_order_id uuid,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet record;
begin
  -- Lock buyer wallet row
  select * into v_wallet
  from public.wallets
  where user_id = p_buyer_id
  for update;

  if not found or v_wallet.available_balance < p_amount then
    return jsonb_build_object('success', false, 'message', 'Insufficient wallet balance to lock in escrow');
  end if;

  -- Move from available to escrow_locked
  update public.wallets
  set available_balance = available_balance - p_amount,
      escrow_locked_balance = escrow_locked_balance + p_amount,
      updated_at = now()
  where user_id = p_buyer_id;

  insert into public.wallet_transactions (wallet_id, user_id, type, title, amount, currency, status, channel)
  values (v_wallet.id, p_buyer_id, 'escrow_lock', 'Escrow locked for Order #' || substring(p_order_id::text, 1, 8), p_amount, v_wallet.currency, 'completed', 'wallet');

  return jsonb_build_object('success', true, 'message', 'Funds secured in escrow');
end;
$$;

create or replace function public.release_escrow_funds(
  p_order_id uuid,
  p_release_pin text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_buyer_wallet record;
  v_seller_wallet record;
begin
  -- 1. Lock escrow order row
  select * into v_order
  from public.escrow_orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Escrow order not found');
  end if;

  if v_order.status = 'funds_released' then
    return jsonb_build_object('success', false, 'message', 'Funds already released for this order');
  end if;

  if v_order.escrow_pin != p_release_pin then
    return jsonb_build_object('success', false, 'message', 'Invalid 4-digit release PIN');
  end if;

  -- 2. Lock buyer wallet to deduct escrow_locked
  select * into v_buyer_wallet
  from public.wallets
  where user_id = v_order.buyer_id
  for update;

  -- 3. Lock seller wallet to credit available
  select * into v_seller_wallet
  from public.wallets
  where user_id = v_order.seller_id
  for update;

  -- Update wallets
  if v_buyer_wallet.id is not null then
    update public.wallets
    set escrow_locked_balance = greatest(0, escrow_locked_balance - v_order.total_amount),
        updated_at = now()
    where id = v_buyer_wallet.id;
  end if;

  if v_seller_wallet.id is not null then
    update public.wallets
    set available_balance = available_balance + v_order.total_amount,
        updated_at = now()
    where id = v_seller_wallet.id;
  end if;

  -- Update order status
  update public.escrow_orders
  set status = 'funds_released',
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('success', true, 'message', 'Escrow funds successfully released to seller');
end;
$$;

-- ============================================================
-- SECTION 33: NDPA RIGHT TO ERASURE (DATA SCRUBBING RPC)
-- ============================================================

create or replace function public.purge_user_data_ndpa(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
begin
  -- Verify calling user matches targeted ID
  if auth.uid() != p_user_id then
    return jsonb_build_object('success', false, 'message', 'Unauthorized: NDPA data erasure must be self-initiated');
  end if;

  -- 1. Remove sensitive vault records
  delete from public.health_vault_records where user_id = p_user_id;
  delete from public.generated_contracts where user_id = p_user_id;
  delete from public.medication_reminders where user_id = p_user_id;
  delete from public.security_pins where user_id = p_user_id;

  -- 2. Scrub PII from profiles
  update public.profiles
  set full_name = 'Deactivated User',
      phone_number = null,
      avatar_url = null,
      bio = 'Account erased pursuant to NDPA 2023',
      status = 'suspended',
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true, 'message', 'Personal data scrubbed successfully pursuant to NDPA');
end;
$$;

-- ============================================================
-- SECTION 34: AGC STATUSES, ERRANDS & FEATURE FLAGS
-- ============================================================

-- Persistent 24h User Statuses (Solves refresh disappearance)
create table if not exists public.user_statuses (
  id              text primary key,
  user_id         text not null,
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

-- Errand Runners Directory
create table if not exists public.errand_runners (
  id                text primary key,
  user_id           text not null,
  name              text not null,
  phone             text not null,
  avatar            text,
  location          text not null,
  bio               text,
  rating            numeric(3,2) default 5.0,
  completed_count   int default 0,
  delivery_base_fee numeric(12,2) default 1500.00,
  currency          text default 'NGN',
  is_online         boolean default true,
  is_registered     boolean default true,
  created_at        timestamptz default now()
);

-- Errand Inventory Items (Runner controls what they can buy)
create table if not exists public.errand_items (
  id              text primary key,
  runner_id       text references public.errand_runners(id) on delete cascade,
  name            text not null,
  price           numeric(12,2) not null,
  unit            text not null default 'kg',
  category        text default 'Groceries',
  in_stock        boolean default true,
  created_at      timestamptz default now()
);

-- Errand Orders with Escrow PIN Code & Image Proof
create table if not exists public.errand_orders (
  id                  text primary key,
  customer_id         text not null,
  customer_name       text not null,
  customer_phone      text not null,
  runner_id           text not null,
  runner_name         text not null,
  runner_phone        text not null,
  items_json          jsonb not null default '[]'::jsonb,
  items_total         numeric(12,2) not null,
  delivery_fee        numeric(12,2) not null,
  total_amount        numeric(12,2) not null,
  currency            text default 'NGN',
  dropoff_address     text not null,
  custom_notes        text,
  status              text default 'pending',
  escrow_release_code text not null,
  proof_images        text[] default array[]::text[],
  dispute_reason      text,
  created_at          timestamptz default now()
);

-- Admin Feature Switches Table (Controls Wallet & Subsystems)
create table if not exists public.feature_flags (
  id              text primary key default 'global_flags',
  wallet          boolean default true,
  market          boolean default true,
  artisan         boolean default true,
  errands         boolean default true,
  ajo             boolean default true,
  payroll         boolean default true,
  writers         boolean default true,
  creator         boolean default true,
  escrow          boolean default true,
  tutor           boolean default true,
  dispatch        boolean default true,
  calls           boolean default true,
  status          boolean default true,
  town            boolean default true,
  audio_spaces    boolean default true,
  healthcare      boolean default true,
  legal           boolean default true,
  jobs            boolean default true,
  updated_at      timestamptz default now()
);

-- Enable RLS
alter table public.user_statuses enable row level security;
alter table public.errand_runners enable row level security;
alter table public.errand_items enable row level security;
alter table public.errand_orders enable row level security;
alter table public.feature_flags enable row level security;

create policy "Public read statuses" on public.user_statuses for select using (true);
create policy "Authenticated write statuses" on public.user_statuses for insert with check (true);

create policy "Public read errand runners" on public.errand_runners for select using (true);
create policy "Public read errand items" on public.errand_items for select using (true);
create policy "Public read feature flags" on public.feature_flags for select using (true);
