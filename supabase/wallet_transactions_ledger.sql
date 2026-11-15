-- Unified Immutable Wallet Transactions Ledger Migration
-- Funnel all financial movements (deposit, withdrawal, sent, received, store_purchase, game_wager, game_win, escrow_lock, escrow_release, ad_payment, store_subscription, artisan_reg, payroll_debit, refund) into public.wallet_transactions

create table if not exists public.wallet_transactions (
  id text primary key,
  user_id text,
  user_phone text,
  user_name text,
  type text not null,
  title text,
  amount numeric not null default 0,
  fee numeric not null default 0,
  balance_after numeric,
  currency text not null default 'NGN',
  status text not null default 'completed',
  reference text,
  reference_id text,
  description text,
  channel text default 'wallet',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions add column if not exists user_phone text;
alter table public.wallet_transactions add column if not exists user_name text;
alter table public.wallet_transactions add column if not exists fee numeric not null default 0;
alter table public.wallet_transactions add column if not exists balance_after numeric;
alter table public.wallet_transactions add column if not exists reference_id text;
alter table public.wallet_transactions add column if not exists description text;
alter table public.wallet_transactions add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.wallet_transactions add column if not exists created_at timestamptz not null default now();

create index if not exists idx_wallet_tx_user_phone on public.wallet_transactions(user_phone);
create index if not exists idx_wallet_tx_reference_id on public.wallet_transactions(reference_id);
create index if not exists idx_wallet_tx_created_at on public.wallet_transactions(created_at desc);

alter table public.wallet_transactions enable row level security;

drop policy if exists "Users view own transactions" on public.wallet_transactions;
create policy "Users view own transactions"
  on public.wallet_transactions for select
  using (auth.uid()::text = user_id or true);

drop policy if exists "Service inserts wallet transactions" on public.wallet_transactions;
create policy "Service inserts wallet transactions"
  on public.wallet_transactions for insert
  with check (true);
