-- Migration: 20250816_update_delete_project_cascade.sql
-- Description: Updates the delete_project_cascade function to handle all foreign key references

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS delete_project_cascade;

-- Create the updated function with comprehensive cascade deletion
CREATE OR REPLACE FUNCTION delete_project_cascade(project_id UUID)
RETURNS VOID AS $$
DECLARE
  cap_table_ids UUID[];
  subscription_ids UUID[];
BEGIN
  -- Start a transaction to ensure atomicity
  BEGIN
    -- Find cap table IDs related to the project
    SELECT array_agg(id) INTO cap_table_ids FROM cap_tables WHERE project_id = $1;
    
    -- If cap tables exist, delete their investors first
    IF cap_table_ids IS NOT NULL THEN
      DELETE FROM cap_table_investors WHERE cap_table_id = ANY(cap_table_ids);
      
      -- Then delete the cap tables themselves
      DELETE FROM cap_tables WHERE project_id = $1;
    END IF;
    
    -- Find subscription IDs for this project
    SELECT array_agg(id) INTO subscription_ids FROM subscriptions WHERE project_id = $1;
    
    -- If there are subscriptions, delete token allocations first
    IF subscription_ids IS NOT NULL THEN
      DELETE FROM token_allocations WHERE subscription_id = ANY(subscription_ids);
      
      -- Then delete the subscriptions
      DELETE FROM subscriptions WHERE project_id = $1;
    END IF;
    
    -- Delete from all product-related tables
    DELETE FROM structured_products WHERE project_id = $1;
    DELETE FROM equity_products WHERE project_id = $1;
    DELETE FROM commodities_products WHERE project_id = $1;
    DELETE FROM fund_products WHERE project_id = $1;
    DELETE FROM bond_products WHERE project_id = $1;
    DELETE FROM quantitative_investment_strategies_products WHERE project_id = $1;
    DELETE FROM private_equity_products WHERE project_id = $1;
    DELETE FROM private_debt_products WHERE project_id = $1;
    DELETE FROM real_estate_products WHERE project_id = $1;
    DELETE FROM energy_products WHERE project_id = $1;
    DELETE FROM infrastructure_products WHERE project_id = $1;
    DELETE FROM collectibles_products WHERE project_id = $1;
    DELETE FROM asset_backed_products WHERE project_id = $1;
    DELETE FROM digital_tokenized_fund_products WHERE project_id = $1;
    DELETE FROM stablecoin_products WHERE project_id = $1;
    
    -- Delete from other related tables
    DELETE FROM issuer_detail_documents WHERE project_id = $1;
    DELETE FROM token_deployment_history WHERE project_id = $1;
    DELETE FROM investor_groups WHERE project_id = $1;
    DELETE FROM project_credentials WHERE project_id = $1;
    DELETE FROM token_templates WHERE project_id = $1;
    DELETE FROM tokens WHERE project_id = $1;
    DELETE FROM compliance_checks WHERE project_id = $1;
    DELETE FROM distributions WHERE project_id = $1;
    
    -- Finally delete the project
    DELETE FROM projects WHERE id = $1;
    
    -- Explicitly commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction if any error occurs
      ROLLBACK;
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_project_cascade(UUID) IS 'Safely deletes a project and all related data in proper order to maintain referential integrity';
