/**
 * Database Service for Contract Deployments
 * Handles inserting/updating contract_masters table
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import {
  ContractMasterRecord,
  ContractType,
  DeploymentResult,
  ContractArtifact,
} from './types';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Insert or update contract_masters record
   */
  async upsertContractMaster(
    deployment: DeploymentResult,
    artifact: ContractArtifact,
    sourceCodeData: { sourceCode: string; licenseType: string; contractName: string } | null,
    network: string,
    environment: string,
    deployedBy: string,
    version: string = '1.0.0'
  ): Promise<void> {
    if (!deployment.success || !deployment.address) {
      throw new Error('Cannot record failed deployment');
    }

    const abiHash = this.calculateAbiHash(artifact.abi);

    // Extract metadata from artifact
    const metadata = artifact.metadata;
    const compilerVersion = metadata?.compiler?.version || '0.8.28+commit.7893614a';
    const evmVersion = metadata?.settings?.evmVersion || 'paris';
    const optimizationUsed = metadata?.settings?.optimizer?.enabled ?? true;
    const runs = metadata?.settings?.optimizer?.runs ?? 200;

    const record: ContractMasterRecord = {
      network,
      environment,
      contract_type: deployment.contractType,
      contract_address: deployment.address,
      version,
      abi_version: '1.0.0',
      abi: artifact.abi,
      abi_hash: abiHash,
      deployment_tx_hash: deployment.transactionHash,
      is_active: true,
      deployed_by: deployedBy,
      deployment_data: {
        gasUsed: deployment.gasUsed,
        deploymentCost: deployment.deploymentCost,
        verificationStatus: deployment.verificationStatus,
      },
      contract_details: {
        contractName: sourceCodeData?.contractName || this.getContractName(deployment.contractType),
        compilerVersion,
        optimizationUsed,
        runs,
        evmVersion,
        licenseType: sourceCodeData?.licenseType || '',
        sourceCode: sourceCodeData?.sourceCode || '',
        constructorArguments: deployment.constructorArguments || '',
        deployedBytecode: artifact.deployedBytecode?.object,
        deployedBytecodeSize: artifact.deployedBytecode?.object
          ? Math.floor(artifact.deployedBytecode.object.length / 2)
          : 0,
        creationCode: artifact.bytecode.object,
        creationCodeSize: artifact.bytecode.object
          ? Math.floor(artifact.bytecode.object.length / 2)
          : 0,
      },
      initial_owner: deployedBy,
      is_template: false,
    };

    const { error } = await this.supabase
      .from('contract_masters')
      .upsert(record, {
        onConflict: 'network,environment,contract_address',
      });

    if (error) {
      throw new Error(`Failed to insert contract_masters: ${error.message}`);
    }

    console.log(
      `✅ Database updated: ${deployment.contractType} at ${deployment.address}`
    );
  }

  /**
   * Deactivate old versions when deploying new version
   */
  async deactivateOldVersions(
    contractType: ContractType,
    network: string,
    environment: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('contract_masters')
      .update({
        is_active: false,
        deprecated_at: new Date().toISOString(),
      })
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to deactivate old versions:', error);
    }
  }

  /**
   * Get current active contract address for type
   */
  async getActiveContract(
    contractType: ContractType,
    network: string,
    environment: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.contract_address;
  }

  /**
   * Calculate SHA-256 hash of ABI
   */
  private calculateAbiHash(abi: any): string {
    const abiString = JSON.stringify(abi, null, 0);
    return createHash('sha256').update(abiString).digest('hex');
  }

  /**
   * Get contract name from contract type
   */
  private getContractName(contractType: ContractType): string {
    // Convert snake_case to PascalCase
    return contractType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
