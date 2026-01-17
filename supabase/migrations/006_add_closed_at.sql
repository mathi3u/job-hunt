-- Add closed_at timestamp to opportunities
ALTER TABLE opportunities
ADD COLUMN closed_at TIMESTAMPTZ;

COMMENT ON COLUMN opportunities.closed_at IS 'Timestamp when the opportunity was closed (closed_won or closed_lost)';
