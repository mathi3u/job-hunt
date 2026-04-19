-- ============================================================================
-- Job Tracker Database Setup
-- ============================================================================
-- This consolidated schema file creates the entire database in a single pass.
-- It combines schema_v2.sql and all migrations (001-011) into one idempotent
-- file suitable for running on a fresh Supabase project.
--
-- To use: Copy this file contents into Supabase SQL Editor and run.
-- Uses CREATE TABLE IF NOT EXISTS to be safe for re-runs.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- PostgreSQL does not support CREATE TYPE IF NOT EXISTS — use DO blocks.
-- ============================================================================

DO $$ BEGIN CREATE TYPE interview_stage AS ENUM (
  'applied','screening','phone_interview','technical','onsite',
  'final_round','reference_check','offer','negotiation'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE process_outcome AS ENUM (
  'in_progress','advanced','offer_extended','offer_accepted','offer_declined',
  'rejected','withdrawn','ghosted','on_hold'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE interview_type AS ENUM (
  'recruiter_screen','hiring_manager','technical','behavioral','system_design',
  'case_study','panel','presentation','culture_fit','executive'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE comm_type AS ENUM (
  'email_sent','email_received','call','linkedin_message','referral_intro','follow_up'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE opportunity_source AS ENUM (
  'job_board','company_website','referral','recruiter_outreach','networking','career_fair','cold_outreach'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE opportunity_status AS ENUM (
  'identified','researching','preparing','applied','interviewing',
  'offer','closed_won','closed_lost','on_hold'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  website TEXT,
  linkedin_url TEXT,
  industry TEXT,
  company_size TEXT,          -- e.g., "50-200", "1000+"
  funding_stage TEXT,         -- e.g., "Series B", "Public"
  headquarters TEXT,

  -- AI-extracted info
  description TEXT,
  culture_notes TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts (people at companies)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,

  relationship TEXT,          -- e.g., "recruiter", "hiring manager", "referral"
  notes TEXT,

  -- Contact bank extensions (migration 008)
  last_contacted_at TIMESTAMPTZ,
  next_followup_date DATE,
  warmth INTEGER CHECK (warmth >= 1 AND warmth <= 5),

  -- Contact import extensions (migration 009)
  last_contact_type TEXT,
  next_contact_type TEXT,
  source TEXT,
  skype TEXT,
  office_address TEXT,
  angelist_url TEXT,

  -- Contact referral linking (migration 010)
  referred_by_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Opportunities (the atomic pipeline unit)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Basic info
  title TEXT,                 -- Role you're pursuing (may differ from posting)
  status opportunity_status NOT NULL DEFAULT 'identified',
  source opportunity_source,
  source_detail TEXT,         -- e.g., "LinkedIn", "John's referral"

  -- Priority/fit
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),  -- 1=highest
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 10),
  fit_notes TEXT,

  -- Key dates
  identified_date DATE DEFAULT CURRENT_DATE,
  target_apply_date DATE,

  -- Documents
  resume_url TEXT,
  cover_letter_url TEXT,
  working_doc_url TEXT,

  notes TEXT,

  -- Closure tracking (migration 004, 006)
  closed_reason TEXT,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint for valid closed_reason (migration 004)
  CONSTRAINT valid_closed_reason
    CHECK (closed_reason IS NULL OR closed_reason IN (
      'rejected',
      'withdrew',
      'ghosted',
      'offer_declined',
      'role_cancelled',
      'not_a_fit'
    ))
);

-- Job Postings (linked to opportunities)
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Basic info
  role TEXT NOT NULL,
  url TEXT,
  portal TEXT,                -- LinkedIn, Greenhouse, etc.

  -- Dates
  posted_date DATE,
  deadline_date DATE,
  captured_at TIMESTAMPTZ DEFAULT now(),

  -- AI-extracted structured data
  tldr TEXT,
  responsibilities TEXT,
  skills_requirements TEXT,
  recruitment_process TEXT,
  salary_range TEXT,
  experience_level TEXT,
  key_skills TEXT[],
  red_flags TEXT,

  -- Location
  location TEXT,
  remote_policy TEXT,         -- remote/hybrid/onsite

  -- Raw content
  job_content TEXT,

  -- Direct company URL (migration 007)
  company_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interview Process (connects opportunity to interviews)
CREATE TABLE IF NOT EXISTS interview_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,

  stage interview_stage NOT NULL DEFAULT 'applied',
  outcome process_outcome NOT NULL DEFAULT 'in_progress',

  -- Key dates
  started_at DATE DEFAULT CURRENT_DATE,
  ended_at DATE,

  -- Expected process
  expected_stages TEXT,       -- e.g., "Phone → Technical → Onsite → Offer"
  expected_timeline TEXT,     -- e.g., "2-3 weeks"

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES interview_processes(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,              -- "Zoom", "Phone", "123 Main St"
  calendar_link TEXT,

  -- Interview details
  interview_type interview_type,
  round INTEGER,              -- 1, 2, 3...

  -- Preparation
  prep_notes TEXT,
  questions_to_ask TEXT,
  topics_to_review TEXT,

  -- Post-interview
  completed BOOLEAN DEFAULT false,
  went_well BOOLEAN,
  feedback TEXT,
  follow_up_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,

  comm_type comm_type NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT now(),

  subject TEXT,
  content TEXT,

  -- For follow-ups
  requires_response BOOLEAN DEFAULT false,
  response_due_date DATE,
  responded BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents - CV Bank (migration 003)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  doc_type TEXT DEFAULT 'cv',
  is_default BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',  -- migration 005
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint for valid language (migration 005)
  CONSTRAINT valid_language
    CHECK (language IN ('en', 'fr'))
);

-- Job Portals (migration 011)
-- Job portals/sources that can be monitored
CREATE TABLE IF NOT EXISTS job_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g., "LinkedIn", "Indeed", "Glassdoor"
  base_url TEXT NOT NULL,                -- e.g., "https://www.linkedin.com"
  search_url_template TEXT,              -- URL template with placeholders like {keywords}, {location}
  portal_type TEXT NOT NULL DEFAULT 'job_board',  -- 'job_board', 'company_careers', 'aggregator'
  requires_auth BOOLEAN DEFAULT false,   -- Whether login is required
  supports_rss BOOLEAN DEFAULT false,    -- Whether RSS feeds are available
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved Job Searches (migration 011)
-- Saved job searches to monitor
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- User-friendly name for this search

  -- Search criteria
  keywords TEXT[],                       -- Keywords to search for
  excluded_keywords TEXT[],              -- Keywords to exclude
  job_titles TEXT[],                     -- Specific job titles
  companies TEXT[],                      -- Specific companies to monitor
  locations TEXT[],                      -- Locations to search
  remote_only BOOLEAN DEFAULT false,
  experience_levels TEXT[],              -- e.g., 'entry', 'mid', 'senior', 'lead'

  -- Monitoring settings
  portal_id UUID REFERENCES job_portals(id) ON DELETE SET NULL,
  custom_url TEXT,                       -- Direct URL to monitor (overrides portal template)
  check_frequency_hours INTEGER DEFAULT 24,  -- How often to check
  last_checked_at TIMESTAMPTZ,
  last_check_status TEXT,                -- 'success', 'failed', 'pending'
  last_check_error TEXT,

  -- Results tracking
  total_results_found INTEGER DEFAULT 0,
  new_results_last_check INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Search Results (migration 011)
-- Track individual results from searches (for deduplication and history)
CREATE TABLE IF NOT EXISTS search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,

  -- Result data (before becoming an opportunity)
  external_id TEXT,                      -- ID from the source portal
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  salary_range TEXT,
  posted_date TIMESTAMPTZ,

  -- Raw data
  raw_data JSONB,                        -- Full extracted data

  -- Status
  status TEXT DEFAULT 'new',             -- 'new', 'reviewed', 'added', 'dismissed'
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,  -- If converted to opportunity

  -- Tracking
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicates per search
  UNIQUE(search_id, url)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_next_followup ON contacts(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_referred_by ON contacts(referred_by_id) WHERE referred_by_id IS NOT NULL;

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at DESC);

-- Job Postings
CREATE INDEX IF NOT EXISTS idx_postings_opportunity ON job_postings(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_postings_company ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_postings_posted ON job_postings(posted_date DESC);

-- Interview Processes
CREATE INDEX IF NOT EXISTS idx_processes_opportunity ON interview_processes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_processes_stage ON interview_processes(stage);
CREATE INDEX IF NOT EXISTS idx_processes_outcome ON interview_processes(outcome);

-- Interviews
CREATE INDEX IF NOT EXISTS idx_interviews_process ON interviews(process_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_contact ON interviews(contact_id);

-- Communications
CREATE INDEX IF NOT EXISTS idx_comms_opportunity ON communications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_comms_contact ON communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_comms_date ON communications(occurred_at DESC);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_default ON documents(is_default) WHERE is_default = true;

-- Job Search Tracking
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_checked ON saved_searches(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_status ON search_results(status);
CREATE INDEX IF NOT EXISTS idx_search_results_first_seen ON search_results(first_seen_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS job_postings_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS interview_processes_updated_at BEFORE UPDATE ON interview_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS communications_updated_at BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Documents updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Job search tracking updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_job_portals_updated_at
  BEFORE UPDATE ON job_portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_search_results_updated_at
  BEFORE UPDATE ON search_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Pipeline overview
CREATE OR REPLACE VIEW pipeline_overview
WITH (security_invoker = true) AS
SELECT
  o.id AS opportunity_id,
  o.title,
  o.status,
  o.priority,
  o.source,
  c.name AS company_name,
  c.industry,
  jp.role AS posting_role,
  jp.posted_date,
  jp.salary_range,
  jp.location,
  o.target_apply_date,
  ip.stage AS interview_stage,
  ip.outcome AS interview_outcome,
  (SELECT COUNT(*) FROM interviews i WHERE i.process_id = ip.id) AS interview_count,
  (SELECT MAX(scheduled_at) FROM interviews i WHERE i.process_id = ip.id) AS next_interview,
  (SELECT COUNT(*) FROM communications cm WHERE cm.opportunity_id = o.id) AS comm_count,
  o.created_at,
  o.updated_at
FROM opportunities o
LEFT JOIN companies c ON o.company_id = c.id
LEFT JOIN job_postings jp ON jp.opportunity_id = o.id
LEFT JOIN interview_processes ip ON ip.opportunity_id = o.id
ORDER BY o.priority ASC, o.updated_at DESC;

-- Upcoming interviews
CREATE OR REPLACE VIEW upcoming_interviews
WITH (security_invoker = true) AS
SELECT
  i.id AS interview_id,
  i.scheduled_at,
  i.interview_type,
  i.duration_minutes,
  i.location,
  i.prep_notes,
  c.name AS interviewer_name,
  c.role AS interviewer_role,
  co.name AS company_name,
  o.title AS opportunity_title,
  ip.stage
FROM interviews i
JOIN interview_processes ip ON i.process_id = ip.id
JOIN opportunities o ON ip.opportunity_id = o.id
LEFT JOIN companies co ON o.company_id = co.id
LEFT JOIN contacts c ON i.contact_id = c.id
WHERE i.scheduled_at >= NOW()
  AND i.completed = false
ORDER BY i.scheduled_at ASC;

-- Follow-ups needed
CREATE OR REPLACE VIEW follow_ups_needed
WITH (security_invoker = true) AS
SELECT
  cm.id AS comm_id,
  cm.comm_type,
  cm.subject,
  cm.response_due_date,
  c.name AS contact_name,
  co.name AS company_name,
  o.title AS opportunity_title
FROM communications cm
JOIN opportunities o ON cm.opportunity_id = o.id
LEFT JOIN contacts c ON cm.contact_id = c.id
LEFT JOIN companies co ON o.company_id = co.id
WHERE cm.requires_response = true
  AND cm.responded = false
ORDER BY cm.response_due_date ASC NULLS LAST;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (add auth policies later)
-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS — use DO blocks.
DO $$ BEGIN CREATE POLICY "Allow all" ON companies FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON contacts FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON opportunities FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON job_postings FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON interview_processes FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON interviews FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON communications FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all operations on documents" ON documents FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON job_portals FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON saved_searches FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow all" ON search_results FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- INITIAL DATA SEED (Job Portals)
-- ============================================================================

-- Insert common job portals (if not already present)
INSERT INTO job_portals (name, base_url, search_url_template, portal_type, supports_rss) VALUES
  ('LinkedIn', 'https://www.linkedin.com', 'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}', 'job_board', false),
  ('Indeed', 'https://www.indeed.com', 'https://www.indeed.com/jobs?q={keywords}&l={location}', 'job_board', true),
  ('Glassdoor', 'https://www.glassdoor.com', 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword={keywords}&locT=C&locId={location}', 'job_board', false),
  ('AngelList/Wellfound', 'https://wellfound.com', 'https://wellfound.com/jobs?query={keywords}', 'job_board', false),
  ('Y Combinator', 'https://www.workatastartup.com', 'https://www.workatastartup.com/jobs?query={keywords}', 'job_board', false),
  ('Hacker News', 'https://news.ycombinator.com', 'https://hn.algolia.com/?query={keywords}&type=story&tags=story,ask_hn', 'aggregator', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA SETUP
-- ============================================================================
