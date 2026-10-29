create table if not exists system_admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_code text not null,
  created_at timestamp with time zone default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  pin_code text not null,
  hourly_wage integer not null default 10000,
  is_admin boolean not null default false,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  clock_in time without time zone not null,
  clock_out time without time zone,
  created_at timestamp with time zone default now()
);

alter table system_admins enable row level security;
alter table shops enable row level security;
alter table staff enable row level security;
alter table attendance enable row level security;

drop policy if exists "Allow select system_admins for all" on system_admins;
create policy "Allow select system_admins for all" on system_admins
  for select using (true);

drop policy if exists "Allow insert system_admins for all" on system_admins;
create policy "Allow insert system_admins for all" on system_admins
  for insert with check (true);

drop policy if exists "Allow select shops for all" on shops;
create policy "Allow select shops for all" on shops
  for select using (true);

drop policy if exists "Allow insert shops for all" on shops;
create policy "Allow insert shops for all" on shops
  for insert with check (true);

drop policy if exists "Allow update shops for all" on shops;
create policy "Allow update shops for all" on shops
  for update using (true) with check (true);

drop policy if exists "Allow select staff for all" on staff;
create policy "Allow select staff for all" on staff
  for select using (true);

drop policy if exists "Allow insert staff for all" on staff;
create policy "Allow insert staff for all" on staff
  for insert with check (true);

drop policy if exists "Allow update staff for self or admin" on staff;
create policy "Allow update staff for self or admin" on staff
  for update using (true) with check (true);

drop policy if exists "Allow select attendance for all" on attendance;
create policy "Allow select attendance for all" on attendance
  for select using (true);

drop policy if exists "Allow insert attendance for all" on attendance;
create policy "Allow insert attendance for all" on attendance
  for insert with check (true);

drop policy if exists "Allow update attendance for all" on attendance;
create policy "Allow update attendance for all" on attendance
  for update using (true) with check (true);

drop policy if exists "Allow delete attendance for all" on attendance;
create policy "Allow delete attendance for all" on attendance
  for delete using (true);
