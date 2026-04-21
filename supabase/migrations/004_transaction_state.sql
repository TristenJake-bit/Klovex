-- Add state column to transactions for state-specific compliance checklists
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

alter table transactions add column if not exists state text default 'CA';
