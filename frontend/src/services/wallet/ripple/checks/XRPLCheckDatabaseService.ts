/**
 * XRPL Check Database Service
 * Handles database operations for check records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface CheckRecord {
  id?: string;
  project_id: string;
  check_id: string;
  sender_address: string;
  destination_address: string;
  send_max: string;
  currency_code?: string;
  issuer_address?: string;
  destination_tag?: number;
  expiration?: string;
  invoice_id?: string;
  status?: string;
  creation_transaction_hash: string;
  created_at?: string;
  updated_at?: string;
}

export class XRPLCheckDatabaseService {
  /**
   * Create check record in database
   */
  static async createCheck(record: CheckRecord) {
    const { data, error } = await supabase
      .from('xrpl_checks')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create check: ${error.message}`);
    }
    return data;
  }

  /**
   * Get check by ID
   */
  static async getCheck(projectId: string, checkId: string) {
    const { data, error } = await supabase
      .from('xrpl_checks')
      .select('*')
      .eq('project_id', projectId)
      .eq('check_id', checkId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get check: ${error.message}`);
    }
    return data;
  }

  /**
   * Get checks for a project
   */
  static async getChecks(projectId: string, address?: string) {
    let query = supabase
      .from('xrpl_checks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (address) {
      query = query.or(`sender_address.eq.${address},destination_address.eq.${address}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get checks: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update check status
   */
  static async updateCheckStatus(
    projectId: string,
    checkId: string,
    status: 'active' | 'cashed' | 'canceled',
    transactionHash?: string,
    cashedAmount?: string
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'cashed' && transactionHash) {
      updates.cash_transaction_hash = transactionHash;
      updates.cashed_at = new Date().toISOString();
      if (cashedAmount) {
        updates.cashed_amount = cashedAmount;
      }
    } else if (status === 'canceled' && transactionHash) {
      updates.cancel_transaction_hash = transactionHash;
      updates.canceled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('xrpl_checks')
      .update(updates)
      .eq('project_id', projectId)
      .eq('check_id', checkId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update check status: ${error.message}`);
    }
    return data;
  }
}
