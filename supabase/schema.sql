create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text not null,
  role text not null check (role in ('officer', 'team_commander', 'shift_commander', 'fighter')),
  shift text check (shift in ('a', 'b', 'c')),
  has_hazmat boolean not null default false,
  has_license boolean not null default false,
  has_crane boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table swap_offers (
  id uuid primary key default uuid_generate_v4(),
  poster_id uuid not null references profiles(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null check (location in ('petah_tikva', 'rosh_haayin', 'elad')),
  notes text,
  status text not null default 'open' check (status in ('open', 'pending_approval', 'matched', 'cancelled')),
  chosen_applicant_id uuid references profiles(id),
  target_shift text check (target_shift is null or target_shift in ('a', 'b', 'c')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (shift_date >= current_date)
);

create table applications (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references swap_offers(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'chosen', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (offer_id, applicant_id)
);

create table commander_approvals (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references swap_offers(id) on delete cascade,
  commander_id uuid not null references profiles(id) on delete cascade,
  shift text not null check (shift in ('a', 'b', 'c')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, commander_id),
  constraint rejection_reason_required
    check (status != 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0))
);

create index idx_offers_status on swap_offers(status);
create index idx_offers_date on swap_offers(shift_date);
create index idx_applications_offer on applications(offer_id);
create index idx_commander_approvals_offer on commander_approvals(offer_id);
create index idx_commander_approvals_commander on commander_approvals(commander_id, status);

create table app_admins (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create table shift_commander_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  shift text not null check (shift in ('a', 'b', 'c')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_commander_requests_rejection_reason_required
    check (status != 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0))
);

create unique index idx_shift_commander_requests_one_pending
  on shift_commander_requests (user_id)
  where status = 'pending';

create index idx_shift_commander_requests_status
  on shift_commander_requests (status, created_at desc);

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

alter table profiles enable row level security;
alter table swap_offers enable row level security;
alter table applications enable row level security;
alter table commander_approvals enable row level security;
alter table app_admins enable row level security;
alter table shift_commander_requests enable row level security;

create policy "Anyone authenticated can read profiles"
on profiles for select
using (auth.role() = 'authenticated');

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

create policy "Anyone authenticated can read offers"
on swap_offers for select
using (auth.role() = 'authenticated');

create policy "Users can create their own offers"
on swap_offers for insert
with check (auth.uid() = poster_id);

create policy "Posters can update their own offers"
on swap_offers for update
using (auth.uid() = poster_id);

create policy "Anyone authenticated can read applications"
on applications for select
using (auth.role() = 'authenticated');

create policy "Users can apply for offers"
on applications for insert
with check (auth.uid() = applicant_id);

create policy "Users can update their own applications"
on applications for update
using (auth.uid() = applicant_id);

create policy "Posters can update applications on their offers"
on applications for update
using (auth.uid() = (select poster_id from swap_offers where id = offer_id));

create policy "Authenticated users can read commander_approvals"
on commander_approvals for select
using (auth.role() = 'authenticated');

create policy "Commanders can update their own approval"
on commander_approvals for update
using (auth.uid() = commander_id);

create policy "Posters can insert commander approvals for own offers"
on commander_approvals for insert
with check (
  auth.uid() = (select poster_id from swap_offers where id = offer_id)
);

create policy "Posters can delete commander approvals for own offers"
on commander_approvals for delete
using (
  auth.uid() = (select poster_id from swap_offers where id = offer_id)
);

create policy "Commanders can delete approvals on offers they command"
on commander_approvals for delete
using (
  exists (
    select 1
    from commander_approvals as commander_offer_approvals
    where commander_offer_approvals.offer_id = commander_approvals.offer_id
      and commander_offer_approvals.commander_id = auth.uid()
  )
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
before update on profiles
for each row execute function update_updated_at_column();

create trigger update_offers_updated_at
before update on swap_offers
for each row execute function update_updated_at_column();

create trigger update_commander_approvals_updated_at
before update on commander_approvals
for each row execute function update_updated_at_column();

create trigger update_shift_commander_requests_updated_at
before update on shift_commander_requests
for each row execute function update_updated_at_column();

create policy "Admins can read app_admins"
on app_admins for select
using (public.is_app_admin());

create policy "Admins can insert app_admins"
on app_admins for insert
with check (public.is_app_admin());

create policy "Admins can delete app_admins"
on app_admins for delete
using (public.is_app_admin());

create policy "Users and admins can read shift commander requests"
on shift_commander_requests for select
using (auth.uid() = user_id or public.is_app_admin());

create policy "Users can create own pending shift commander request"
on shift_commander_requests for insert
with check (auth.uid() = user_id and status = 'pending');

create policy "Admins can update shift commander requests"
on shift_commander_requests for update
using (public.is_app_admin());

-- Web Push subscriptions (see also push_subscriptions.sql for RLS-only migration on existing DBs)
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "Users can insert own push subscriptions"
on push_subscriptions for insert
with check (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
on push_subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
on push_subscriptions for delete
using (auth.uid() = user_id);

create policy "Users can select own push subscriptions"
on push_subscriptions for select
using (auth.uid() = user_id);
