/**
 * Token Deployment Orchestrator
 * 
 * Orchestrates the complete instance deployment + configuration flow
 * Assumes templates are already deployed and configured in factory
 * 
 * COMPLETE FLOW:
 * 1. Deploy master INSTANCE from template (via factory)
 * 2. Deploy module INSTANCES from templates (via factory)
 * 3. Save instances to database (tokens, token_modules tables)
 * 4. Configure master instance with user settings
 * 5. Configure module instances with user settings
 * 6. Update database with configuration results
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { InstanceConfigurationService } from '@/services/modules/InstanceConfigurationService';
import type { 
  CompleteModuleConfiguration,
  TokenStandard 
} from '@/types/modules';
import type { ModuleSelection } from '@/services/modules/ModuleRegistryService';

interface DeploymentParams {
  // Token details
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  tokenStandard: TokenStandard;
  
  // Module selection
  moduleSelection: ModuleSelection;
  moduleConfigs: CompleteModuleConfiguration;
  
  // Deployment params
  network: string;
  environment: string;
  deployer: ethers.Wallet;
}

interface MasterInstanceResult {
  address: string;
  templateAddress: string;
  deploymentTxHash: string;
}

interface ModuleInstanceResult {
  moduleType: string;
  instanceAddress: string;
  templateAddress: string;
  deploymentTxHash: string;
}

interface DeploymentResult {
  success: boolean;
  masterInstance: MasterInstanceResult;
  moduleInstances: ModuleInstanceResult[];
  configurationResults: Array<{
    moduleType: string;
    configured: boolean;
    transactionHashes: string[];
  }>;
  errors: string[];
}

interface DeploymentProgress {
  step: string;
  current: number;
  total: number;
  details?: string;
}

/**
 * Orchestrates complete token deployment and configuration
 */
export class TokenDeploymentOrchestrator {
  /**
   * Deploy and configure a complete token with all selected modules
   */
  static async deployToken(
    params: DeploymentParams,
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<DeploymentResult> {
    const errors: string[] = [];
    const totalSteps = 6;
    
    try {
      // Step 1: Get factory contract
      onProgress?.({ step: 'Getting factory contract', current: 1, total: totalSteps });
      
      const factory = await this.getFactory(params.network, params.environment, params.deployer);
      
      // Step 2: Deploy master INSTANCE from template
      onProgress?.({ step: 'Deploying token contract instance', current: 2, total: totalSteps });
      
      const masterInstance = await this.deployMasterInstance(
        factory,
        params.tokenStandard,
        {
          name: params.name,
          symbol: params.symbol,
          decimals: params.decimals,
          totalSupply: params.totalSupply
        },
        params.network,
        params.environment
      );
      
      // Step 3: Deploy module INSTANCES from templates
      onProgress?.({ step: 'Deploying module instances', current: 3, total: totalSteps });
      
      const moduleInstances = await this.deployModuleInstances(
        factory,
        masterInstance.address,
        params.moduleSelection,
        params.network,
        params.environment
      );
      
      // Step 4: Save instances to database
      onProgress?.({ step: 'Saving deployment to database', current: 4, total: totalSteps });
      
      await this.saveMasterInstanceToDatabase(params.tokenId, masterInstance);
      await this.saveModuleInstancesToDatabase(params.tokenId, moduleInstances);
      
      // Step 5: Configure master instance
      onProgress?.({ step: 'Configuring token contract', current: 5, total: totalSteps });
      
      await InstanceConfigurationService.configureMasterInstance(
        masterInstance.address,
        params.tokenStandard,
        {
          owner: await params.deployer.getAddress(),
          features: [] // Extract from params if needed
        },
        params.deployer
      );
      
      // Step 6: Configure module instances
      onProgress?.({ step: 'Configuring modules', current: 6, total: totalSteps });
      
      const configurationResults = await InstanceConfigurationService.configureModuleInstances(
        moduleInstances,
        params.moduleConfigs,
        params.deployer,
        (configProgress) => {
          onProgress?.({
            step: `Configuring ${configProgress.module}`,
            current: 6,
            total: totalSteps,
            details: configProgress.message
          });
        }
      );
      
      // Update database with configuration results
      await this.updateConfigurationResults(params.tokenId, configurationResults);
      
      return {
        success: errors.length === 0,
        masterInstance,
        moduleInstances,
        configurationResults,
        errors
      };
      
    } catch (error: any) {
      console.error('Token deployment failed:', error);
      errors.push(error.message);
      throw error;
    }
  }

  /**
   * Deploy master instance from template via factory
   */
  private static async deployMasterInstance(
    factory: ethers.Contract,
    tokenStandard: TokenStandard,
    tokenParams: {
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
    },
    network: string,
    environment: string
  ): Promise<MasterInstanceResult> {
    // Get template address
    const templateAddress = await this.getTemplateAddress(
      `${tokenStandard}_master`,
      network,
      environment
    );
    
    console.log(`Deploying ${tokenStandard} master instance from template: ${templateAddress}`);
    
    // Deploy instance via factory (factory clones the template)
    const tx = await factory.deployMasterInstance(
      templateAddress,
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      ethers.parseUnits(tokenParams.totalSupply, tokenParams.decimals)
    );
    
    const receipt = await tx.wait();
    
    // Extract instance address from event
    const event = receipt.events?.find((e: any) => e.event === 'MasterDeployed');
    const instanceAddress = event?.args?.instanceAddress;
    
    if (!instanceAddress) {
      throw new Error('Failed to extract instance address from deployment event');
    }
    
    console.log(`Master instance deployed at: ${instanceAddress}`);
    
    return {
      address: instanceAddress,
      templateAddress,
      deploymentTxHash: receipt.transactionHash
    };
  }

  /**
   * Deploy module instances from templates via factory
   */
  private static async deployModuleInstances(
    factory: ethers.Contract,
    masterInstanceAddress: string,
    moduleSelection: ModuleSelection,
    network: string,
    environment: string
  ): Promise<ModuleInstanceResult[]> {
    const deployed: ModuleInstanceResult[] = [];
    
    // Deploy each selected module
    for (const [moduleType, isSelected] of Object.entries(moduleSelection)) {
      if (isSelected && typeof isSelected === 'boolean') {
        try {
          // Get template address
          const templateAddress = await this.getTemplateAddress(
            `${moduleType}_module`,
            network,
            environment
          );
          
          console.log(`Deploying ${moduleType} module instance from template: ${templateAddress}`);
          
          // Deploy instance via factory
          const tx = await factory.deployModuleInstance(
            templateAddress,
            masterInstanceAddress
          );
          
          const receipt = await tx.wait();
          
          // Extract instance address from event
          const event = receipt.events?.find((e: any) => e.event === 'ModuleDeployed');
          const instanceAddress = event?.args?.moduleAddress || event?.args?.instanceAddress;
          
          if (!instanceAddress) {
            console.warn(`Failed to extract instance address for ${moduleType} module`);
            continue;
          }
          
          console.log(`Module instance deployed at: ${instanceAddress}`);
          
          deployed.push({
            moduleType,
            instanceAddress,
            templateAddress,
            deploymentTxHash: receipt.transactionHash
          });
          
        } catch (error) {
          console.error(`Failed to deploy ${moduleType} module:`, error);
          // Continue with other modules
        }
      }
    }
    
    return deployed;
  }

  /**
   * Get factory contract instance
   */
  private static async getFactory(
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<ethers.Contract> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address, abi')
      .eq('contract_type', 'factory')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      throw new Error(`Factory not found for ${network}/${environment}`);
    }
    
    return new ethers.Contract(data.contract_address, data.abi, deployer);
  }

  /**
   * Get template address from contract_masters
   */
  private static async getTemplateAddress(
    contractType: string,
    network: string,
    environment: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('contract_address')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_template', true)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      throw new Error(`Template not found: ${contractType} on ${network}/${environment}`);
    }
    
    return data.contract_address;
  }

  /**
   * Save master instance to database
   */
  private static async saveMasterInstanceToDatabase(
    tokenId: string,
    masterInstance: MasterInstanceResult
  ): Promise<void> {
    const { error } = await supabase
      .from('token_deployments')
      .insert({
        token_id: tokenId,
        contract_address: masterInstance.address,
        transaction_hash: masterInstance.deploymentTxHash,
        master_address: masterInstance.templateAddress,
        deployed_at: new Date().toISOString(),
        status: 'SUCCESSFUL'
      });
    
    if (error) {
      throw new Error(`Failed to save master instance to database: ${error.message}`);
    }
  }

  /**
   * Save module instances to database
   */
  private static async saveModuleInstancesToDatabase(
    tokenId: string,
    moduleInstances: ModuleInstanceResult[]
  ): Promise<void> {
    if (moduleInstances.length === 0) return;
    
    const records = moduleInstances.map(m => ({
      token_id: tokenId,
      module_type: m.moduleType,
      module_address: m.instanceAddress,
      master_address: m.templateAddress,
      deployment_tx_hash: m.deploymentTxHash,
      is_active: true,
      deployed_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('token_modules')
      .insert(records);
    
    if (error) {
      throw new Error(`Failed to save module instances to database: ${error.message}`);
    }
  }

  /**
   * Update database with configuration results
   */
  private static async updateConfigurationResults(
    tokenId: string,
    results: Array<{
      moduleType: string;
      configured: boolean;
      transactionHashes: string[];
    }>
  ): Promise<void> {
    for (const result of results) {
      const { error } = await supabase
        .from('token_modules')
        .update({
          configuration_status: result.configured ? 'CONFIGURED' : 'FAILED',
          configuration_tx_hashes: result.transactionHashes,
          configured_at: result.configured ? new Date().toISOString() : null
        })
        .eq('token_id', tokenId)
        .eq('module_type', result.moduleType);
      
      if (error) {
        console.error(`Failed to update configuration status for ${result.moduleType}:`, error);
      }
    }
  }
}

export type { DeploymentParams, DeploymentResult, DeploymentProgress };
