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

