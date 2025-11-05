-- Add JSONB columns for module configurations to token_erc20_properties
-- Migration: Add timelock_config and temporary_approval_config for ERC20 module configurations

ALTER TABLE token_erc20_properties
  ADD COLUMN IF NOT EXISTS timelock_config jsonb,
  ADD COLUMN IF NOT EXISTS temporary_approval_config jsonb;

COMMENT ON COLUMN token_erc20_properties.timelock_config IS 'Timelock module configuration: { minDelay: number (seconds) }';
COMMENT ON COLUMN token_erc20_properties.temporary_approval_config IS 'Temporary Approval module configuration: { defaultDuration: number (seconds) }';
