/**
 * XRPL Payment Channel Database Service
 * Handles database operations for payment channel records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface PaymentChannelRecord {
  id?: string;
  project_id: string;
  channel_id: string;
  source_address: string;
  destination_address: string;
  amount: string;
  balance: string;
  settle_delay: number;
  public_key: string;
  cancel_after?: string;
  destination_tag?: number;
  status?: string;
  creation_transaction_hash: string;
  created_at?: string;
  updated_at?: string;
}

export class XRPLPaymentChannelDatabaseService {
  /**
   * Create payment channel record in database
   */
  static async createChannel(record: PaymentChannelRecord) {
    const { data, error } = await supabase
      .from('xrpl_payment_channels')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment channel: ${error.message}`);
    }
    return data;
  }

  /**
   * Get payment channel by ID
   */
  static async getChannel(projectId: string, channelId: string) {
    const { data, error } = await supabase
      .from('xrpl_payment_channels')
      .select('*')
      .eq('project_id', projectId)
      .eq('channel_id', channelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get payment channel: ${error.message}`);
    }
    return data;
  }

  /**
   * Get payment channels for a project
   */
  static async getChannels(projectId: string, address?: string) {
    let query = supabase
      .from('xrpl_payment_channels')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (address) {
      query = query.or(`source_address.eq.${address},destination_address.eq.${address}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get payment channels: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update channel balance
   */
  static async updateChannelBalance(
    projectId: string,
    channelId: string,
    balance: string
  ) {
    const { data, error } = await supabase
      .from('xrpl_payment_channels')
      .update({
        balance,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update channel balance: ${error.message}`);
    }
    return data;
  }

  /**
   * Update channel status
   */
  static async updateChannelStatus(
    projectId: string,
    channelId: string,
    status: 'active' | 'closed'
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'closed') {
      updates.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('xrpl_payment_channels')
      .update(updates)
      .eq('project_id', projectId)
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update channel status: ${error.message}`);
    }
    return data;
  }
}
