-- Extend contacts table for Contact Bank feature
-- Adds fields for tracking relationship warmth and follow-up reminders

ALTER TABLE contacts
  ADD COLUMN last_contacted_at TIMESTAMPTZ,
  ADD COLUMN next_followup_date DATE,
  ADD COLUMN warmth INTEGER CHECK (warmth >= 1 AND warmth <= 5);

-- Add index for follow-up queries
CREATE INDEX idx_contacts_next_followup ON contacts(next_followup_date) WHERE next_followup_date IS NOT NULL;
