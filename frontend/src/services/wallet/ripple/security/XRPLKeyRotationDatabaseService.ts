/**
 * XRPL Key Rotation Database Service
 * Phase 14.2: Regular Key Management
 * Handles database operations for key rotation history, policies, and configurations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  KeyRotationHistory,
  KeyRotationPolicy,
  AccountKeyConfig,
  RotationType,
  PolicyUpdateParams,
  RotationDueAlert,
  KeyRotationStats
} from './key-rotation-types'

export class XRPLKeyRotationDatabaseService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }

  /**
   * Save rotation history entry
   */
  async saveRotationHistory(
    history: Omit<KeyRotationHistory, 'id' | 'rotatedAt'>
  ): Promise<KeyRotationHistory> {
    const { data, error } = await this.supabase
      .from('xrpl_key_rotation_history')
      .insert({
        project_id: history.projectId,
        account_address: history.accountAddress,
        rotation_type: history.rotationType,
        old_regular_key: history.oldRegularKey,
        new_regular_key: history.newRegularKey,
        master_key_disabled: history.masterKeyDisabled,
        transaction_hash: history.transactionHash,
        ledger_index: history.ledgerIndex,
        notes: history.notes,
        rotation_reason: history.rotationReason
      })
      .select()
      .single()

    if (error) throw error
    return this.mapHistoryFromDB(data)
  }

  /**
   * Get rotation history for account
   */
  async getRotationHistory(
    projectId: string,
    accountAddress: string
  ): Promise<KeyRotationHistory[]> {
    const { data, error } = await this.supabase
      .from('xrpl_key_rotation_history')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .order('rotated_at', { ascending: false })

    if (error) throw error
    return data.map(this.mapHistoryFromDB)
  }

  /**
   * Create or update rotation policy
   */
  async upsertPolicy(
    policy: Omit<KeyRotationPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<KeyRotationPolicy> {
    const { data, error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .upsert(
        {
          project_id: policy.projectId,
          account_address: policy.accountAddress,
          rotation_interval_days: policy.rotationIntervalDays,
          last_rotation: policy.lastRotation?.toISOString(),
          next_rotation_due: policy.nextRotationDue?.toISOString(),
          auto_rotation_enabled: policy.autoRotationEnabled,
          notification_days_before: policy.notificationDaysBefore,
          notification_sent: policy.notificationSent
        },
        { onConflict: 'project_id,account_address' }
      )
      .select()
      .single()

    if (error) throw error
    return this.mapPolicyFromDB(data)
  }

  /**
   * Get policy for account
   */
  async getPolicy(
    projectId: string,
    accountAddress: string
  ): Promise<KeyRotationPolicy | null> {
    const { data, error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return this.mapPolicyFromDB(data)
  }

  /**
   * Update policy
   */
  async updatePolicy(
    policyId: string,
    updates: PolicyUpdateParams
  ): Promise<void> {
    const updateData: any = {}

    if (updates.rotationIntervalDays !== undefined) {
      updateData.rotation_interval_days = updates.rotationIntervalDays
    }
    if (updates.autoRotationEnabled !== undefined) {
      updateData.auto_rotation_enabled = updates.autoRotationEnabled
    }
    if (updates.notificationDaysBefore !== undefined) {
      updateData.notification_days_before = updates.notificationDaysBefore
    }

    const { error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .update(updateData)
      .eq('id', policyId)

    if (error) throw error
  }

  /**
   * Update last rotation timestamp in policy
   */
  async updateLastRotation(
    projectId: string,
    accountAddress: string,
    rotationDate: Date
  ): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .update({
        last_rotation: rotationDate.toISOString(),
        notification_sent: false
      })
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)

    if (error) throw error
  }

  /**
   * Get accounts with rotation due soon
   */
  async getRotationsDue(
    projectId: string,
    daysAhead: number = 7
  ): Promise<RotationDueAlert[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const { data, error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .select('*')
      .eq('project_id', projectId)
      .lte('next_rotation_due', futureDate.toISOString())
      .eq('notification_sent', false)

    if (error) throw error

    return data.map((policy: any) => ({
      accountAddress: policy.account_address,
      policyId: policy.id,
      nextRotationDue: new Date(policy.next_rotation_due),
      daysUntilDue: Math.ceil(
        (new Date(policy.next_rotation_due).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      ),
      autoRotationEnabled: policy.auto_rotation_enabled
    }))
  }

  /**
   * Mark rotation notification as sent
   */
  async markNotificationSent(policyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .update({ notification_sent: true })
      .eq('id', policyId)

    if (error) throw error
  }

  /**
   * Save or update account key configuration
   */
  async upsertAccountConfig(
    config: Omit<AccountKeyConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastVerified'>
  ): Promise<AccountKeyConfig> {
    const { data, error } = await this.supabase
      .from('xrpl_account_key_config')
      .upsert(
        {
          project_id: config.projectId,
          account_address: config.accountAddress,
          has_regular_key: config.hasRegularKey,
          current_regular_key: config.currentRegularKey,
          master_key_disabled: config.masterKeyDisabled
        },
        { onConflict: 'project_id,account_address' }
      )
      .select()
      .single()

    if (error) throw error
    return this.mapConfigFromDB(data)
  }

  /**
   * Get account key configuration
   */
  async getAccountConfig(
    projectId: string,
    accountAddress: string
  ): Promise<AccountKeyConfig | null> {
    const { data, error } = await this.supabase
      .from('xrpl_account_key_config')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return this.mapConfigFromDB(data)
  }

  /**
   * Get key rotation statistics
   */
  async getRotationStats(projectId: string): Promise<KeyRotationStats> {
    // Get total rotations
    const { count: totalRotations } = await this.supabase
      .from('xrpl_key_rotation_history')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    // Get last rotation date
    const { data: lastRotation } = await this.supabase
      .from('xrpl_key_rotation_history')
      .select('rotated_at')
      .eq('project_id', projectId)
      .order('rotated_at', { ascending: false })
      .limit(1)
      .single()

    // Get accounts with policies
    const { count: accountsWithPolicies } = await this.supabase
      .from('xrpl_key_rotation_policies')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    // Get accounts with regular keys
    const { count: accountsWithRegularKeys } = await this.supabase
      .from('xrpl_account_key_config')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('has_regular_key', true)

    // Get accounts with disabled master keys
    const { count: accountsWithDisabledMaster } = await this.supabase
      .from('xrpl_account_key_config')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('master_key_disabled', true)

    return {
      totalRotations: totalRotations || 0,
      lastRotationDate: lastRotation ? new Date(lastRotation.rotated_at) : undefined,
      accountsWithPolicies: accountsWithPolicies || 0,
      accountsWithRegularKeys: accountsWithRegularKeys || 0,
      accountsWithDisabledMaster: accountsWithDisabledMaster || 0
    }
  }

  /**
   * Map database history to KeyRotationHistory type
   */
  private mapHistoryFromDB(data: any): KeyRotationHistory {
    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      rotationType: data.rotation_type as RotationType,
      oldRegularKey: data.old_regular_key,
      newRegularKey: data.new_regular_key,
      masterKeyDisabled: data.master_key_disabled,
      transactionHash: data.transaction_hash,
      ledgerIndex: data.ledger_index,
      rotatedAt: new Date(data.rotated_at),
      notes: data.notes,
      rotationReason: data.rotation_reason
    }
  }

  /**
   * Map database policy to KeyRotationPolicy type
   */
  private mapPolicyFromDB(data: any): KeyRotationPolicy {
    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      rotationIntervalDays: data.rotation_interval_days,
      lastRotation: data.last_rotation ? new Date(data.last_rotation) : undefined,
      nextRotationDue: data.next_rotation_due
        ? new Date(data.next_rotation_due)
        : undefined,
      autoRotationEnabled: data.auto_rotation_enabled,
      notificationDaysBefore: data.notification_days_before,
      notificationSent: data.notification_sent,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  /**
   * Map database config to AccountKeyConfig type
   */
  private mapConfigFromDB(data: any): AccountKeyConfig {
    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      hasRegularKey: data.has_regular_key,
      currentRegularKey: data.current_regular_key,
      masterKeyDisabled: data.master_key_disabled,
      lastVerified: new Date(data.last_verified),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}
