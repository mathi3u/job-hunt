-- Cleanup Legacy Schema
-- Run this in Supabase SQL Editor after verifying migration

-- Drop the legacy view first (depends on jobs table)
DROP VIEW IF EXISTS jobs_with_calculations;

-- Drop the legacy jobs table
DROP TABLE IF EXISTS jobs;

-- Remove old schema file reference (optional - just for cleanliness)
-- The old schema.sql can be deleted from the repo after this runs
