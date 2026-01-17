-- Add referral linking between contacts
-- Allows building a relationship graph of who introduced whom

ALTER TABLE contacts
  ADD COLUMN referred_by_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Index for finding referrals
CREATE INDEX idx_contacts_referred_by ON contacts(referred_by_id) WHERE referred_by_id IS NOT NULL;
