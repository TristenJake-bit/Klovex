-- Add representation field to transactions
-- This indicates which side the TC/agent represents: buyer, seller, or dual (both)
-- Separate from transaction_type which describes what the deal is (purchase/sale)

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS representation text DEFAULT 'dual';

-- Backfill: if transaction_type is 'sale', assume seller representation
-- if 'purchase', assume buyer representation
-- This is a safe default that can be corrected per-transaction
UPDATE transactions SET representation = 'seller' WHERE transaction_type = 'sale' AND representation = 'dual';
UPDATE transactions SET representation = 'buyer' WHERE transaction_type = 'purchase' AND representation = 'dual';

-- Add side column to transaction_checklists so existing saved tasks
-- know which side they belong to (for display filtering without regeneration)
ALTER TABLE transaction_checklists ADD COLUMN IF NOT EXISTS side text DEFAULT 'both';
