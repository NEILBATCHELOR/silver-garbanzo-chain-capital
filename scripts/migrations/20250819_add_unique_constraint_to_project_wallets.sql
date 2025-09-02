-- This migration adds a unique constraint to the project_wallets table.
-- This prevents duplicate wallets from being created with the same wallet_address.

-- First, remove any existing incorrect constraint if it was applied
-- ALTER TABLE public.project_wallets DROP CONSTRAINT IF EXISTS uq_project_wallets_project_id_wallet_type;

-- Add the correct unique constraint on wallet_address
ALTER TABLE public.project_wallets
ADD CONSTRAINT uq_project_wallets_wallet_address UNIQUE (wallet_address);

-- Down migration (to revert the change)
-- ALTER TABLE public.project_wallets
-- DROP CONSTRAINT uq_project_wallets_wallet_address;
