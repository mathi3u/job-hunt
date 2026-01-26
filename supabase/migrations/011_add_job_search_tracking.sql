-- Job Search Tracking: Saved searches and portal monitoring
-- This enables automated discovery of new job opportunities

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

-- Insert common job portals
INSERT INTO job_portals (name, base_url, search_url_template, portal_type, supports_rss) VALUES
  ('LinkedIn', 'https://www.linkedin.com', 'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}', 'job_board', false),
  ('Indeed', 'https://www.indeed.com', 'https://www.indeed.com/jobs?q={keywords}&l={location}', 'job_board', true),
  ('Glassdoor', 'https://www.glassdoor.com', 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword={keywords}&locT=C&locId={location}', 'job_board', false),
  ('AngelList/Wellfound', 'https://wellfound.com', 'https://wellfound.com/jobs?query={keywords}', 'job_board', false),
  ('Y Combinator', 'https://www.workatastartup.com', 'https://www.workatastartup.com/jobs?query={keywords}', 'job_board', false),
  ('Hacker News', 'https://news.ycombinator.com', 'https://hn.algolia.com/?query={keywords}&type=story&tags=story,ask_hn', 'aggregator', false)
ON CONFLICT DO NOTHING;

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_checked ON saved_searches(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_status ON search_results(status);
CREATE INDEX IF NOT EXISTS idx_search_results_first_seen ON search_results(first_seen_at);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_job_portals_updated_at ON job_portals;
CREATE TRIGGER update_job_portals_updated_at
  BEFORE UPDATE ON job_portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_results_updated_at ON search_results;
CREATE TRIGGER update_search_results_updated_at
  BEFORE UPDATE ON search_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
