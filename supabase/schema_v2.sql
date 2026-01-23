-- Job Tracker Database Schema v2
-- Normalized relational model for job search pipeline
-- Run this in Supabase SQL Editor

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Interview process stages
CREATE TYPE interview_stage AS ENUM (
  'applied',
  'screening',
  'phone_interview',
  'technical',
  'onsite',
  'final_round',
  'reference_check',
  'offer',
  'negotiation'
);

-- Interview process outcomes
CREATE TYPE process_outcome AS ENUM (
  'in_progress',
  'advanced',
  'offer_extended',
  'offer_accepted',
  'offer_declined',
  'rejected',
  'withdrawn',
  'ghosted',
  'on_hold'
);

-- Individual interview types
CREATE TYPE interview_type AS ENUM (
  'recruiter_screen',
  'hiring_manager',
  'technical',
  'behavioral',
  'system_design',
  'case_study',
  'panel',
  'presentation',
  'culture_fit',
  'executive'
);

-- Communication types
CREATE TYPE comm_type AS ENUM (
  'email_sent',
  'email_received',
  'call',
  'linkedin_message',
  'referral_intro',
  'follow_up'
);

-- Opportunity source
CREATE TYPE opportunity_source AS ENUM (
  'job_board',
  'company_website',
  'referral',
  'recruiter_outreach',
  'networking',
  'career_fair',
  'cold_outreach'
);

-- Opportunity status (pipeline stage)
CREATE TYPE opportunity_status AS ENUM (
  'identified',        -- Just found/saved
  'researching',       -- Learning about company/role
  'preparing',         -- Preparing application
  'applied',           -- Application submitted
  'interviewing',      -- In interview process
  'offer',             -- Have an offer
  'closed_won',        -- Accepted offer
  'closed_lost',       -- Rejected/withdrew
  'on_hold'            -- Paused
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Companies
CREATE TABLE companies (
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
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,

  relationship TEXT,          -- e.g., "recruiter", "hiring manager", "referral"
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Opportunities (the atomic pipeline unit)
CREATE TABLE opportunities (
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

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Postings (linked to opportunities)
CREATE TABLE job_postings (
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

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interview Process (connects opportunity to interviews)
CREATE TABLE interview_processes (
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
CREATE TABLE interviews (
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
CREATE TABLE communications (
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

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Companies
CREATE INDEX idx_companies_name ON companies(name);

-- Contacts
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_name ON contacts(name);

-- Opportunities
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_priority ON opportunities(priority);
CREATE INDEX idx_opportunities_created ON opportunities(created_at DESC);

-- Job Postings
CREATE INDEX idx_postings_opportunity ON job_postings(opportunity_id);
CREATE INDEX idx_postings_company ON job_postings(company_id);
CREATE INDEX idx_postings_posted ON job_postings(posted_date DESC);

-- Interview Processes
CREATE INDEX idx_processes_opportunity ON interview_processes(opportunity_id);
CREATE INDEX idx_processes_stage ON interview_processes(stage);
CREATE INDEX idx_processes_outcome ON interview_processes(outcome);

-- Interviews
CREATE INDEX idx_interviews_process ON interviews(process_id);
CREATE INDEX idx_interviews_scheduled ON interviews(scheduled_at);
CREATE INDEX idx_interviews_contact ON interviews(contact_id);

-- Communications
CREATE INDEX idx_comms_opportunity ON communications(opportunity_id);
CREATE INDEX idx_comms_contact ON communications(contact_id);
CREATE INDEX idx_comms_date ON communications(occurred_at DESC);

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

-- For now, allow all operations (add auth policies later)
CREATE POLICY "Allow all" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all" ON opportunities FOR ALL USING (true);
CREATE POLICY "Allow all" ON job_postings FOR ALL USING (true);
CREATE POLICY "Allow all" ON interview_processes FOR ALL USING (true);
CREATE POLICY "Allow all" ON interviews FOR ALL USING (true);
CREATE POLICY "Allow all" ON communications FOR ALL USING (true);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Pipeline overview
CREATE VIEW pipeline_overview
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
CREATE VIEW upcoming_interviews
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
CREATE VIEW follow_ups_needed
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
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER job_postings_updated_at BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interview_processes_updated_at BEFORE UPDATE ON interview_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER communications_updated_at BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
