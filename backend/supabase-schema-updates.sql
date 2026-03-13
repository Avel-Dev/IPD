-- User settings table for storing the surplus limit
create table if not exists public.user_settings (
  wallet_address text primary key,
  surplus_limit float8,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Diversion logs table
create table if not exists public.diversion_logs (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  amount float8 not null,
  timestamp bigint not null,
  created_at timestamptz default now()
);

-- Houses table
create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  house_id text unique not null,
  owner_wallet text not null,
  meter_id text,
  created_at timestamptz default now()
);

-- Energy reports table
create table if not exists public.energy_reports (
  id uuid primary key default gen_random_uuid(),
  house_id text not null references public.houses(house_id),
  energy_produced float8 not null,
  energy_consumed float8 not null,
  surplus_energy float8 not null,
  timestamp bigint not null,
  created_at timestamptz default now()
);