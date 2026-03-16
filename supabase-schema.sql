-- =============================================
-- KLOVEX DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'client' check (role in ('admin', 'client')),
  company text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- TRANSACTIONS
-- =============================================
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  property_address text not null,
  transaction_type text not null check (transaction_type in ('purchase', 'sale', 'refinance')),
  status text not null default 'pending' check (status in (
    'pending', 'contract', 'inspection', 'appraisal', 'loan_approval',
    'clear_to_close', 'closing', 'closed', 'cancelled'
  )),
  closing_date date,
  purchase_price numeric(12,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- DOCUMENTS
-- =============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  file_type text,
  uploaded_by uuid references public.profiles(id) not null,
  category text default 'general' check (category in (
    'contract', 'disclosure', 'inspection', 'appraisal',
    'title', 'loan', 'closing', 'general'
  )),
  created_at timestamptz default now()
);

-- =============================================
-- INVOICES
-- =============================================
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  client_id uuid references public.profiles(id) not null,
  amount_cents integer not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled')),
  stripe_payment_intent text,
  stripe_invoice_url text,
  due_date date,
  paid_at timestamptz,
  description text,
  created_at timestamptz default now()
);

-- =============================================
-- TRANSACTION TIMELINE / NOTES
-- =============================================
create table public.timeline_events (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  author_id uuid references public.profiles(id) not null,
  type text not null default 'note' check (type in ('note', 'status_change', 'document', 'email')),
  content text not null,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.timeline_events enable row level security;

-- Profiles: users see own, admins see all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Transactions: clients see own, admins see all
create policy "Clients see own transactions" on public.transactions
  for select using (
    client_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert transactions" on public.transactions
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update transactions" on public.transactions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Documents: follow transaction access
create policy "Document access follows transaction" on public.documents
  for select using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
      and (t.client_id = auth.uid() or
           exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );

create policy "Authenticated users can upload documents" on public.documents
  for insert with check (auth.uid() = uploaded_by);

-- Invoices: clients see own, admins see all
create policy "Invoice access by client or admin" on public.invoices
  for select using (
    client_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can manage invoices" on public.invoices
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Timeline: follow transaction access
create policy "Timeline access follows transaction" on public.timeline_events
  for select using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
      and (t.client_id = auth.uid() or
           exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );

create policy "Authenticated users can add timeline events" on public.timeline_events
  for insert with check (auth.uid() = author_id);

-- =============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- Run this in Supabase dashboard > Storage
-- =============================================
-- Create a bucket called "documents" with:
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/*, application/msword, 
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document
