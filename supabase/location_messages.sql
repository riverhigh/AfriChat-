-- ============================================================
-- AGC (All Good Connects) — Location Pin Messages Migration
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Extend message_type enum safely to support 'location' and 'game_xo'
do $$
begin
  if exists (select 1 from pg_type where typname = 'message_type') then
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'message_type' and e.enumlabel = 'location'
    ) then
      alter type public.message_type add value 'location';
    end if;

    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'message_type' and e.enumlabel = 'game_xo'
    ) then
      alter type public.message_type add value 'game_xo';
    end if;
  end if;
end
$$;

-- 2. Add message_type & metadata jsonb columns to public.messages
alter table if exists public.messages
  add column if not exists message_type text default 'text';

alter table if exists public.messages
  add column if not exists metadata jsonb;

-- 3. Optional support if a separate public.chat_messages table is used
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'chat_messages'
  ) then
    alter table public.chat_messages add column if not exists message_type text default 'text';
    alter table public.chat_messages add column if not exists metadata jsonb;
  end if;
end
$$;
