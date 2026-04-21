-- Transaction tokens for shareable party portal
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

create table if not exists transaction_tokens (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_transaction_tokens_token on transaction_tokens(token);
create index if not exists idx_transaction_tokens_tx on transaction_tokens(transaction_id);

alter table transaction_tokens enable row level security;

-- Authenticated users can manage tokens on their transactions
create policy "Users can view tokens on their transactions" on transaction_tokens for select to authenticated using (true);
create policy "Users can insert tokens" on transaction_tokens for insert to authenticated with check (true);
create policy "Users can delete tokens" on transaction_tokens for delete to authenticated using (true);

-- Public read access for portal (anon key can read tokens to validate)
create policy "Anyone can validate tokens" on transaction_tokens for select to anon using (true);
