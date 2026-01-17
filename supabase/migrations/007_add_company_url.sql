-- Add company_url field to job_postings for direct application links
ALTER TABLE job_postings
ADD COLUMN company_url TEXT;

COMMENT ON COLUMN job_postings.company_url IS 'Direct URL to the job posting on the company website (vs portal URL)';
