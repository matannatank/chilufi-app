-- Run in Supabase SQL Editor after pulling admin feature.

create table if not exists app_admins (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create table if not exists shift_commander_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  shift text not null check (shift in ('a', 'b', 'c')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rejection_reason_required_for_rejected
    check (status != 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0))
);

create unique index if not exists idx_shift_commander_requests_one_pending
  on shift_commander_requests (user_id)
  where status = 'pending';

create index if not exists idx_shift_commander_requests_status
  on shift_commander_requests (status, created_at desc);

alter table app_admins enable row level security;
alter table shift_commander_requests enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_app_admin() to authenticated;

-- Seed initial admins (Matan + Avraham)
insert into app_admins (user_id, created_by)
values
  ('ae6e5442-0bee-4e77-b81e-f295c56acecf', 'ae6e5442-0bee-4e77-b81e-f295c56acecf'),
  ('5240359b-0365-41e4-b147-e08dd11dab87', 'ae6e5442-0bee-4e77-b81e-f295c56acecf')
on conflict (user_id) do nothing;

-- app_admins policies
create policy "Admins can read app_admins"
on app_admins for select
using (public.is_app_admin());

create policy "Admins can insert app_admins"
on app_admins for insert
with check (public.is_app_admin());

create policy "Admins can delete app_admins"
on app_admins for delete
using (public.is_app_admin());

-- shift_commander_requests policies
create policy "Users and admins can read shift commander requests"
on shift_commander_requests for select
using (auth.uid() = user_id or public.is_app_admin());

create policy "Users can create own pending shift commander request"
on shift_commander_requests for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
);

create policy "Admins can update shift commander requests"
on shift_commander_requests for update
using (public.is_app_admin());

-- profiles: block self-promotion to shift_commander
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id and role <> 'shift_commander');

create policy "Users can update own profile without commander self-promotion"
on profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and (
    role <> 'shift_commander'
    or exists (
      select 1 from profiles as existing_profile
      where existing_profile.id = auth.uid()
        and existing_profile.role = 'shift_commander'
    )
  )
);

create policy "Admins can update any profile"
on profiles for update
using (public.is_app_admin())
with check (public.is_app_admin());

create trigger update_shift_commander_requests_updated_at
before update on shift_commander_requests
for each row execute function update_updated_at_column();
