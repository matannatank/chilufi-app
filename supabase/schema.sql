create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text not null,
  role text not null check (role in ('officer', 'team_commander', 'fighter')),
  has_hazmat boolean not null default false,
  has_license boolean not null default false,
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
  status text not null default 'open' check (status in ('open', 'matched', 'cancelled')),
  chosen_applicant_id uuid references profiles(id),
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

create index idx_offers_status on swap_offers(status);
create index idx_offers_date on swap_offers(shift_date);
create index idx_applications_offer on applications(offer_id);

alter table profiles enable row level security;
alter table swap_offers enable row level security;
alter table applications enable row level security;

create policy "Anyone authenticated can read profiles"
on profiles for select
using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);

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
