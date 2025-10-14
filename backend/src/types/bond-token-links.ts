/**
 * Bond Token Links Types
 * TypeScript types for bond-token link relationships
 */

export interface BondTokenLink {
  id: string
  project_id: string
  bond_id: string
  token_id: string
  parity: number
  ratio: number
  effective_date: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface BondTokenLinkWithDetails extends BondTokenLink {
  token_name: string
  token_symbol: string
  bond_name: string
}

export interface CreateBondTokenLinkRequest {
  bond_id: string
  token_id: string
  parity: number
  ratio: number
  effective_date?: string
  status?: 'active' | 'inactive' | 'suspended'
}

// Frontend request type with camelCase field names
export interface CreateBondTokenLinkFrontendRequest {
  tokenId: string
  parityRatio: number  // Maps to parity in database
  collateralizationPercentage: number  // Maps to ratio in database (will be divided by 100)
  effectiveDate?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UpdateBondTokenLinkRequest {
  parity?: number
  ratio?: number
  effective_date?: string
  status?: 'active' | 'inactive' | 'suspended'
}

// Frontend update type with camelCase field names
export interface UpdateBondTokenLinkFrontendRequest {
  parityRatio?: number  // Maps to parity in database
  collateralizationPercentage?: number  // Maps to ratio in database (will be divided by 100)
  effectiveDate?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface BondTokenLinkFilters {
  bond_id?: string
  token_id?: string
  status?: 'active' | 'inactive' | 'suspended'
  project_id?: string
}
