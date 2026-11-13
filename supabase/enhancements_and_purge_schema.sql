-- ============================================================
-- AGC Super-App: 24h Purge, Friend Requests & Group Invitations
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Idempotent script: Safe to run multiple times without errors
-- ============================================================

-- 1. Ensure user_statuses table exists
create table if not exists public.user_statuses (
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

-- Enable RLS
alter table public.user_statuses enable row level security;

-- Drop all existing policy variants before creating fresh ones
drop policy if exists "allow_all_read_statuses" on public.user_statuses;
drop policy if exists "allow_all_insert_statuses" on public.user_statuses;
drop policy if exists "allow_all_update_statuses" on public.user_statuses;
drop policy if exists "allow_all_delete_statuses" on public.user_statuses;
drop policy if exists "Public read statuses" on public.user_statuses;
drop policy if exists "Authenticated write statuses" on public.user_statuses;
drop policy if exists "Allow update statuses" on public.user_statuses;
drop policy if exists "Allow delete expired statuses" on public.user_statuses;
drop policy if exists "allow_all_manage_statuses" on public.user_statuses;

-- Create policies with DELETE support for 24h purge
create policy "allow_all_read_statuses" on public.user_statuses
  for select using (true);

create policy "allow_all_insert_statuses" on public.user_statuses
  for insert with check (true);

create policy "allow_all_update_statuses" on public.user_statuses
  for update using (true) with check (true);

create policy "allow_all_delete_statuses" on public.user_statuses
  for delete using (true);

-- 2. Automated PostgreSQL Stored Function for 24-Hour DB Purge
create or replace function public.purge_expired_user_statuses()
returns int
language plpgsql
security definer
as $$
declare
  deleted_count int;
begin
  delete from public.user_statuses
  where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- 3. WeChat-Style Contact & Friend Requests Table
create table if not exists public.contact_requests (
  id              text primary key,
  from_phone      text not null,
  to_phone        text not null,
  from_name       text not null,
  from_avatar     text,
  greeting        text default 'Hi! I would like to connect on AfriChat.',
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.contact_requests enable row level security;

drop policy if exists "allow_all_read_requests" on public.contact_requests;
drop policy if exists "allow_all_insert_requests" on public.contact_requests;
drop policy if exists "allow_all_update_requests" on public.contact_requests;
drop policy if exists "allow_all_delete_requests" on public.contact_requests;

create policy "allow_all_read_requests" on public.contact_requests
  for select using (true);

create policy "allow_all_insert_requests" on public.contact_requests
  for insert with check (true);

create policy "allow_all_update_requests" on public.contact_requests
  for update using (true) with check (true);

create policy "allow_all_delete_requests" on public.contact_requests
  for delete using (true);

-- 4. Group & Channel Invitations Table
create table if not exists public.group_invitations (
  id              text primary key,
  group_id        text not null,
  group_name      text not null,
  group_avatar    text,
  invited_phone   text not null,
  invited_by_phone text not null,
  invited_by_name text,
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.group_invitations enable row level security;

drop policy if exists "allow_all_read_invites" on public.group_invitations;
drop policy if exists "allow_all_insert_invites" on public.group_invitations;
drop policy if exists "allow_all_update_invites" on public.group_invitations;
drop policy if exists "allow_all_delete_invites" on public.group_invitations;

create policy "allow_all_read_invites" on public.group_invitations
  for select using (true);

create policy "allow_all_insert_invites" on public.group_invitations
  for insert with check (true);

create policy "allow_all_update_invites" on public.group_invitations
  for update using (true) with check (true);

create policy "allow_all_delete_invites" on public.group_invitations
  for delete using (true);

-- 5. Enable Realtime Replication for Instant Cross-Device Sync
do $$
begin
  alter publication supabase_realtime add table public.user_statuses;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.contact_requests;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.group_invitations;
exception when others then null;
end $$;

-- 6. Scam Reports Table Permissions (Persist Reports Directly to DB)
alter table public.scam_reports enable row level security;

drop policy if exists "allow_all_read_scam_reports" on public.scam_reports;
drop policy if exists "allow_all_insert_scam_reports" on public.scam_reports;
drop policy if exists "allow_all_update_scam_reports" on public.scam_reports;
drop policy if exists "allow_all_delete_scam_reports" on public.scam_reports;

create policy "allow_all_read_scam_reports" on public.scam_reports
  for select using (true);

create policy "allow_all_insert_scam_reports" on public.scam_reports
  for insert with check (true);

create policy "allow_all_update_scam_reports" on public.scam_reports
  for update using (true) with check (true);

create policy "allow_all_delete_scam_reports" on public.scam_reports
  for delete using (true);

do $$
begin
  alter publication supabase_realtime add table public.scam_reports;
exception when others then null;
end $$;

-- 7. Automated Database Cleanup: Purge Test & Mock Communities from Town
delete from public.town_communities
where lower(name) like '%test%'
   or lower(name) like '%mock%'
   or lower(name) like '%sample%'
   or lower(id) like 'test_%'
   or lower(id) like '__test%';


-- 8. African Pets Forum & Pet Shop Marketplace Schema
create table if not exists public.pet_listings (
  id text primary key,
  seller_phone text not null,
  seller_name text,
  category text not null,
  title text not null,
  price numeric(12,2) default 0,
  currency text default 'NGN',
  location text,
  breed text,
  age text,
  description text,
  photo text,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.pet_listings enable row level security;
drop policy if exists "allow_all_read_pet_listings" on public.pet_listings;
drop policy if exists "allow_all_insert_pet_listings" on public.pet_listings;
drop policy if exists "allow_all_update_pet_listings" on public.pet_listings;
drop policy if exists "allow_all_delete_pet_listings" on public.pet_listings;

create policy "allow_all_read_pet_listings" on public.pet_listings for select using (true);
create policy "allow_all_insert_pet_listings" on public.pet_listings for insert with check (true);
create policy "allow_all_update_pet_listings" on public.pet_listings for update using (true) with check (true);
create policy "allow_all_delete_pet_listings" on public.pet_listings for delete using (true);

do $$
begin
  alter publication supabase_realtime add table public.pet_listings;
exception when others then null;
end $$;

create table if not exists public.pet_forum_posts (
  id text primary key,
  author_phone text not null,
  author_name text,
  author_avatar text,
  category text not null,
  text text not null,
  image_base64 text,
  like_count integer default 0,
  comment_count integer default 0,
  created_at timestamptz default now()
);

alter table public.pet_forum_posts enable row level security;
drop policy if exists "allow_all_read_pet_forum_posts" on public.pet_forum_posts;
drop policy if exists "allow_all_insert_pet_forum_posts" on public.pet_forum_posts;
drop policy if exists "allow_all_update_pet_forum_posts" on public.pet_forum_posts;

create policy "allow_all_read_pet_forum_posts" on public.pet_forum_posts for select using (true);
create policy "allow_all_insert_pet_forum_posts" on public.pet_forum_posts for insert with check (true);
create policy "allow_all_update_pet_forum_posts" on public.pet_forum_posts for update using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.pet_forum_posts;
exception when others then null;
end $$;
