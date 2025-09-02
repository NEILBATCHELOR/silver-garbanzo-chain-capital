-- Apply individual document types migration
-- Run this SQL in your Supabase database

-- Apply the migration
\i /Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/scripts/migrate-add-individual-document-types.sql

-- Verify the new enum was created
SELECT enum_range(NULL::individual_document_type);

-- Verify the new table was created
\d individual_documents;
