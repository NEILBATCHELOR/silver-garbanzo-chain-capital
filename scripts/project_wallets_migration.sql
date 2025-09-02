-- Create project_wallets table
CREATE TABLE public.project_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT,
  mnemonic TEXT,
  key_vault_id TEXT,
  vault_storage_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_project_wallets_project_id ON public.project_wallets(project_id);
CREATE INDEX idx_project_wallets_wallet_type ON public.project_wallets(wallet_type);

-- Add RLS policies
ALTER TABLE public.project_wallets ENABLE ROW LEVEL SECURITY;

-- Policy for selecting project wallets
CREATE POLICY project_wallets_select_policy ON public.project_wallets
  FOR SELECT
  USING (
    -- Users can see wallets for projects they have access to
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_users ou ON p.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Policy for inserting project wallets
CREATE POLICY project_wallets_insert_policy ON public.project_wallets
  FOR INSERT
  WITH CHECK (
    -- Users can create wallets for projects they have access to
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_users ou ON p.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Policy for updating project wallets
CREATE POLICY project_wallets_update_policy ON public.project_wallets
  FOR UPDATE
  USING (
    -- Users can update wallets for projects they have access to
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_users ou ON p.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Policy for deleting project wallets
CREATE POLICY project_wallets_delete_policy ON public.project_wallets
  FOR DELETE
  USING (
    -- Users can delete wallets for projects they have access to
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_users ou ON p.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Add function for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updating the updated_at timestamp
CREATE TRIGGER update_project_wallets_updated_at
BEFORE UPDATE ON public.project_wallets
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();