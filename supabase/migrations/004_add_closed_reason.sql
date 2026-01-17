-- Add closed_reason to track why opportunities were closed
-- Run this in Supabase SQL Editor

-- Add closed_reason column
ALTER TABLE opportunities
ADD COLUMN closed_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN opportunities.closed_reason IS 'Reason for closing: rejected, withdrew, ghosted, offer_declined, role_cancelled, not_a_fit';

-- Optional: Add check constraint for valid values
ALTER TABLE opportunities
ADD CONSTRAINT valid_closed_reason
CHECK (closed_reason IS NULL OR closed_reason IN (
  'rejected',
  'withdrew',
  'ghosted',
  'offer_declined',
  'role_cancelled',
  'not_a_fit'
));
