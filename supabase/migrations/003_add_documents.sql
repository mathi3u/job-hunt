-- Add Documents Table for CV Bank
-- Run this in Supabase SQL Editor

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  doc_type TEXT DEFAULT 'cv',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_is_default ON documents(is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Permissive policy (update for production with auth)
CREATE POLICY "Allow all operations on documents" ON documents
  FOR ALL USING (true) WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Create storage bucket for documents (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policy for public read access
-- CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
-- CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
-- CREATE POLICY "Allow deletes" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
