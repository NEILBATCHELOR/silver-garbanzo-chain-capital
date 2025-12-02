/**
 * ETF Token Links Service
 * Service layer for managing ETF-token link relationships
 * Following MMF pattern exactly
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ETFTokenLink {
  id: string
  project_id: string
  etf_id: string
  token_id: string
  parity: number
  ratio: number
  effective_date: string
  status: string
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface ETFTokenLinkWithDetails extends ETFTokenLink {
  token_name: string
  token_symbol: string
  etf_name: string
}

export interface CreateETFTokenLinkRequest {
  etf_id: string
  token_id: string
  parity: number
  ratio: number
  effective_date?: string
  status?: string
}

export interface UpdateETFTokenLinkRequest {
  parity?: number
  ratio?: number
  status?: string
}

export interface ETFTokenLinkFilters {
  etf_id?: string
  token_id?: string
  status?: string
  project_id?: string
}

export class ETFTokenLinksService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all token links for an ETF
   */
  async getETFTokenLinks(
    etfId: string,
    projectId: string
  ): Promise<ETFTokenLinkWithDetails[]> {
    // Using tokens table with product_id = etf_id (same pattern as MMF/Bonds)
    const { data, error } = await this.supabase
      .from('tokens')
      .select(`
        id,
        name,
        symbol,
        product_id,
        ratio,
        parity,
        status,
        created_at,
        updated_at
      `)
      .eq('product_id', etfId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch ETF token links: ${error.message}`)
    }

    // Get ETF name
    const { data: etfData } = await this.supabase
      .from('fund_products')
      .select('fund_name, fund_ticker')
      .eq('id', etfId)
      .single()

    const etfName = etfData?.fund_name || etfData?.fund_ticker || 'Unknown ETF'

    return (data || []).map((token: any) => ({
      id: token.id,
      project_id: projectId,
      etf_id: etfId,
      token_id: token.id,
      parity: token.parity || token.ratio || 1.0,
      ratio: token.ratio || 1.0,
      effective_date: token.created_at,
      status: token.status || 'active',
      created_at: token.created_at,
      updated_at: token.updated_at,
      created_by: null,
      updated_by: null,
      token_name: token.name || 'Unknown',
      token_symbol: token.symbol || 'N/A',
      etf_name: etfName,
    }))
  }

  /**
   * Get all token links (with optional filters)
   */
  async getTokenLinks(
    filters: ETFTokenLinkFilters
  ): Promise<ETFTokenLinkWithDetails[]> {
    let query = this.supabase
      .from('tokens')
      .select('*')

    if (filters.etf_id) {
      query = query.eq('product_id', filters.etf_id)
    }
    if (filters.token_id) {
      query = query.eq('id', filters.token_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch token links: ${error.message}`)
    }

    // Get all unique ETF IDs
    const etfIds = [...new Set((data || []).map((t: any) => t.product_id).filter(Boolean))]
    
    // Fetch ETF names
    const { data: etfs } = await this.supabase
      .from('fund_products')
      .select('id, fund_name, fund_ticker')
      .in('id', etfIds)

    const etfMap = new Map(
      (etfs || []).map((etf: any) => [
        etf.id,
        etf.fund_name || etf.fund_ticker || 'Unknown ETF'
      ])
    )

    return (data || []).map((token: any) => ({
      id: token.id,
      project_id: token.project_id,
      etf_id: token.product_id,
      token_id: token.id,
      parity: token.parity || token.ratio || 1.0,
      ratio: token.ratio || 1.0,
      effective_date: token.created_at,
      status: token.status || 'active',
      created_at: token.created_at,
      updated_at: token.updated_at,
      created_by: null,
      updated_by: null,
      token_name: token.name || 'Unknown',
      token_symbol: token.symbol || 'N/A',
      etf_name: etfMap.get(token.product_id) || 'Unknown ETF',
    }))
  }

  /**
   * Get a single token link by ID
   */
  async getTokenLinkById(
    linkId: string,
    projectId: string
  ): Promise<ETFTokenLinkWithDetails | null> {
    const { data: token, error } = await this.supabase
      .from('tokens')
      .select('*')
      .eq('id', linkId)
      .eq('project_id', projectId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch token link: ${error.message}`)
    }

    // Get ETF name
    const { data: etfData } = await this.supabase
      .from('fund_products')
      .select('fund_name, fund_ticker')
      .eq('id', token.product_id)
      .single()

    const etfName = etfData?.fund_name || etfData?.fund_ticker || 'Unknown ETF'

    return {
      id: token.id,
      project_id: token.project_id,
      etf_id: token.product_id,
      token_id: token.id,
      parity: token.parity || token.ratio || 1.0,
      ratio: token.ratio || 1.0,
      effective_date: token.created_at,
      status: token.status || 'active',
      created_at: token.created_at,
      updated_at: token.updated_at,
      created_by: null,
      updated_by: null,
      token_name: token.name || 'Unknown',
      token_symbol: token.symbol || 'N/A',
      etf_name: etfName,
    }
  }

  /**
   * Create a new token link
   */
  async createTokenLink(
    projectId: string,
    userId: string,
    request: CreateETFTokenLinkRequest
  ): Promise<ETFTokenLink> {
    // Check if token exists
    const { data: token, error: tokenError } = await this.supabase
      .from('tokens')
      .select('id, product_id')
      .eq('id', request.token_id)
      .eq('project_id', projectId)
      .single()

    if (tokenError || !token) {
      throw new Error('Token not found')
    }

    // Check if token is already linked to another ETF
    if (token.product_id && token.product_id !== request.etf_id) {
      throw new Error(`Token is already linked to another ETF (${token.product_id}). Unlink first.`)
    }

    // Update token with ETF link
    const { data, error } = await this.supabase
      .from('tokens')
      .update({
        product_id: request.etf_id,
        ratio: request.ratio,
        parity: request.parity,
        status: request.status || 'active',
      })
      .eq('id', request.token_id)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create token link: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: projectId,
      etf_id: request.etf_id,
      token_id: request.token_id,
      parity: request.parity,
      ratio: request.ratio,
      effective_date: request.effective_date || new Date().toISOString(),
      status: request.status || 'active',
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: userId,
      updated_by: userId,
    }
  }

  /**
   * Update an existing token link
   */
  async updateTokenLink(
    linkId: string,
    projectId: string,
    userId: string,
    request: UpdateETFTokenLinkRequest
  ): Promise<ETFTokenLink> {
    const updateData: any = {}

    if (request.parity !== undefined) {
      updateData.parity = request.parity
    }
    if (request.ratio !== undefined) {
      updateData.ratio = request.ratio
    }
    if (request.status !== undefined) {
      updateData.status = request.status
    }

    const { data, error } = await this.supabase
      .from('tokens')
      .update(updateData)
      .eq('id', linkId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update token link: ${error.message}`)
    }

    return {
      id: data.id,
      project_id: data.project_id,
      etf_id: data.product_id,
      token_id: data.id,
      parity: data.parity,
      ratio: data.ratio,
      effective_date: data.created_at,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: null,
      updated_by: userId,
    }
  }

  /**
   * Delete a token link (unlink token from ETF)
   */
  async deleteTokenLink(linkId: string, projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tokens')
      .update({
        product_id: null,
        ratio: null,
        parity: null,
      })
      .eq('id', linkId)
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to delete token link: ${error.message}`)
    }
  }

  /**
   * Update rebase configuration for a token link
   * (ETF-specific feature for algorithmic/rebasing ETFs)
   */
  async updateRebaseConfig(
    linkId: string,
    projectId: string,
    config: {
      supports_rebase?: boolean
      rebase_frequency?: string
      rebase_threshold_pct?: number
      oracle_address?: string
    }
  ): Promise<void> {
    // Check if etf_token_links table entry exists
    const { data: existing } = await this.supabase
      .from('etf_token_links')
      .select('id')
      .eq('token_id', linkId)
      .single()

    if (existing) {
      // Update existing
      const { error } = await this.supabase
        .from('etf_token_links')
        .update(config)
        .eq('token_id', linkId)

      if (error) {
        throw new Error(`Failed to update rebase config: ${error.message}`)
      }
    } else {
      // Get ETF ID from token
      const { data: token } = await this.supabase
        .from('tokens')
        .select('product_id')
        .eq('id', linkId)
        .single()

      if (!token || !token.product_id) {
        throw new Error('Token not linked to an ETF')
      }

      // Create new entry
      const { error } = await this.supabase
        .from('etf_token_links')
        .insert({
          fund_product_id: token.product_id,
          token_id: linkId,
          ...config,
        })

      if (error) {
        throw new Error(`Failed to create rebase config: ${error.message}`)
      }
    }
  }

  /**
   * Get the primary token for an ETF
   */
  async getTokenByETF(etfId: string, projectId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('tokens')
      .select('*')
      .eq('product_id', etfId)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch token: ${error.message}`)
    }

    return data
  }
}
