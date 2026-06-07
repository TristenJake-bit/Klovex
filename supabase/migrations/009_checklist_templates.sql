-- User-scoped checklist templates
-- Stores a named set of task definitions that can be applied to new transactions
CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own templates
CREATE POLICY "Users can view own checklist templates" ON checklist_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist templates" ON checklist_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist templates" ON checklist_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist templates" ON checklist_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_user_id ON checklist_templates(user_id);

-- Add is_custom flag to transaction_checklists so we can distinguish
-- user-added tasks from default-generated ones
ALTER TABLE transaction_checklists ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;
