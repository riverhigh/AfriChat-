-- ============================================================
-- AGC Super-App: Multiplayer X/O (Tic-Tac-Toe) Game Matches
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Enables persistent game state + Supabase Realtime Postgres Changes
-- ============================================================

create table if not exists public.game_matches (
  id               text primary key,
  chat_id          text not null,
  game_type        text not null default 'xo',
  challenger_id    text,
  challenger_phone text not null,
  challenger_name  text not null,
  opponent_phone   text,
  opponent_name    text,
  mode             text not null default 'friendly' check (mode in ('friendly', 'bet')),
  bet_amount       numeric(14,2) not null default 0,
  currency         text not null default 'NGN',
  status           text not null default 'pending' check (status in ('pending', 'active', 'won', 'draw', 'declined', 'cancelled')),
  current_turn     text not null default 'X' check (current_turn in ('X', 'O')),
  board            jsonb not null default '[null,null,null,null,null,null,null,null,null]'::jsonb,
  state            jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_game_matches_chat_updated
  on public.game_matches (chat_id, updated_at desc);

alter table public.game_matches enable row level security;

drop policy if exists "allow_all_read_game_matches" on public.game_matches;
drop policy if exists "allow_all_insert_game_matches" on public.game_matches;
drop policy if exists "allow_all_update_game_matches" on public.game_matches;
drop policy if exists "allow_all_delete_game_matches" on public.game_matches;

create policy "allow_all_read_game_matches" on public.game_matches
  for select using (true);

create policy "allow_all_insert_game_matches" on public.game_matches
  for insert with check (true);

create policy "allow_all_update_game_matches" on public.game_matches
  for update using (true) with check (true);

create policy "allow_all_delete_game_matches" on public.game_matches
  for delete using (true);

do $$
begin
  alter publication supabase_realtime add table public.game_matches;
exception
  when duplicate_object then null;
  when others then null;
end $$;
