-- Run in Supabase SQL editor (or migrate) once before using web push.

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
