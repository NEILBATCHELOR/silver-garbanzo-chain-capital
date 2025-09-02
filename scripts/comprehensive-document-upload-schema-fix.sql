-- COMPREHENSIVE DATABASE SCHEMA FIX
-- Date: August 11, 2025
-- Issue: Multiple document upload schema mismatches causing upload failures
-- 
-- This script fixes ALL document upload schema issues in one go:
-- 1. Missing is_public column in issuer_documents table
-- 2. Wrong status enum values (missing 'active' and 'pending_review')
-- 3. Missing investor_documents table entirely
-- 4. Ensure all document tables support the frontend functionality

-- =====================================================
-- 1. Fix issuer_documents table - Add missing is_public column
-- =====================================================

ALTER TABLE public.issuer_documents 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.issuer_documents.is_public IS 'Indicates whether the document is publicly visible or restricted';

-- Add index for performance on is_public queries
CREATE INDEX IF NOT EXISTS idx_issuer_documents_is_public ON public.issuer_documents(is_public);

-- =====================================================
-- 2. Fix document_status enum - Add missing 'active' and 'pending_review' values
-- =====================================================

-- Add 'active' to the document_status enum
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'active';

-- Add 'pending_review' to the document_status enum  
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'pending_review';

-- Verify enum values (should now include: pending, approved, rejected, expired, active, pending_review)
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_status') ORDER BY enumsortorder;

-- =====================================================
-- 3. Create missing investor_documents table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.investor_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL,
    document_type document_type NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status document_status NOT NULL DEFAULT 'pending',
    is_public BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    last_reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- Add foreign key constraints for investor_documents
ALTER TABLE public.investor_documents 
ADD CONSTRAINT fk_investor_documents_investor_id 
FOREIGN KEY (investor_id) REFERENCES public.investors(investor_id) 
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE public.investor_documents 
ADD CONSTRAINT fk_investor_documents_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.investor_documents 
ADD CONSTRAINT fk_investor_documents_updated_by 
FOREIGN KEY (updated_by) REFERENCES auth.users(id) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE public.investor_documents 
ADD CONSTRAINT fk_investor_documents_reviewed_by 
FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_investor_documents_investor_id ON public.investor_documents(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_status ON public.investor_documents(status);
CREATE INDEX IF NOT EXISTS idx_investor_documents_document_type ON public.investor_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_investor_documents_is_public ON public.investor_documents(is_public);
CREATE INDEX IF NOT EXISTS idx_investor_documents_created_at ON public.investor_documents(created_at);

-- Add table comment
COMMENT ON TABLE public.investor_documents IS 'Documents uploaded by investors for KYC/compliance purposes';

-- Add column comments
COMMENT ON COLUMN public.investor_documents.is_public IS 'Indicates whether the document is publicly visible or restricted';
COMMENT ON COLUMN public.investor_documents.status IS 'Document review status: pending, approved, rejected, expired, active, pending_review';
COMMENT ON COLUMN public.investor_documents.metadata IS 'Additional document metadata including file info and processing details';

-- =====================================================
-- 4. Enable RLS (Row Level Security) for investor_documents
-- =====================================================

ALTER TABLE public.investor_documents ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own documents
CREATE POLICY "Users can view their own investor documents" ON public.investor_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.investors 
            WHERE investors.investor_id = investor_documents.investor_id 
            AND investors.user_id = auth.uid()
        )
        OR 
        auth.uid() IN (created_by, updated_by, reviewed_by)
    );

-- Policy for users to insert their own documents
CREATE POLICY "Users can insert their own investor documents" ON public.investor_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.investors 
            WHERE investors.investor_id = investor_documents.investor_id 
            AND investors.user_id = auth.uid()
        )
        AND created_by = auth.uid()
        AND updated_by = auth.uid()
    );

-- Policy for users to update their own documents
CREATE POLICY "Users can update their own investor documents" ON public.investor_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.investors 
            WHERE investors.investor_id = investor_documents.investor_id 
            AND investors.user_id = auth.uid()
        )
        OR 
        auth.uid() IN (created_by, updated_by)
    ) WITH CHECK (
        updated_by = auth.uid()
    );

-- Policy for compliance officers to manage all documents
CREATE POLICY "Compliance officers can manage all investor documents" ON public.investor_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_permissions_view 
            WHERE user_id = auth.uid() 
            AND permission_name IN ('compliance_kyc_kyb.review', 'compliance_kyc_kyb.approve', 'document.approve')
        )
    );

-- =====================================================
-- 5. Add updated_at trigger for investor_documents
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_investor_documents_updated_at ON public.investor_documents;
CREATE TRIGGER set_investor_documents_updated_at
    BEFORE UPDATE ON public.investor_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 6. Verification queries to confirm all fixes
-- =====================================================

-- Verify issuer_documents has is_public column
SELECT 'issuer_documents.is_public' as check_name, 
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.columns 
WHERE table_name = 'issuer_documents' AND column_name = 'is_public';

-- Verify document_status enum has new values
SELECT 'document_status enum values' as check_name,
       STRING_AGG(enumlabel, ', ' ORDER BY enumsortorder) as enum_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_status');

-- Verify investor_documents table exists
SELECT 'investor_documents table' as check_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_name = 'investor_documents' AND table_schema = 'public';

-- Count columns in investor_documents
SELECT 'investor_documents columns' as check_name,
       COUNT(*)::text || ' columns' as status
FROM information_schema.columns 
WHERE table_name = 'investor_documents';

-- =====================================================
-- SUMMARY OF CHANGES
-- =====================================================

/*
✅ FIXED ISSUES:

1. issuer_documents table:
   - Added missing is_public BOOLEAN column with DEFAULT false
   - Added performance index on is_public

2. document_status enum:
   - Added 'active' value for issuer document uploads
   - Added 'pending_review' value for investor document uploads

3. investor_documents table:
   - Created complete table with all required columns
   - Added foreign key constraints to investors and auth.users
   - Added performance indexes
   - Enabled RLS with appropriate policies
   - Added updated_at trigger

4. Security:
   - RLS policies ensure users can only access their own documents
   - Compliance officers can manage all documents
   - Proper foreign key constraints maintain data integrity

RESULT: All document upload functionality should now work correctly:
- Certificate of Incorporation uploads ✅
- All issuer document uploads ✅  
- All investor document uploads ✅
- Public/private document visibility ✅
- Proper status tracking ✅
*/
