/**
 * XRPL Delegation Database Service
 * Handles persistence of delegation permissions and usage history
 */

import { supabase } from '@/infrastructure/database/client'
import { DelegationInfo, DelegateUsageRecord, DelegatePermission } from './types'

export class XRPLDelegationDatabaseService {
  /**
   * Save delegation permission to database
   */
  async saveDelegation(
    projectId: string,
    delegatorAddress: string,
    delegateAddress: string,
    permissions: DelegatePermission[],
    transactionHash: string
  ): Promise<DelegationInfo> {
    const { data, error } = await supabase
      .from('xrpl_delegate_permissions')
      .insert({
        project_id: projectId,
        delegator_address: delegatorAddress,
        delegate_address: delegateAddress,
        permissions,
        setup_transaction_hash: transactionHash,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to save delegation: ${error.message}`)

    return this.mapToDelegationInfo(data)
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(
    projectId: string,
    delegatorAddress: string,
    delegateAddress: string,
    revocationHash: string
  ): Promise<void> {
    const { error } = await supabase
      .from('xrpl_delegate_permissions')
      .update({
        status: 'revoked',
        revocation_transaction_hash: revocationHash,
        revoked_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('delegator_address', delegatorAddress)
      .eq('delegate_address', delegateAddress)

    if (error) throw new Error(`Failed to revoke delegation: ${error.message}`)
  }

  /**
   * Get delegations for a delegator
   */
  async getDelegationsForDelegator(
    projectId: string,
    delegatorAddress: string
  ): Promise<DelegationInfo[]> {
    const { data, error } = await supabase
      .from('xrpl_delegate_permissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('delegator_address', delegatorAddress)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get delegations: ${error.message}`)

    return data.map(this.mapToDelegationInfo)
  }

  /**
   * Get delegations for a delegate
   */
  async getDelegationsForDelegate(
    projectId: string,
    delegateAddress: string
  ): Promise<DelegationInfo[]> {
    const { data, error } = await supabase
      .from('xrpl_delegate_permissions')
      .select('*')
      .eq('project_id', projectId)
      .eq('delegate_address', delegateAddress)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get delegations: ${error.message}`)

    return data.map(this.mapToDelegationInfo)
  }

  /**
   * Record delegation usage
   */
  async recordDelegationUsage(
    delegationId: string,
    transactionType: string,
    transactionHash: string,
    permissionUsed: string,
    result: string,
    errorMessage?: string,
    ledgerIndex?: number
  ): Promise<DelegateUsageRecord> {
    const { data, error } = await supabase
      .from('xrpl_delegate_usage_history')
      .insert({
        delegate_permission_id: delegationId,
        transaction_type: transactionType,
        transaction_hash: transactionHash,
        permission_used: permissionUsed,
        result,
        error_message: errorMessage,
        ledger_index: ledgerIndex
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record usage: ${error.message}`)

    return this.mapToUsageRecord(data)
  }

  /**
   * Get usage history for delegation
   */
  async getUsageHistory(
    delegationId: string,
    limit: number = 100
  ): Promise<DelegateUsageRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_delegate_usage_history')
      .select('*')
      .eq('delegate_permission_id', delegationId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to get usage history: ${error.message}`)

    return data.map(this.mapToUsageRecord)
  }

  /**
   * Get active delegations count
   */
  async getActiveDelegationsCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from('xrpl_delegate_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'active')

    if (error) throw new Error(`Failed to count delegations: ${error.message}`)

    return count || 0
  }

  /**
   * Map database row to DelegationInfo
   */
  private mapToDelegationInfo(data: any): DelegationInfo {
    return {
      id: data.id,
      projectId: data.project_id,
      delegatorAddress: data.delegator_address,
      delegateAddress: data.delegate_address,
      permissions: data.permissions,
      status: data.status,
      setupTransactionHash: data.setup_transaction_hash,
      revocationTransactionHash: data.revocation_transaction_hash || undefined,
      createdAt: new Date(data.created_at),
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : undefined,
      updatedAt: new Date(data.updated_at)
    }
  }

  /**
   * Map database row to DelegateUsageRecord
   */
  private mapToUsageRecord(data: any): DelegateUsageRecord {
    return {
      id: data.id,
      delegatePermissionId: data.delegate_permission_id,
      transactionType: data.transaction_type,
      transactionHash: data.transaction_hash,
      permissionUsed: data.permission_used,
      result: data.result,
      errorMessage: data.error_message || undefined,
      ledgerIndex: data.ledger_index || undefined,
      timestamp: new Date(data.timestamp)
    }
  }
}
