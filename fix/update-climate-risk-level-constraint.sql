-- Update climate_risk_calculations table constraint to include CRITICAL risk level
-- This fixes TypeScript errors where RiskLevel.CRITICAL is used but not supported by DB constraint

-- Drop the existing constraint
ALTER TABLE climate_risk_calculations DROP CONSTRAINT IF EXISTS climate_risk_calculations_composite_risk_level_check;

-- Add new constraint that includes CRITICAL
ALTER TABLE climate_risk_calculations ADD CONSTRAINT climate_risk_calculations_composite_risk_level_check 
  CHECK (composite_risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text]));

-- Verify the constraint is in place
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'climate_risk_calculations' 
AND conname LIKE '%risk_level%';
