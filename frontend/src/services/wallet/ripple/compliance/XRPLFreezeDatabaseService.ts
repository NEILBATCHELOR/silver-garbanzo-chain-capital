/**
 * XRPL Freeze Database Service
 * Manages freeze records in the database
 */

import { supabase } from '@/infrastructure/database/client';
import {
  FreezeEventRecord,
  FrozenTrustLineRecord,
  AccountFreezeStatusRecord
} from './freeze-types';

export class XRPLFreezeDatabaseService {
  /**
   * Record a freeze event
   */
  static async recordFreezeEvent(record: FreezeEventRecord): Promise<FreezeEventRecord> {
    const { data, error } = await supabase
      .from('xrpl_freeze_events')
      .insert({
        project_id: record.project_id,
        issuer_address: record.issuer_address,
        freeze_type: record.freeze_type,
        holder_address: record.holder_address,
        currency: record.currency,
        action: record.action,
        reason: record.reason,
        notes: record.notes,
        transaction_hash: record.transaction_hash,
        metadata: record.metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record freeze event: ${error.message}`);
    }

    return data;
  }

  /**
   * Get freeze events for a project
   */
  static async getFreezeEvents(projectId: string): Promise<FreezeEventRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_freeze_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get freeze events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Freeze a trust line
   */
  static async freezeTrustLine(record: FrozenTrustLineRecord): Promise<FrozenTrustLineRecord> {
    const { data, error } = await supabase
      .from('xrpl_frozen_trust_lines')
      .insert({
        project_id: record.project_id,
        issuer_address: record.issuer_address,
        holder_address: record.holder_address,
        currency: record.currency,
        is_frozen: true,
        freeze_reason: record.freeze_reason,
        frozen_transaction_hash: record.frozen_transaction_hash,
        frozen_by: record.frozen_by
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to freeze trust line: ${error.message}`);
    }

    return data;
  }

  /**
   * Unfreeze a trust line
   */
  static async unfreezeTrustLine(
    projectId: string,
    issuerAddress: string,
    holderAddress: string,
    currency: string,
    transactionHash: string,
    unfrozenBy?: string
  ): Promise<FrozenTrustLineRecord> {
    const { data, error } = await supabase
      .from('xrpl_frozen_trust_lines')
      .update({
        is_frozen: false,
        unfrozen_at: new Date().toISOString(),
        unfrozen_transaction_hash: transactionHash,
        unfrozen_by: unfrozenBy
      })
      .eq('project_id', projectId)
      .eq('issuer_address', issuerAddress)
      .eq('holder_address', holderAddress)
      .eq('currency', currency)
      .eq('is_frozen', true)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to unfreeze trust line: ${error.message}`);
    }

    return data;
  }

  /**
   * Get frozen trust lines for an issuer
   */
  static async getFrozenTrustLines(
    projectId: string,
    issuerAddress: string
  ): Promise<FrozenTrustLineRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_frozen_trust_lines')
      .select('*')
      .eq('project_id', projectId)
      .eq('issuer_address', issuerAddress)
      .eq('is_frozen', true)
      .order('frozen_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get frozen trust lines: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update or create account freeze status
   */
  static async upsertAccountFreezeStatus(
    record: AccountFreezeStatusRecord
  ): Promise<AccountFreezeStatusRecord> {
    const { data, error } = await supabase
      .from('xrpl_account_freeze_status')
      .upsert({
        project_id: record.project_id,
        account_address: record.account_address,
        global_freeze_enabled: record.global_freeze_enabled,
        no_freeze_enabled: record.no_freeze_enabled,
        global_freeze_set_at: record.global_freeze_set_at,
        global_freeze_set_hash: record.global_freeze_set_hash,
        global_freeze_cleared_at: record.global_freeze_cleared_at,
        global_freeze_cleared_hash: record.global_freeze_cleared_hash,
        no_freeze_set_at: record.no_freeze_set_at,
        no_freeze_set_hash: record.no_freeze_set_hash,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_address'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update account freeze status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get account freeze status
   */
  static async getAccountFreezeStatus(
    accountAddress: string
  ): Promise<AccountFreezeStatusRecord | null> {
    const { data, error } = await supabase
      .from('xrpl_account_freeze_status')
      .select('*')
      .eq('account_address', accountAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get account freeze status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all frozen accounts for a project
   */
  static async getFrozenAccounts(projectId: string): Promise<AccountFreezeStatusRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_account_freeze_status')
      .select('*')
      .eq('project_id', projectId)
      .eq('global_freeze_enabled', true)
      .order('updated_at', { ascending: false});

    if (error) {
      throw new Error(`Failed to get frozen accounts: ${error.message}`);
    }

    return data || [];
  }
}
