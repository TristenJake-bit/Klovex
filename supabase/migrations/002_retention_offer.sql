-- Add retention offer tracking to profiles
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zljtzgeymmfbijcdmdxt/sql

alter table profiles add column if not exists retention_offer_used_at timestamptz default null;
