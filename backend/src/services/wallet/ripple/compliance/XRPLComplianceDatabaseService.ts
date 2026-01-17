/**
 * XRPL Compliance Database Service (Backend)
 * Combined service for freeze and deposit authorization database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type FreezeType = 'global' | 'individual' | 'no_freeze';
export type FreezeAction = 'enable' | 'disable' | 'freeze' | 'unfreeze';

export interface FreezeEventParams {
  projectId?: string
  issuerAddress: string
  holderAddress?: string
  currency?: string
  freezeType: FreezeType
  action: FreezeAction
  reason?: string
  transactionHash: string
}

export interface DepositAuthEventParams {
  projectId: string
  accountAddress: string
  action: 'enable' | 'disable'
  transactionHash: string
}

export interface DepositAuthorizationParams {
  projectId: string
  accountAddress: string
  authorizedAddress: string
  transactionHash: string
}

export interface ListFreezeEventsParams {
  page: number
  limit: number
  issuerAddress?: string
  freezeType?: string
  projectId?: string
}

export interface FreezeEventsResult {
  events: any[]
  total: number
}

export class XRPLComplianceDatabaseService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }

  /**
   * Save freeze event
   */
  async saveFreezeEvent(params: FreezeEventParams): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_freeze_events')
      .insert({
        project_id: params.projectId,
        issuer_address: params.issuerAddress,
        holder_address: params.holderAddress,
        currency: params.currency,
        freeze_type: params.freezeType,
        action: params.action,
        reason: params.reason,
        transaction_hash: params.transactionHash
      });

    if (error) {
      console.error('Failed to save freeze event:', error);
      // Don't throw - database logging is not critical
    }
  }

  /**
   * Save deposit auth event
   */
  async saveDepositAuthEvent(params: DepositAuthEventParams): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_deposit_auth_requirements')
      .upsert({
        project_id: params.projectId,
        account_address: params.accountAddress,
        deposit_auth_enabled: params.action === 'enable',
        enabled_at: params.action === 'enable' ? new Date().toISOString() : undefined,
        enabled_transaction_hash: params.action === 'enable' ? params.transactionHash : undefined,
        disabled_at: params.action === 'disable' ? new Date().toISOString() : undefined,
        disabled_transaction_hash: params.action === 'disable' ? params.transactionHash : undefined,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_address'
      });

    if (error) {
      console.error('Failed to save deposit auth event:', error);
      // Don't throw - database logging is not critical
    }
  }

  /**
   * Save deposit authorization
   */
  async saveDepositAuthorization(params: DepositAuthorizationParams): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_deposit_authorizations')
      .insert({
        project_id: params.projectId,
        account_address: params.accountAddress,
        authorized_address: params.authorizedAddress,
        authorization_type: 'address',
        is_active: true,
        authorization_transaction_hash: params.transactionHash,
        authorized_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to save deposit authorization:', error);
      // Don't throw - database logging is not critical
    }
  }

  /**
   * Remove deposit authorization
   */
  async removeDepositAuthorization(
    accountAddress: string,
    authorizedAddress: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_deposit_authorizations')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('account_address', accountAddress)
      .eq('authorized_address', authorizedAddress)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to remove deposit authorization:', error);
      // Don't throw - database logging is not critical
    }
  }

  /**
   * List freeze events with pagination
   */
  async listFreezeEvents(params: ListFreezeEventsParams): Promise<FreezeEventsResult> {
    let query = this.supabase
      .from('xrpl_freeze_events')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.issuerAddress) {
      query = query.eq('issuer_address', params.issuerAddress);
    }
    if (params.freezeType) {
      query = query.eq('freeze_type', params.freezeType);
    }
    if (params.projectId) {
      query = query.eq('project_id', params.projectId);
    }

    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    query = query
      .range(offset, offset + params.limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list freeze events: ${error.message}`);
    }

    return {
      events: data || [],
      total: count || 0
    };
  }

  /**
   * Get freeze history for account
   */
  async getFreezeHistory(accountAddress: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('xrpl_freeze_events')
      .select('*')
      .eq('issuer_address', accountAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get freeze history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get deposit authorizations for account
   */
  async getDepositAuthorizations(
    projectId: string,
    accountAddress: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('xrpl_deposit_authorizations')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .eq('is_active', true)
      .order('authorized_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get deposit authorizations: ${error.message}`);
    }

    return data || [];
  }
}
