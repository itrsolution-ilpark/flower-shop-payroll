create table if not exists system_admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_code text not null,
  created_at timestamptz not null default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists shop_admins (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references shops(id) on delete cascade,
  name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  pin_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'resigned')),
  created_at timestamptz not null default now(),
  resigned_at timestamptz,
  unique (shop_id, name)
);

create table if not exists compensation (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  pay_type text not null check (pay_type in ('hourly', 'monthly')),
  amount_krw integer not null check (amount_krw > 0),
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (staff_id, effective_from)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  clock_in time not null,
  clock_out time not null,
  total_minutes integer not null check (total_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date),
  check (clock_out > clock_in)
);

create table if not exists auth_attempts (
  id uuid primary key default gen_random_uuid(),
  identity_hash text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

alter table system_admins enable row level security;
alter table shops enable row level security;
alter table shop_admins enable row level security;
alter table staff enable row level security;
alter table compensation enable row level security;
alter table attendance enable row level security;
alter table auth_attempts enable row level security;

drop policy if exists "Deny direct access system_admins" on system_admins;
create policy "Deny direct access system_admins" on system_admins for all using (false);

drop policy if exists "Deny direct access shops" on shops;
create policy "Deny direct access shops" on shops for all using (false);

drop policy if exists "Deny direct access shop_admins" on shop_admins;
create policy "Deny direct access shop_admins" on shop_admins for all using (false);

drop policy if exists "Deny direct access staff" on staff;
create policy "Deny direct access staff" on staff for all using (false);

drop policy if exists "Deny direct access compensation" on compensation;
create policy "Deny direct access compensation" on compensation for all using (false);

drop policy if exists "Deny direct access attendance" on attendance;
create policy "Deny direct access attendance" on attendance for all using (false);

drop policy if exists "Deny direct access auth_attempts" on auth_attempts;
create policy "Deny direct access auth_attempts" on auth_attempts for all using (false);
