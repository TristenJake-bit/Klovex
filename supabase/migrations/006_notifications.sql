-- In-app notifications
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  transaction_id uuid references transactions(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on notifications(user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can view their notifications" on notifications for select to authenticated using (user_id = auth.uid());
create policy "Users can update their notifications" on notifications for update to authenticated using (user_id = auth.uid());
create policy "Authenticated can insert notifications" on notifications for insert to authenticated with check (true);
-- Service role can insert (for cron jobs)
create policy "Service can insert notifications" on notifications for insert to anon with check (true);
