/**
 * XRPL Price Oracle Database Service
 * Handles database operations for price oracle records
 * Ensures project_id is included in all database operations for multi-tenancy
 */

import { supabase } from '@/infrastructure/database/client';

export interface PriceOracleRecord {
  id?: string;
  project_id: string;
  oracle_address: string;
  oracle_document_id: number;
  provider: string;
  uri?: string;
  asset_class: string;
  status?: string;
  last_update_time?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OraclePriceDataRecord {
  id?: string;
  project_id: string;
  oracle_id: string;
  base_asset: string;
  quote_asset: string;
  asset_price: number;
  scale: number;
  recorded_at?: string;
}

export class XRPLPriceOracleDatabaseService {
  /**
   * Create price oracle record in database
   */
  static async createOracle(record: PriceOracleRecord) {
    const { data, error } = await supabase
      .from('xrpl_price_oracles')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create price oracle: ${error.message}`);
    }
    return data;
  }

  /**
   * Get oracle by address and document ID
   */
  static async getOracle(
    projectId: string,
    oracleAddress: string,
    documentId: number
  ) {
    const { data, error } = await supabase
      .from('xrpl_price_oracles')
      .select('*')
      .eq('project_id', projectId)
      .eq('oracle_address', oracleAddress)
      .eq('oracle_document_id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get oracle: ${error.message}`);
    }
    return data;
  }

  /**
   * Get oracles for a project
   */
  static async getOracles(projectId: string, oracleAddress?: string) {
    let query = supabase
      .from('xrpl_price_oracles')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (oracleAddress) {
      query = query.eq('oracle_address', oracleAddress);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get oracles: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update oracle last update time
   */
  static async updateOracleLastUpdate(
    projectId: string,
    oracleAddress: string,
    documentId: number,
    lastUpdateTime: number
  ) {
    const { data, error } = await supabase
      .from('xrpl_price_oracles')
      .update({
        last_update_time: lastUpdateTime,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('oracle_address', oracleAddress)
      .eq('oracle_document_id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update oracle: ${error.message}`);
    }
    return data;
  }

  /**
   * Update oracle status
   */
  static async updateOracleStatus(
    projectId: string,
    oracleAddress: string,
    documentId: number,
    status: 'active' | 'inactive' | 'deleted'
  ) {
    const { data, error } = await supabase
      .from('xrpl_price_oracles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('oracle_address', oracleAddress)
      .eq('oracle_document_id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update oracle status: ${error.message}`);
    }
    return data;
  }

  /**
   * Record price data point
   */
  static async recordPriceData(record: OraclePriceDataRecord) {
    const { data, error } = await supabase
      .from('xrpl_oracle_price_data')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record price data: ${error.message}`);
    }
    return data;
  }

  /**
   * Get latest price data for an oracle
   */
  static async getLatestPriceData(
    projectId: string,
    oracleId: string,
    baseAsset?: string,
    quoteAsset?: string
  ) {
    let query = supabase
      .from('xrpl_oracle_price_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('oracle_id', oracleId)
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (baseAsset) {
      query = query.eq('base_asset', baseAsset);
    }
    if (quoteAsset) {
      query = query.eq('quote_asset', quoteAsset);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get latest price data: ${error.message}`);
    }
    return data?.[0] || null;
  }

  /**
   * Get price history for an oracle
   */
  static async getPriceHistory(
    projectId: string,
    oracleId: string,
    baseAsset: string,
    quoteAsset: string,
    limit: number = 100
  ) {
    const { data, error } = await supabase
      .from('xrpl_oracle_price_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('oracle_id', oracleId)
      .eq('base_asset', baseAsset)
      .eq('quote_asset', quoteAsset)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get price history: ${error.message}`);
    }
    return data || [];
  }
}
