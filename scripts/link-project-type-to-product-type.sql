-- Link Project Type to Product Type in Redemption Rules
-- Date: August 23, 2025
-- Purpose: Establish proper relationship between projects.project_type and redemption_rules.product_type

BEGIN;

-- Step 1: Add foreign key constraint between redemption_rules.project_id and projects.id
-- This ensures referential integrity between the tables
ALTER TABLE redemption_rules 
ADD CONSTRAINT fk_redemption_rules_project 
FOREIGN KEY (project_id) REFERENCES projects(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 2: Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_redemption_rules_project_id 
ON redemption_rules(project_id);

-- Step 3: Update existing redemption_rules to populate product_type from associated project
-- This syncs the current null product_type values with their project's project_type
UPDATE redemption_rules 
SET product_type = p.project_type,
    organization_id = p.organization_id,
    updated_at = NOW()
FROM projects p 
WHERE redemption_rules.project_id = p.id 
    AND redemption_rules.product_type IS NULL;

-- Step 4: Create function to automatically sync product_type when project_type changes
CREATE OR REPLACE FUNCTION sync_redemption_product_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all redemption rules associated with this project
    UPDATE redemption_rules 
    SET product_type = NEW.project_type,
        organization_id = NEW.organization_id,
        updated_at = NOW()
    WHERE project_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically sync product_type when project_type is updated
DROP TRIGGER IF EXISTS trigger_sync_redemption_product_type ON projects;
CREATE TRIGGER trigger_sync_redemption_product_type
    AFTER UPDATE OF project_type, organization_id ON projects
    FOR EACH ROW
    EXECUTE FUNCTION sync_redemption_product_type();

-- Step 6: Create function to automatically set product_type when new redemption rule is created
CREATE OR REPLACE FUNCTION set_redemption_product_type_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate product_type and organization_id from associated project
    IF NEW.project_id IS NOT NULL AND NEW.product_type IS NULL THEN
        SELECT project_type, organization_id
        INTO NEW.product_type, NEW.organization_id
        FROM projects 
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for new redemption rule insertions
DROP TRIGGER IF EXISTS trigger_set_redemption_product_type_on_insert ON redemption_rules;
CREATE TRIGGER trigger_set_redemption_product_type_on_insert
    BEFORE INSERT ON redemption_rules
    FOR EACH ROW
    EXECUTE FUNCTION set_redemption_product_type_on_insert();

-- Step 8: Add constraint to ensure product_type matches valid project_type values
-- This ensures data consistency between the two tables
ALTER TABLE redemption_rules 
ADD CONSTRAINT redemption_rules_product_type_check 
CHECK (product_type = ANY (ARRAY[
    'structured_products'::text,
    'equity'::text,
    'commodities'::text,
    'funds_etfs_etps'::text,
    'bonds'::text,
    'quantitative_investment_strategies'::text,
    'private_equity'::text,
    'private_debt'::text,
    'real_estate'::text,
    'energy'::text,
    'infrastructure'::text,
    'collectibles'::text,
    'receivables'::text,
    'solar_wind_climate'::text,
    'digital_tokenised_fund'::text,
    'fiat_backed_stablecoin'::text,
    'crypto_backed_stablecoin'::text,
    'commodity_backed_stablecoin'::text,
    'algorithmic_stablecoin'::text,
    'rebasing_stablecoin'::text
]));

-- Step 9: Create index for product_type for performance
CREATE INDEX IF NOT EXISTS idx_redemption_rules_product_type 
ON redemption_rules(product_type);

-- Step 10: Create composite index for project_id and product_type queries
CREATE INDEX IF NOT EXISTS idx_redemption_rules_project_product_type 
ON redemption_rules(project_id, product_type);

-- Step 11: Add comment for documentation
COMMENT ON COLUMN redemption_rules.product_type IS 'Automatically synchronized with projects.project_type via triggers. Represents the financial product category for this redemption rule.';

COMMIT;

-- Verification queries to check the results
-- SELECT rr.id, rr.project_id, rr.product_type, p.name, p.project_type, p.organization_id
-- FROM redemption_rules rr
-- JOIN projects p ON rr.project_id = p.id
-- ORDER BY rr.created_at DESC;

-- SELECT 
--     product_type,
--     COUNT(*) as rule_count,
--     COUNT(DISTINCT project_id) as project_count
-- FROM redemption_rules 
-- WHERE product_type IS NOT NULL
-- GROUP BY product_type
-- ORDER BY product_type;
