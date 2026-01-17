-- Add language field to documents
ALTER TABLE documents
ADD COLUMN language TEXT DEFAULT 'en';

-- Add constraint for valid values
ALTER TABLE documents
ADD CONSTRAINT valid_language
CHECK (language IN ('en', 'fr'));

COMMENT ON COLUMN documents.language IS 'Language of the document: en (English) or fr (French)';
