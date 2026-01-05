/**
 * Deployment Recording Service
 * 
 * Records contract deployments, upgrades, and verification status
 * to contract_masters database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DeploymentRecord, VerificationUpdate } from '../../types/trade-finance/deployment-records';

// Use any for now since Database types are in frontend
// TODO: Share types between frontend and backend
type ContractMaster = any;
type ContractMasterInsert = any;
type ContractMasterUpdate = any;

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface UpgradeHistoryEntry {
  version: string;
  implementation: string;
  upgraded_at: string;
  upgraded_by: string;
  reason: string;
  tx_hash: string;
}

export class DeploymentRecordingService {
  /**
   * Record a new contract deployment
   */
  static async recordDeployment(
    record: DeploymentRecord
  ): Promise<{ success: boolean; data?: ContractMaster; error?: string }> {
    try {
      // Check if contract already exists
      const { data: existing } = await supabase
        .from('contract_masters')
        .select('id')
        .eq('network', record.network)
        .eq('environment', record.environment)
        .eq('contract_address', record.contract_address)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: `Contract already exists at ${record.contract_address}`,
        };
      }

      // Insert new deployment
      const insertData: ContractMasterInsert = {
        network: record.network,
        environment: record.environment,
        contract_type: record.contract_type,
        contract_address: record.contract_address,
        proxy_address: record.proxy_address || null,
        implementation_address: record.implementation_address || null,
        version: record.version,
        abi: record.abi || null,
        abi_hash: record.abi_hash || '',
        deployed_by: record.deployed_by,
        deployment_tx_hash: record.deployment_tx_hash,
        deployed_at: record.deployed_at ? new Date(record.deployed_at).toISOString() : new Date().toISOString(),
        is_active: true,
        is_template: record.is_template !== undefined ? record.is_template : true,
        initial_owner: record.initial_owner,
        verification_status: record.verification_status || 'unverified',
        verification_url: record.verification_url || null,
        initialization_params: record.initialization_params as any,
        deployment_data: record.deployment_data as any,
        contract_details: record.contract_details as any,
        upgrade_history: record.upgrade_history || null,
      };

      const { data, error } = await supabase
        .from('contract_masters')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Record UUPS contract deployment (proxy + implementation)
   */
  static async recordUpgradeableDeployment(params: {
    network: string;
    environment: string;
    contract_type: string;
    proxy_address: string;
    implementation_address: string;
    version: string;
    abi?: any;
    deployed_by?: string;
    deployment_tx_hash?: string;
    initialization_params?: any;
    category?: string;
  }): Promise<{ success: boolean; data?: ContractMaster; error?: string }> {
    const deployedBy = params.deployed_by || 'unknown';
    const txHash = params.deployment_tx_hash || '';
    const category = params.category || 'infrastructure';
    
    const record: DeploymentRecord = {
      network: params.network,
      environment: params.environment,
      contract_type: params.contract_type,
      contract_address: params.proxy_address,
      proxy_address: params.proxy_address,
      implementation_address: params.implementation_address,
      version: params.version,
      abi: params.abi || [],
      abi_hash: '',
      deployed_by: deployedBy,
      deployment_tx_hash: txHash,
      deployed_at: new Date(),
      initial_owner: deployedBy,
      initialization_params: params.initialization_params || {},
      deployment_data: {
        compiler_version: '0.8.20',
        optimization: true,
        runs: 200,
        chain_id: 17000, // Hoodi testnet
        deployment_timestamp: new Date().toISOString(),
      },
      contract_details: {
        upgrade_pattern: 'UUPS',
        features: ['upgradeable', 'uups', 'ownable'],
        category: category as any,
      },
      upgrade_history: [
        {
          version: params.version,
          implementation: params.implementation_address,
          upgraded_at: new Date().toISOString(),
          upgraded_by: deployedBy,
          reason: 'Initial deployment',
          tx_hash: txHash,
        },
      ],
    };

    return this.recordDeployment(record);
  }

  /**
   * Record contract upgrade
   */
  static async recordUpgrade(params: {
    proxy_address: string;
    network: string;
    environment: string;
    new_implementation: string;
    new_version: string;
    upgraded_by: string;
    reason: string;
    tx_hash: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing contract
      const { data: contract, error: fetchError } = await supabase
        .from('contract_masters')
        .select('deployment_data, version')
        .eq('network', params.network)
        .eq('environment', params.environment)
        .eq('contract_address', params.proxy_address)
        .single();

      if (fetchError || !contract) {
        return { success: false, error: 'Contract not found' };
      }

      // Get existing upgrade history
      const upgradeHistory = (contract.deployment_data as any)?.upgrade_history || [];

      // Add new upgrade entry
      const newEntry: UpgradeHistoryEntry = {
        version: params.new_version,
        implementation: params.new_implementation,
        upgraded_at: new Date().toISOString(),
        upgraded_by: params.upgraded_by,
        reason: params.reason,
        tx_hash: params.tx_hash,
      };

      upgradeHistory.push(newEntry);

      // Update contract record
      const { error: updateError } = await supabase
        .from('contract_masters')
        .update({
          version: params.new_version,
          deployment_data: {
            ...(contract.deployment_data as any),
            upgrade_history: upgradeHistory,
          },
        })
        .eq('network', params.network)
        .eq('environment', params.environment)
        .eq('contract_address', params.proxy_address);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Update contract verification status
   */
  static async updateVerificationStatus(
    params: VerificationUpdate
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('contract_masters')
        .update({
          verification_status: params.verification_status,
        })
        .eq('network', params.network)
        .eq('environment', params.environment)
        .eq('contract_address', params.contract_address);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch record multiple deployments
   */
  static async recordBatchDeployments(
    records: DeploymentRecord[]
  ): Promise<{
    success: boolean;
    results: Array<{ success: boolean; contract_type: string; error?: string }>;
  }> {
    const results = await Promise.all(
      records.map(async (record) => {
        const result = await this.recordDeployment(record);
        return {
          success: result.success,
          contract_type: record.contract_type,
          error: result.error,
        };
      })
    );

    const allSuccess = results.every((r) => r.success);

    return {
      success: allSuccess,
      results,
    };
  }

  /**
   * Get deployment by contract type
   */
  static async getDeployment(
    contract_type: string,
    network: string = 'hoodi',
    environment: string = 'testnet'
  ): Promise<{ success: boolean; data?: ContractMaster; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('contract_type', contract_type)
        .eq('network', network)
        .eq('environment', environment)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all deployments for a category
   */
  static async getDeploymentsByCategory(
    category: string,
    network: string = 'hoodi',
    environment: string = 'testnet'
  ): Promise<{ success: boolean; data?: ContractMaster[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', network)
        .eq('environment', environment)
        .eq('is_active', true)
        .contains('deployment_data', { category });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Deactivate old contract deployment
   */
  static async deactivateContract(
    contract_address: string,
    network: string,
    environment: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('contract_masters')
        .update({
          is_active: false,
          deprecated_at: new Date().toISOString(),
        })
        .eq('network', network)
        .eq('environment', environment)
        .eq('contract_address', contract_address);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance for convenience
export const deploymentRecordingService = DeploymentRecordingService;
