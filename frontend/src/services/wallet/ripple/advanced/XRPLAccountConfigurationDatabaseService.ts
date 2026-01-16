/**
 * XRPL Account Configuration Database Service
 * Handles database persistence for account configurations
 */

import { supabase } from '@/infrastructure/database/client'
import type {
  AccountConfiguration,
  AccountConfigurationParams,
  AccountConfigChange,
  BlackholeAccountInfo,
  BlackholeAccountParams,
  AccountFlags,
  AccountSettings,
  SignerEntry
} from './types'

export class XRPLAccountConfigurationDatabaseService {
  /**
   * Save account configuration
   */
  async saveConfiguration(
    projectId: string,
    config: AccountConfigurationParams,
    transactionHash: string
  ): Promise<AccountConfiguration> {
    const { data, error } = await supabase
      .from('xrpl_account_configurations')
      .insert({
        project_id: projectId,
        account_address: config.accountAddress,
        flags: config.flags ? this.flattenFlags(config.flags as AccountFlags) : {},
        settings: config.settings ? this.flattenSettings(config.settings) : {},
        signer_quorum: config.signerQuorum || 0,
        signer_list: config.signerList || [],
        last_updated_transaction_hash: transactionHash
      })
      .select()
      .single()

    if (error) throw error

    return this.mapToConfiguration(data)
  }

  /**
   * Update account configuration
   */
  async updateConfiguration(
    accountAddress: string,
    updates: Partial<AccountConfigurationParams>,
    transactionHash: string
  ): Promise<AccountConfiguration> {
    const updateData: any = {
      last_updated_transaction_hash: transactionHash,
      updated_at: new Date().toISOString()
    }

    if (updates.flags) {
      updateData.flags = this.flattenFlags(updates.flags as AccountFlags)
    }

    if (updates.settings) {
      updateData.settings = this.flattenSettings(updates.settings)
    }

    if (updates.signerQuorum !== undefined) {
      updateData.signer_quorum = updates.signerQuorum
    }

    if (updates.signerList) {
      updateData.signer_list = updates.signerList
    }

    const { data, error } = await supabase
      .from('xrpl_account_configurations')
      .update(updateData)
      .eq('account_address', accountAddress)
      .select()
      .single()

    if (error) throw error

    return this.mapToConfiguration(data)
  }

  /**
   * Get account configuration
   */
  async getConfiguration(accountAddress: string): Promise<AccountConfiguration | null> {
    const { data, error } = await supabase
      .from('xrpl_account_configurations')
      .select('*')
      .eq('account_address', accountAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return this.mapToConfiguration(data)
  }

  /**
   * Get configurations by project
   */
  async getConfigurationsByProject(projectId: string): Promise<AccountConfiguration[]> {
    const { data, error } = await supabase
      .from('xrpl_account_configurations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(d => this.mapToConfiguration(d))
  }

  /**
   * Log configuration change
   */
  async logChange(
    accountConfigId: string,
    change: Omit<AccountConfigChange, 'id' | 'accountConfigId' | 'changedAt'>
  ): Promise<AccountConfigChange> {
    const { data, error } = await supabase
      .from('xrpl_account_config_changes')
      .insert({
        account_config_id: accountConfigId,
        change_type: change.changeType,
        field_changed: change.fieldChanged,
        old_value: change.oldValue,
        new_value: change.newValue,
        transaction_hash: change.transactionHash,
        ledger_index: change.ledgerIndex,
        changed_by: change.changedBy
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      accountConfigId: data.account_config_id,
      changeType: data.change_type,
      fieldChanged: data.field_changed,
      oldValue: data.old_value,
      newValue: data.new_value,
      transactionHash: data.transaction_hash,
      ledgerIndex: data.ledger_index,
      changedBy: data.changed_by,
      changedAt: new Date(data.changed_at)
    }
  }

  /**
   * Get change history for account
   */
  async getChangeHistory(accountAddress: string): Promise<AccountConfigChange[]> {
    const { data, error } = await supabase
      .from('xrpl_account_config_changes')
      .select(`
        *,
        xrpl_account_configurations!inner(account_address)
      `)
      .eq('xrpl_account_configurations.account_address', accountAddress)
      .order('changed_at', { ascending: false })

    if (error) throw error

    return data.map(d => ({
      id: d.id,
      accountConfigId: d.account_config_id,
      changeType: d.change_type,
      fieldChanged: d.field_changed,
      oldValue: d.old_value,
      newValue: d.new_value,
      transactionHash: d.transaction_hash,
      ledgerIndex: d.ledger_index,
      changedBy: d.changed_by,
      changedAt: new Date(d.changed_at)
    }))
  }

  /**
   * Save blackhole account info
   */
  async saveBlackholeInfo(
    projectId: string,
    params: BlackholeAccountParams,
    setRegularKeyHash: string,
    disableMasterKeyHash: string
  ): Promise<BlackholeAccountInfo> {
    const { data, error } = await supabase
      .from('xrpl_blackhole_accounts')
      .insert({
        project_id: projectId,
        account_address: params.accountAddress,
        blackhole_address: 'rrrrrrrrrrrrrrrrrrrrBZbvji',
        set_regular_key_hash: setRegularKeyHash,
        disable_master_key_hash: disableMasterKeyHash,
        is_blackholed: true,
        reason: params.reason
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      blackholeAddress: data.blackhole_address,
      setRegularKeyHash: data.set_regular_key_hash,
      disableMasterKeyHash: data.disable_master_key_hash,
      isBlackholed: data.is_blackholed,
      verificationLedgerIndex: data.verification_ledger_index,
      reason: data.reason,
      blackholedAt: new Date(data.blackholed_at)
    }
  }

  /**
   * Map database record to AccountConfiguration
   */
  private mapToConfiguration(data: any): AccountConfiguration {
    const flags: AccountFlags = {
      requireDestinationTag: data.flags?.require_destination_tag || false,
      requireAuthorization: data.flags?.require_authorization || false,
      disallowIncomingXRP: data.flags?.disallow_incoming_xrp || false,
      disableMasterKey: data.flags?.disable_master_key || false,
      noFreeze: data.flags?.no_freeze || false,
      globalFreeze: data.flags?.global_freeze || false,
      defaultRipple: data.flags?.default_ripple || false,
      depositAuth: data.flags?.deposit_auth || false,
      disallowIncomingNFTokenOffer: data.flags?.disallow_incoming_nftoken_offer || false,
      disallowIncomingCheck: data.flags?.disallow_incoming_check || false,
      disallowIncomingPayChan: data.flags?.disallow_incoming_pay_chan || false,
      disallowIncomingTrustline: data.flags?.disallow_incoming_trustline || false,
      allowTrustLineClawback: data.flags?.allow_trustline_clawback || false
    }

    const settings: AccountSettings = {
      domain: data.settings?.domain,
      emailHash: data.settings?.email_hash,
      messageKey: data.settings?.message_key,
      tickSize: data.settings?.tick_size,
      transferRate: data.settings?.transfer_rate
    }

    return {
      id: data.id,
      projectId: data.project_id,
      accountAddress: data.account_address,
      flags,
      settings,
      signerQuorum: data.signer_quorum,
      signerList: data.signer_list || [],
      lastUpdatedTransactionHash: data.last_updated_transaction_hash,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  /**
   * Flatten flags object for database storage
   */
  private flattenFlags(flags: AccountFlags): Record<string, boolean> {
    return {
      require_destination_tag: flags.requireDestinationTag,
      require_authorization: flags.requireAuthorization,
      disallow_incoming_xrp: flags.disallowIncomingXRP,
      disable_master_key: flags.disableMasterKey,
      no_freeze: flags.noFreeze,
      global_freeze: flags.globalFreeze,
      default_ripple: flags.defaultRipple,
      deposit_auth: flags.depositAuth,
      disallow_incoming_nftoken_offer: flags.disallowIncomingNFTokenOffer,
      disallow_incoming_check: flags.disallowIncomingCheck,
      disallow_incoming_pay_chan: flags.disallowIncomingPayChan,
      disallow_incoming_trustline: flags.disallowIncomingTrustline,
      allow_trustline_clawback: flags.allowTrustLineClawback
    }
  }

  /**
   * Flatten settings object for database storage
   */
  private flattenSettings(settings: AccountSettings): Record<string, any> {
    return {
      domain: settings.domain,
      email_hash: settings.emailHash,
      message_key: settings.messageKey,
      tick_size: settings.tickSize,
      transfer_rate: settings.transferRate
    }
  }
}
