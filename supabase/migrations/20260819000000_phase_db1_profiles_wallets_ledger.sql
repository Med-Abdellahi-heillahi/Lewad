-- Lewad DB1: profiles, wallets, credit ledger, welcome bonus and RLS.
-- Apply this migration through the Supabase CLI or the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  full_name_ar text,
  email text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_user_id_idx unique (user_id)
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  amount integer not null check (amount <> 0),
  type text not null check (type in ('welcome_bonus', 'search_debit', 'recharge_credit', 'admin_adjustment', 'referral_bonus')),
  reason text,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);
create index if not exists credit_ledger_wallet_id_idx on public.credit_ledger (wallet_id);
create index if not exists credit_ledger_type_idx on public.credit_ledger (type);
create index if not exists credit_ledger_created_at_idx on public.credit_ledger (created_at desc);

-- Guarantees that an account receives the automated welcome bonus at most once.
create unique index if not exists credit_ledger_one_welcome_bonus_per_user_idx
  on public.credit_ledger (user_id)
  where type = 'welcome_bonus';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  wallet_id_for_user uuid;
  welcome_ledger_id uuid;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing
  returning id into wallet_id_for_user;

  if wallet_id_for_user is null then
    select id into wallet_id_for_user
    from public.wallets
    where user_id = new.id;
  end if;

  insert into public.credit_ledger (user_id, wallet_id, amount, type, reason)
  values (new.id, wallet_id_for_user, 5, 'welcome_bonus', 'New user welcome bonus')
  on conflict (user_id) where type = 'welcome_bonus' do nothing
  returning id into welcome_ledger_id;

  if welcome_ledger_id is not null then
    update public.wallets
    set balance = balance + 5
    where id = wallet_id_for_user;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read their own wallet" on public.wallets;
create policy "Users can read their own wallet"
on public.wallets for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own credit history" on public.credit_ledger;
create policy "Users can read their own credit history"
on public.credit_ledger for select
to authenticated
using (auth.uid() = user_id);

-- Users can only edit profile completion fields. Wallets and ledger remain server-managed.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, full_name_ar, phone, avatar_url) on public.profiles to authenticated;

revoke insert, update, delete on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;

revoke insert, update, delete on public.credit_ledger from anon, authenticated;
grant select on public.credit_ledger to authenticated;

-- These functions are internal trigger functions, not public RPC endpoints.
revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
