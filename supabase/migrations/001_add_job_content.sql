-- Migration: Add job_content column for offline capture
-- Run this in Supabase SQL Editor if you already have the jobs table

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_content text;

-- Update the view to include the new column
CREATE OR REPLACE VIEW jobs_with_calculations AS
SELECT
  *,
  CASE WHEN last_contact IS NOT NULL
    THEN current_date - last_contact
    ELSE NULL
  END AS days_since_last_contact,
  CASE WHEN date_posted IS NOT NULL
    THEN current_date - date_posted
    ELSE NULL
  END AS days_since_posted
FROM jobs;
