-- Enable RLS on all tables and add authenticated-user policies
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

-- PROFILES
alter table profiles enable row level security;
create policy "Authenticated users can select profiles" on profiles for select to authenticated using (true);
create policy "Authenticated users can insert profiles" on profiles for insert to authenticated with check (true);
create policy "Authenticated users can update profiles" on profiles for update to authenticated using (true);
create policy "Authenticated users can delete profiles" on profiles for delete to authenticated using (true);

-- TRANSACTIONS
alter table transactions enable row level security;
create policy "Authenticated users can select transactions" on transactions for select to authenticated using (true);
create policy "Authenticated users can insert transactions" on transactions for insert to authenticated with check (true);
create policy "Authenticated users can update transactions" on transactions for update to authenticated using (true);
create policy "Authenticated users can delete transactions" on transactions for delete to authenticated using (true);

-- DOCUMENTS
alter table documents enable row level security;
create policy "Authenticated users can select documents" on documents for select to authenticated using (true);
create policy "Authenticated users can insert documents" on documents for insert to authenticated with check (true);
create policy "Authenticated users can update documents" on documents for update to authenticated using (true);
create policy "Authenticated users can delete documents" on documents for delete to authenticated using (true);

-- DOCUMENT_ANALYSES
alter table document_analyses enable row level security;
create policy "Authenticated users can select document_analyses" on document_analyses for select to authenticated using (true);
create policy "Authenticated users can insert document_analyses" on document_analyses for insert to authenticated with check (true);
create policy "Authenticated users can update document_analyses" on document_analyses for update to authenticated using (true);
create policy "Authenticated users can delete document_analyses" on document_analyses for delete to authenticated using (true);

-- TRANSACTION_CHECKLISTS
alter table transaction_checklists enable row level security;
create policy "Authenticated users can select transaction_checklists" on transaction_checklists for select to authenticated using (true);
create policy "Authenticated users can insert transaction_checklists" on transaction_checklists for insert to authenticated with check (true);
create policy "Authenticated users can update transaction_checklists" on transaction_checklists for update to authenticated using (true);
create policy "Authenticated users can delete transaction_checklists" on transaction_checklists for delete to authenticated using (true);

-- TIMELINE_EVENTS
alter table timeline_events enable row level security;
create policy "Authenticated users can select timeline_events" on timeline_events for select to authenticated using (true);
create policy "Authenticated users can insert timeline_events" on timeline_events for insert to authenticated with check (true);
create policy "Authenticated users can update timeline_events" on timeline_events for update to authenticated using (true);
create policy "Authenticated users can delete timeline_events" on timeline_events for delete to authenticated using (true);

-- TRANSACTION_CONTACTS (already has RLS from migration 001, but ensure it's enabled)
alter table transaction_contacts enable row level security;
-- Skip creating policies if they already exist from 001 — these will no-op if duplicates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_contacts' AND policyname = 'Authenticated users can select transaction_contacts') THEN
    CREATE POLICY "Authenticated users can select transaction_contacts" ON transaction_contacts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_contacts' AND policyname = 'Authenticated users can insert transaction_contacts') THEN
    CREATE POLICY "Authenticated users can insert transaction_contacts" ON transaction_contacts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_contacts' AND policyname = 'Authenticated users can update transaction_contacts') THEN
    CREATE POLICY "Authenticated users can update transaction_contacts" ON transaction_contacts FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_contacts' AND policyname = 'Authenticated users can delete transaction_contacts') THEN
    CREATE POLICY "Authenticated users can delete transaction_contacts" ON transaction_contacts FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- CLIENTS
alter table clients enable row level security;
create policy "Authenticated users can select clients" on clients for select to authenticated using (true);
create policy "Authenticated users can insert clients" on clients for insert to authenticated with check (true);
create policy "Authenticated users can update clients" on clients for update to authenticated using (true);
create policy "Authenticated users can delete clients" on clients for delete to authenticated using (true);
