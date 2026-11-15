-- ============================================================
-- WALLET SECURITY HARDENING MIGRATION
-- Defends against:
--   1. Direct browser Supabase tampering (wallets UPDATE/INSERT/DELETE)
--   2. Paystack webhook/reference replay attacks
--   3. Client-side balance inflation
-- ============================================================

-- 1. Drop permissive "FOR ALL" policies that let authenticated users mutate their own balance
drop policy if exists "wallet_owner_only" on public.wallets;
drop policy if exists "wallet_tx_owner_only" on public.wallet_transactions;
drop policy if exists "wallet_select_own" on public.wallets;
drop policy if exists "wallet_tx_select_own" on public.wallet_transactions;

-- 2. Strict SELECT-ONLY RLS policies for client browsers
-- Users can read ONLY their own wallet and ledger rows; all mutations happen via service_role or SECURITY DEFINER RPCs.
create policy "wallet_select_own" on public.wallets
  for select using (auth.uid() = user_id);

create policy "wallet_tx_select_own" on public.wallet_transactions
  for select using (auth.uid() = user_id);

-- 3. Defense-in-depth SQL privilege revocation for client roles
revoke insert, update, delete on public.wallets from anon, authenticated;
revoke insert, update, delete on public.wallet_transactions from anon, authenticated;

-- 4. Database trigger blocking any non-service-role mutation to wallet balances
create or replace function public.prevent_direct_client_wallet_mutation()
returns trigger
language plpgsql
as $$
declare
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  -- Allow Postgres superuser/definer triggers or Supabase service_role backend requests
  if session_user in ('postgres', 'supabase_admin') or v_role = 'service_role' then
    return new;
  end if;

  if new.available_balance is distinct from old.available_balance
     or new.escrow_locked_balance is distinct from old.escrow_locked_balance then
    raise exception 'Direct client modification of wallet balances is strictly prohibited';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_wallet_balance_update on public.wallets;
create trigger trg_guard_wallet_balance_update
  before update on public.wallets
  for each row
  execute function public.prevent_direct_client_wallet_mutation();

-- 5. Idempotent Paystack/Gateway reference registry (prevents replay / double-crediting)
create table if not exists public.verified_payment_references (
  reference    text primary key,
  provider     text not null default 'paystack',
  event        text not null default 'charge.success',
  user_id      uuid references public.profiles(id),
  user_phone   text,
  amount_ngn   numeric(14,2) not null check (amount_ngn > 0),
  fee_ngn      numeric(14,2) not null default 0,
  currency     currency_code not null default 'NGN',
  verified_by  text not null default 'paystack_webhook',
  metadata     jsonb,
  verified_at  timestamptz not null default now()
);

alter table public.verified_payment_references enable row level security;
-- Zero policies for anon/authenticated: exclusively accessible via service_role / server backend

create unique index if not exists idx_wallet_transactions_unique_reference
  on public.wallet_transactions (reference)
  where reference is not null;

-- 6. Atomic, idempotent server-side RPC for crediting wallets after verified Paystack webhook/API check
create or replace function public.credit_wallet_from_verified_webhook(
  p_user_id    uuid,
  p_reference  text,
  p_amount     numeric,
  p_fee        numeric default 0,
  p_currency   currency_code default 'NGN',
  p_title      text default 'Wallet Top-up via Verified Paystack Webhook',
  p_metadata   jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_new_balance numeric(14,2);
begin
  if p_reference is null or length(trim(p_reference)) < 4 then
    return jsonb_build_object('success', false, 'message', 'Valid payment reference required');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'message', 'Credit amount must be positive');
  end if;

  -- Idempotency check: reject replay of an already-credited reference
  if exists (select 1 from public.verified_payment_references where reference = p_reference)
     or exists (select 1 from public.wallet_transactions where reference = p_reference) then
    select * into v_wallet from public.wallets where user_id = p_user_id;
    return jsonb_build_object(
      'success', true,
      'alreadyProcessed', true,
      'availableBalance', coalesce(v_wallet.available_balance, 0)
    );
  end if;

  -- Lock wallet row (or initialize if missing)
  insert into public.wallets (user_id, available_balance, escrow_locked_balance, currency)
  values (p_user_id, 0, 0, p_currency)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  v_new_balance := coalesce(v_wallet.available_balance, 0) + p_amount;

  update public.wallets
  set available_balance = v_new_balance,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.verified_payment_references (
    reference, provider, event, user_id, amount_ngn, fee_ngn, currency, verified_by, metadata
  ) values (
    p_reference, 'paystack', 'charge.success', p_user_id, p_amount, coalesce(p_fee, 0), p_currency, 'server_rpc', p_metadata
  );

  insert into public.wallet_transactions (
    wallet_id, user_id, type, title, amount, currency, status, reference, channel, metadata
  ) values (
    v_wallet.id, p_user_id, 'topup', p_title, p_amount, p_currency, 'completed', p_reference, 'paystack', p_metadata
  );

  return jsonb_build_object(
    'success', true,
    'alreadyProcessed', false,
    'availableBalance', v_new_balance,
    'reference', p_reference
  );
end;
$$;

revoke all on function public.credit_wallet_from_verified_webhook(uuid, text, numeric, numeric, currency_code, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_wallet_from_verified_webhook(uuid, text, numeric, numeric, currency_code, text, jsonb) to service_role;
