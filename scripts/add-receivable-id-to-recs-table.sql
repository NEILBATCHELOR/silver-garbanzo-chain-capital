-- Migration: Add receivable_id column to renewable_energy_credits table
-- Purpose: Enable linking RECs to Climate Receivables for enhanced tracking
-- Date: August 26, 2025
-- Task: REC Create New Enhancement - Add optional receivable linking

-- Add receivable_id column to renewable_energy_credits table
ALTER TABLE renewable_energy_credits 
ADD COLUMN receivable_id UUID REFERENCES climate_receivables(receivable_id);

-- Add comment to document the purpose
COMMENT ON COLUMN renewable_energy_credits.receivable_id IS 'Optional link to climate receivable - allows RECs to be associated with specific receivables';

-- Create index for improved query performance
CREATE INDEX idx_renewable_energy_credits_receivable_id 
ON renewable_energy_credits(receivable_id) 
WHERE receivable_id IS NOT NULL;

-- Add comment to document the index
COMMENT ON INDEX idx_renewable_energy_credits_receivable_id IS 'Performance index for RECs linked to climate receivables';

-- Verify the migration
DO $$
BEGIN
    -- Check if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewable_energy_credits' 
        AND column_name = 'receivable_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: receivable_id column added to renewable_energy_credits table';
    ELSE
        RAISE EXCEPTION 'FAILED: receivable_id column not found in renewable_energy_credits table';
    END IF;
    
    -- Check if the foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'renewable_energy_credits'
        AND ccu.column_name = 'receivable_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'SUCCESS: Foreign key constraint created for receivable_id';
    ELSE
        RAISE EXCEPTION 'FAILED: Foreign key constraint not found for receivable_id';
    END IF;
    
    -- Check if the index exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'renewable_energy_credits' 
        AND indexname = 'idx_renewable_energy_credits_receivable_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: Performance index created for receivable_id';
    ELSE
        RAISE EXCEPTION 'FAILED: Performance index not found for receivable_id';
    END IF;
    
    RAISE NOTICE 'REC receivable linking migration completed successfully!';
END $$;
