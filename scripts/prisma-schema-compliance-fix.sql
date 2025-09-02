-- Compliance Backend Service Prisma Schema Fix Script
-- This script adds missing models and fields to align Prisma schema with database

-- Step 1: Verify issuer_documents table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'issuer_documents' 
ORDER BY ordinal_position;

-- Step 2: Verify investor_documents table structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investor_documents' 
ORDER BY ordinal_position;

-- Step 3: Check document_status enum values
SELECT 
    enumlabel as enum_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'document_status'
ORDER BY e.enumsortorder;

-- Step 4: Check document_type enum values
SELECT 
    enumlabel as enum_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'document_type'
ORDER BY e.enumsortorder;

-- Results should show:
-- issuer_documents: 17 columns including document_name and is_public
-- investor_documents: 17 columns with proper structure
-- Both enums with proper values for TypeScript compilation
