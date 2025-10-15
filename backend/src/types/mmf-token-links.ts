/**
 * MMF Token Links Types
 * TypeScript types for MMF-token link relationships
 * Following Bonds pattern exactly
 */

export interface MMFTokenLink {
  id: string
  project_id: string
  mmf_id: string
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

export interface MMFTokenLinkWithDetails extends MMFTokenLink {
  token_name: string
  token_symbol: string
  mmf_name: string
}

export interface CreateMMFTokenLinkRequest {
  mmf_id: string
  token_id: string
  parity: number
  ratio: number
  effective_date?: string
  status?: 'active' | 'inactive' | 'suspended'
}

// Frontend request type with camelCase field names
export interface CreateMMFTokenLinkFrontendRequest {
  tokenId: string
  parityRatio: number  // Maps to parity in database
  collateralizationPercentage: number  // Maps to ratio in database (will be divided by 100)
  effectiveDate?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UpdateMMFTokenLinkRequest {
  parity?: number
  ratio?: number
  effective_date?: string
  status?: 'active' | 'inactive' | 'suspended'
}

// Frontend update type with camelCase field names
export interface UpdateMMFTokenLinkFrontendRequest {
  parityRatio?: number  // Maps to parity in database
  collateralizationPercentage?: number  // Maps to ratio in database (will be divided by 100)
  effectiveDate?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface MMFTokenLinkFilters {
  mmf_id?: string
  token_id?: string
  status?: 'active' | 'inactive' | 'suspended'
  project_id?: string
}
