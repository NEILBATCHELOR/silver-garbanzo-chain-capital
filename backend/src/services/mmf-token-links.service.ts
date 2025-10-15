/**
 * MMF Token Links Service
 * Service layer for managing MMF-token link relationships
 * Following Bonds pattern exactly
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  MMFTokenLink,
  MMFTokenLinkWithDetails,
  CreateMMFTokenLinkRequest,
  UpdateMMFTokenLinkRequest,
  MMFTokenLinkFilters,
} from '../types/mmf-token-links'

export class MMFTokenLinksService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all token links for an MMF
   */
  async getMMFTokenLinks(
    mmfId: string,
    projectId: string
  ): Promise<MMFTokenLinkWithDetails[]> {
    // Using tokens table with product_id = mmf_id (same pattern as Bonds)
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
      .eq('product_id', mmfId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch MMF token links: ${error.message}`)
    }

    // Get MMF name
    const { data: mmfData } = await this.supabase
      .from('fund_products')
      .select('fund_name, fund_ticker')
      .eq('id', mmfId)
      .single()

    const mmfName = mmfData?.fund_name || mmfData?.fund_ticker || 'Unknown MMF'

    return (data || []).map((token: any) => ({
      id: token.id,
      project_id: projectId,
      mmf_id: mmfId,
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
      mmf_name: mmfName,
    }))
  }

  /**
   * Get all token links (with optional filters)
   */
  async getTokenLinks(
    filters: MMFTokenLinkFilters
  ): Promise<MMFTokenLinkWithDetails[]> {
    let query = this.supabase
      .from('tokens')
      .select('*')

    if (filters.mmf_id) {
      query = query.eq('product_id', filters.mmf_id)
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

    // Get all unique MMF IDs
    const mmfIds = [...new Set((data || []).map((t: any) => t.product_id).filter(Boolean))]
    
    // Fetch MMF names
    const { data: mmfs } = await this.supabase
      .from('fund_products')
      .select('id, fund_name, fund_ticker')
      .in('id', mmfIds)

    const mmfMap = new Map(
      (mmfs || []).map((mmf: any) => [
        mmf.id,
        mmf.fund_name || mmf.fund_ticker || 'Unknown MMF'
      ])
    )

    return (data || []).map((token: any) => ({
      id: token.id,
      project_id: token.project_id,
      mmf_id: token.product_id,
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
      mmf_name: mmfMap.get(token.product_id) || 'Unknown MMF',
    }))
  }

  /**
   * Get a single token link by ID
   */
  async getTokenLinkById(
    linkId: string,
    projectId: string
  ): Promise<MMFTokenLinkWithDetails | null> {
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

    // Get MMF name
    const { data: mmfData } = await this.supabase
      .from('fund_products')
      .select('fund_name, fund_ticker')
      .eq('id', token.product_id)
      .single()

    const mmfName = mmfData?.fund_name || mmfData?.fund_ticker || 'Unknown MMF'

    return {
      id: token.id,
      project_id: token.project_id,
      mmf_id: token.product_id,
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
      mmf_name: mmfName,
    }
  }

  /**
   * Create a new token link
   */
  async createTokenLink(
    projectId: string,
    userId: string,
    request: CreateMMFTokenLinkRequest
  ): Promise<MMFTokenLink> {
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

    // Check if token is already linked to another MMF
    if (token.product_id && token.product_id !== request.mmf_id) {
      throw new Error(`Token is already linked to another MMF (${token.product_id}). Unlink first.`)
    }

    // Update token with MMF link
    const { data, error } = await this.supabase
      .from('tokens')
      .update({
        product_id: request.mmf_id,
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
      mmf_id: request.mmf_id,
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
    request: UpdateMMFTokenLinkRequest
  ): Promise<MMFTokenLink> {
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
      mmf_id: data.product_id,
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
   * Delete a token link (unlink token from MMF)
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
}
