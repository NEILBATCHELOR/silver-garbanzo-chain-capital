/**
 * XRPL Escrow Database Service
 * Handles database operations for escrow records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface EscrowRecord {
  id?: string;
  project_id: string;
  owner_address: string;
  destination_address: string;
  amount: string;
  sequence: number;
  condition?: string;
  fulfillment?: string;
  finish_after?: string;
  cancel_after?: string;
  destination_tag?: number;
  status?: string;
  creation_transaction_hash: string;
  created_at?: string;
  updated_at?: string;
}

export class XRPLEscrowDatabaseService {
  /**
   * Create escrow record in database
   */
  static async createEscrow(record: EscrowRecord) {
    const { data, error } = await supabase
      .from('xrpl_escrows')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
    return data;
  }

  /**
   * Get escrow by owner and sequence
   */
  static async getEscrow(
    projectId: string,
    ownerAddress: string,
    sequence: number
  ) {
    const { data, error } = await supabase
      .from('xrpl_escrows')
      .select('*')
      .eq('project_id', projectId)
      .eq('owner_address', ownerAddress)
      .eq('sequence', sequence)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get escrow: ${error.message}`);
    }
    return data;
  }

  /**
   * Get escrows for a project
   */
  static async getEscrows(projectId: string, address?: string) {
    let query = supabase
      .from('xrpl_escrows')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (address) {
      query = query.or(`owner_address.eq.${address},destination_address.eq.${address}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get escrows: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update escrow status
   */
  static async updateEscrowStatus(
    projectId: string,
    ownerAddress: string,
    sequence: number,
    status: 'active' | 'finished' | 'canceled',
    transactionHash?: string
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'finished' && transactionHash) {
      updates.finish_transaction_hash = transactionHash;
      updates.finished_at = new Date().toISOString();
    } else if (status === 'canceled' && transactionHash) {
      updates.cancel_transaction_hash = transactionHash;
      updates.canceled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('xrpl_escrows')
      .update(updates)
      .eq('project_id', projectId)
      .eq('owner_address', ownerAddress)
      .eq('sequence', sequence)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update escrow status: ${error.message}`);
    }
    return data;
  }
}
