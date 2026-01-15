-- Migration: Add AI extraction fields
-- Run this in Supabase SQL Editor

-- Drop the view first (it depends on the table)
DROP VIEW IF EXISTS jobs_with_calculations;

-- Add new columns for AI-extracted data
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tldr text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills_requirements text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_info text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruitment_process text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_range text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS key_skills text[];  -- Array of skills
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS red_flags text;

-- Recreate the view with all columns
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

-- Add comment for documentation
COMMENT ON COLUMN jobs.tldr IS 'AI-generated executive summary of the role';
COMMENT ON COLUMN jobs.responsibilities IS 'Main job responsibilities (bullet points)';
COMMENT ON COLUMN jobs.skills_requirements IS 'Required and nice-to-have skills';
COMMENT ON COLUMN jobs.company_info IS 'Company description, mission, culture';
COMMENT ON COLUMN jobs.recruitment_process IS 'Interview process steps';
COMMENT ON COLUMN jobs.salary_range IS 'Compensation range if mentioned';
COMMENT ON COLUMN jobs.experience_level IS 'junior/mid/senior/staff/lead';
COMMENT ON COLUMN jobs.key_skills IS 'Top technical skills mentioned';
COMMENT ON COLUMN jobs.red_flags IS 'Any concerning signals about the role';
