/**
 * XRPL Deposit Pre-Authorization Database Service
 * Manages deposit authorization records in the database
 */

import { supabase } from '@/infrastructure/database/client';
import {
  DepositAuthorizationRecord,
  DepositAuthHistoryRecord,
  DepositAuthRequirementsRecord
} from './deposit-auth-types';

export class XRPLDepositPreAuthDatabaseService {
  /**
   * Create a new deposit authorization record
   */
  static async createAuthorization(
    record: DepositAuthorizationRecord
  ): Promise<DepositAuthorizationRecord> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorizations')
      .insert({
        project_id: record.project_id,
        account_address: record.account_address,
        authorized_address: record.authorized_address,
        authorization_type: record.authorization_type,
        credential_issuer: record.credential_issuer,
        credential_type: record.credential_type,
        is_active: record.is_active,
        authorization_transaction_hash: record.authorization_transaction_hash,
        authorized_by: record.authorized_by,
        notes: record.notes,
        metadata: record.metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create authorization: ${error.message}`);
    }

    return data;
  }

  /**
   * Revoke an authorization
   */
  static async revokeAuthorization(
    authorizationId: string,
    transactionHash: string,
    revokedBy?: string,
    reason?: string
  ): Promise<DepositAuthorizationRecord> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorizations')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_transaction_hash: transactionHash,
        revoked_by: revokedBy
      })
      .eq('id', authorizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to revoke authorization: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all active authorizations for an account
   */
  static async getActiveAuthorizations(
    projectId: string,
    accountAddress: string
  ): Promise<DepositAuthorizationRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorizations')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .eq('is_active', true)
      .order('authorized_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get active authorizations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all authorizations (active and revoked) for an account
   */
  static async getAllAuthorizations(
    projectId: string,
    accountAddress: string
  ): Promise<DepositAuthorizationRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorizations')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .order('authorized_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all authorizations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if an address is authorized
   */
  static async isAuthorized(
    projectId: string,
    accountAddress: string,
    depositorAddress: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorizations')
      .select('id')
      .eq('project_id', projectId)
      .eq('account_address', accountAddress)
      .eq('authorized_address', depositorAddress)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check authorization: ${error.message}`);
    }

    return data !== null;
  }

  /**
   * Record an authorization history event
   */
  static async recordHistoryEvent(
    record: DepositAuthHistoryRecord
  ): Promise<DepositAuthHistoryRecord> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorization_history')
      .insert({
        authorization_id: record.authorization_id,
        action: record.action,
        transaction_hash: record.transaction_hash,
        performed_by: record.performed_by,
        notes: record.notes
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record history event: ${error.message}`);
    }

    return data;
  }

  /**
   * Get authorization history
   */
  static async getHistory(
    authorizationId: string
  ): Promise<DepositAuthHistoryRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_deposit_authorization_history')
      .select('*')
      .eq('authorization_id', authorizationId)
      .order('performed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update or create deposit auth requirements
   */
  static async upsertRequirements(
    record: DepositAuthRequirementsRecord
  ): Promise<DepositAuthRequirementsRecord> {
    const { data, error } = await supabase
      .from('xrpl_deposit_auth_requirements')
      .upsert({
        project_id: record.project_id,
        account_address: record.account_address,
        deposit_auth_enabled: record.deposit_auth_enabled,
        require_authorization: record.require_authorization,
        require_destination_tag: record.require_destination_tag,
        enabled_at: record.enabled_at,
        enabled_transaction_hash: record.enabled_transaction_hash,
        disabled_at: record.disabled_at,
        disabled_transaction_hash: record.disabled_transaction_hash,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_address'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update requirements: ${error.message}`);
    }

    return data;
  }

  /**
   * Get deposit auth requirements for an account
   */
  static async getRequirements(
    accountAddress: string
  ): Promise<DepositAuthRequirementsRecord | null> {
    const { data, error } = await supabase
      .from('xrpl_deposit_auth_requirements')
      .select('*')
      .eq('account_address', accountAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get requirements: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all accounts with deposit auth enabled for a project
   */
  static async getAccountsWithDepositAuth(
    projectId: string
  ): Promise<DepositAuthRequirementsRecord[]> {
    const { data, error } = await supabase
      .from('xrpl_deposit_auth_requirements')
      .select('*')
      .eq('project_id', projectId)
      .eq('deposit_auth_enabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get accounts with deposit auth: ${error.message}`);
    }

    return data || [];
  }
}
