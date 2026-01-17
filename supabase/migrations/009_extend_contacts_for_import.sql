-- Extend contacts table for contact funnel import
-- Adds interaction type tracking and additional contact methods

-- Contact type enum for tracking interaction methods
ALTER TABLE contacts
  ADD COLUMN last_contact_type TEXT,
  ADD COLUMN next_contact_type TEXT,
  ADD COLUMN source TEXT,
  ADD COLUMN skype TEXT,
  ADD COLUMN office_address TEXT,
  ADD COLUMN angelist_url TEXT;

-- Add index for source filtering
CREATE INDEX idx_contacts_source ON contacts(source) WHERE source IS NOT NULL;
