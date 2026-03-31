-- Transaction Contacts / Parties Manager
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

create table if not exists transaction_contacts (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  role text not null,
  name text not null,
  email text,
  phone text,
  company text,
  created_at timestamptz default now()
);

-- Index for fast lookups by transaction
create index if not exists idx_transaction_contacts_tx on transaction_contacts(transaction_id);

-- RLS: users can manage contacts on their own transactions
alter table transaction_contacts enable row level security;

create policy "Users can view contacts on their transactions"
  on transaction_contacts for select
  using (
    transaction_id in (
      select id from transactions where user_id = auth.uid()
    )
  );

create policy "Users can insert contacts on their transactions"
  on transaction_contacts for insert
  with check (
    transaction_id in (
      select id from transactions where user_id = auth.uid()
    )
  );

create policy "Users can update contacts on their transactions"
  on transaction_contacts for update
  using (
    transaction_id in (
      select id from transactions where user_id = auth.uid()
    )
  );

create policy "Users can delete contacts on their transactions"
  on transaction_contacts for delete
  using (
    transaction_id in (
      select id from transactions where user_id = auth.uid()
    )
  );
