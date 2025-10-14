/**
 * Bond Token Links Service
 * Service layer for managing bond-token link relationships
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  BondTokenLink,
  BondTokenLinkWithDetails,
  CreateBondTokenLinkRequest,
  UpdateBondTokenLinkRequest,
  BondTokenLinkFilters,
} from '../types/bond-token-links'

export class BondTokenLinksService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all token links for a bond
   */
  async getBondTokenLinks(
    bondId: string,
    projectId: string
  ): Promise<BondTokenLinkWithDetails[]> {
    const { data, error } = await this.supabase
      .from('bond_token_links')
      .select(`
        *,
        tokens!inner(name, symbol),
        bond_products!inner(asset_name)
      `)
      .eq('bond_id', bondId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch bond token links: ${error.message}`)
    }

    return (data || []).map((link: any) => ({
      ...link,
      token_name: link.tokens?.name || 'Unknown',
      token_symbol: link.tokens?.symbol || 'N/A',
      bond_name: link.bond_products?.asset_name || 'Unknown',
    }))
  }

  /**
   * Get all token links (with optional filters)
   */
  async getTokenLinks(
    filters: BondTokenLinkFilters
  ): Promise<BondTokenLinkWithDetails[]> {
    let query = this.supabase
      .from('bond_token_links')
      .select(`
        *,
        tokens!inner(name, symbol),
        bond_products!inner(asset_name)
      `)

    if (filters.bond_id) {
      query = query.eq('bond_id', filters.bond_id)
    }
    if (filters.token_id) {
      query = query.eq('token_id', filters.token_id)
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

    return (data || []).map((link: any) => ({
      ...link,
      token_name: link.tokens?.name || 'Unknown',
      token_symbol: link.tokens?.symbol || 'N/A',
      bond_name: link.bond_products?.asset_name || 'Unknown',
    }))
  }

  /**
   * Get a single token link by ID
   */
  async getTokenLinkById(
    linkId: string,
    projectId: string
  ): Promise<BondTokenLinkWithDetails | null> {
    const { data, error } = await this.supabase
      .from('bond_token_links')
      .select(`
        *,
        tokens!inner(name, symbol),
        bond_products!inner(asset_name)
      `)
      .eq('id', linkId)
      .eq('project_id', projectId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch token link: ${error.message}`)
    }

    return {
      ...data,
      token_name: data.tokens?.name || 'Unknown',
      token_symbol: data.tokens?.symbol || 'N/A',
      bond_name: data.bond_products?.asset_name || 'Unknown',
    }
  }

  /**
   * Create a new token link
   */
  async createTokenLink(
    projectId: string,
    userId: string,
    request: CreateBondTokenLinkRequest
  ): Promise<BondTokenLink> {
    // Check if link already exists
    const { data: existing } = await this.supabase
      .from('bond_token_links')
      .select('id')
      .eq('bond_id', request.bond_id)
      .eq('token_id', request.token_id)
      .eq('project_id', projectId)
      .single()

    if (existing) {
      throw new Error('A token link already exists for this bond and token')
    }

    const { data, error } = await this.supabase
      .from('bond_token_links')
      .insert({
        project_id: projectId,
        bond_id: request.bond_id,
        token_id: request.token_id,
        parity: request.parity,
        ratio: request.ratio,
        effective_date: request.effective_date || new Date().toISOString(),
        status: request.status || 'active',
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create token link: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing token link
   */
  async updateTokenLink(
    linkId: string,
    projectId: string,
    userId: string,
    request: UpdateBondTokenLinkRequest
  ): Promise<BondTokenLink> {
    const updateData: any = {
      updated_by: userId,
    }

    if (request.parity !== undefined) {
      updateData.parity = request.parity
    }
    if (request.ratio !== undefined) {
      updateData.ratio = request.ratio
    }
    if (request.effective_date !== undefined) {
      updateData.effective_date = request.effective_date
    }
    if (request.status !== undefined) {
      updateData.status = request.status
    }

    const { data, error } = await this.supabase
      .from('bond_token_links')
      .update(updateData)
      .eq('id', linkId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update token link: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a token link
   */
  async deleteTokenLink(linkId: string, projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bond_token_links')
      .delete()
      .eq('id', linkId)
      .eq('project_id', projectId)

    if (error) {
      throw new Error(`Failed to delete token link: ${error.message}`)
    }
  }
}
