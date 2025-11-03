// Module Deployment Service
// Deploys NEW module instances for each token (not shared masters)

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { ModuleRegistryService } from './ModuleRegistryService';

/**
 * Configuration for deploying a new module instance
 */
export interface ModuleDeploymentConfig {
  tokenAddress: string;
  tokenId: string;
  moduleType: string;
  configuration: Record<string, any>;
  deployer: ethers.Wallet;
  factoryAddress: string;
}

/**
 * Result of module deployment
 */
export interface ModuleDeploymentResult {
  moduleAddress: string;      // NEW instance address
  masterAddress: string;       // Template used
  deploymentTxHash: string;
  moduleType: string;
  configuration: Record<string, any>;
}

/**
 * Service for deploying NEW module instances per token
 * (not just pointing to shared masters)
 */
export class ModuleDeploymentService {
  /**
   * Deploy and attach modules for a token based on feature selection
   * 
   * CRITICAL: Deploys NEW instances, does NOT reuse shared masters
   */
  static async deployAndAttachModules(
    tokenAddress: string,
    tokenId: string,
    selection: any,
    network: string,
    tokenStandard: 'erc20' | 'erc721' | 'erc1155' | 'erc3525' | 'erc4626' | 'erc1400',
    environment: string,
    deployer: ethers.Wallet,
    factoryAddress: string
  ): Promise<ModuleDeploymentResult[]> {
    const deployedModules: ModuleDeploymentResult[] = [];

    // Get factory contract
    const factory = new ethers.Contract(
      factoryAddress,
      await this.getFactoryABI(network, environment),
      deployer
    );

    // Get token contract (for attaching modules)
    const token = new ethers.Contract(
      tokenAddress,
      await this.getTokenABI(tokenStandard, network, environment),
      deployer
    );

    // Deploy compliance module if selected
    if (selection.compliance) {
      const result = await this.deployComplianceModule(
        factory,
        token,
        tokenAddress,
        tokenId,
        selection.complianceConfig || {},
        network,
        environment
      );
      deployedModules.push(result);
    }

    // Deploy vesting module if selected
    if (selection.vesting) {
      const result = await this.deployVestingModule(
        factory,
        token,
        tokenAddress,
        tokenId,
        selection.vestingConfig || {},
        network,
        environment
      );
      deployedModules.push(result);
    }

    // Deploy fees module if selected
    if (selection.fees) {
      const result = await this.deployFeesModule(
        factory,
        token,
        tokenAddress,
        tokenId,
        selection.feesConfig || {},
        network,
        environment,
        deployer
      );
      deployedModules.push(result);
    }

    // ERC20-specific modules
    if (tokenStandard === 'erc20') {
      if (selection.permit) {
        const result = await this.deployPermitModule(
          factory,
          token,
          tokenAddress,
          tokenId,
          {},
          network,
          environment
        );
        deployedModules.push(result);
      }

      if (selection.snapshot) {
        const result = await this.deploySnapshotModule(
          factory,
          token,
          tokenAddress,
          tokenId,
          {},
          network,
          environment
        );
        deployedModules.push(result);
      }

      // ... other ERC20 modules
    }

    // Save all deployed modules to database
    await this.saveModuleDeployments(tokenId, deployedModules);

    return deployedModules;
  }

  /**
   * Deploy compliance module instance
   */
  private static async deployComplianceModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    // Get master address (template)
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'compliance_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Compliance module master not found');
    }

    // Deploy NEW instance via factory
    console.log(`Deploying NEW compliance module instance for token ${tokenAddress}`);
    const tx = await factory.deployComplianceModule(
      tokenAddress,
      config.kycRequired || false,
      config.whitelistRequired || false
    );
    const receipt = await tx.wait();

    // Extract new module address from event
    const event = receipt.logs.find(
      (log: any) => log.eventName === 'ComplianceModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address from transaction');
    }

    console.log(`NEW compliance module deployed at: ${newModuleAddress}`);

    // Attach NEW instance to token
    await token.setComplianceModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,     // NEW instance
      masterAddress: masterModule.contractAddress,  // Template
      deploymentTxHash: receipt.hash,
      moduleType: 'compliance',
      configuration: config
    };
  }

  /**
   * Deploy vesting module instance
   */
  private static async deployVestingModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'vesting_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Vesting module master not found');
    }

    console.log(`Deploying NEW vesting module instance for token ${tokenAddress}`);
    const tx = await factory.deployVestingModule(tokenAddress);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'VestingModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW vesting module deployed at: ${newModuleAddress}`);

    await token.setVestingModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'vesting',
      configuration: config
    };
  }

  /**
   * Deploy fees module instance
   */
  private static async deployFeesModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string,
    deployer: ethers.Wallet
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'fee_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Fee module master not found');
    }

    console.log(`Deploying NEW fee module instance for token ${tokenAddress}`);
    const tx = await factory.deployFeeModule(
      tokenAddress,
      config.transferFeeBps || 0,
      config.feeRecipient || deployer.address
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'FeeModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW fee module deployed at: ${newModuleAddress}`);

    await token.setFeesModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'fees',
      configuration: config
    };
  }

  /**
   * Deploy permit module instance (ERC20)
   */
  private static async deployPermitModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'permit_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Permit module master not found');
    }

    console.log(`Deploying NEW permit module instance for token ${tokenAddress}`);
    const tx = await factory.deployPermitModule(tokenAddress);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'PermitModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW permit module deployed at: ${newModuleAddress}`);

    // Note: Permit module might not have a setter, it may work via interface
    // Check your smart contracts for the exact integration pattern

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'permit',
      configuration: config
    };
  }

  /**
   * Deploy snapshot module instance (ERC20)
   */
  private static async deploySnapshotModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'snapshot_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Snapshot module master not found');
    }

    console.log(`Deploying NEW snapshot module instance for token ${tokenAddress}`);
    const tx = await factory.deploySnapshotModule(tokenAddress);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'SnapshotModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW snapshot module deployed at: ${newModuleAddress}`);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'snapshot',
      configuration: config
    };
  }

  /**
   * Save deployed modules to database
   */
  private static async saveModuleDeployments(
    tokenId: string,
    modules: ModuleDeploymentResult[]
  ): Promise<void> {
    const records = modules.map(module => ({
      token_id: tokenId,
      module_type: module.moduleType,
      module_address: module.moduleAddress,      // NEW instance
      master_address: module.masterAddress,      // Template
      deployment_tx_hash: module.deploymentTxHash,
      configuration: module.configuration,
      is_active: true,
      deployed_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('token_modules')
      .insert(records);

    if (error) {
      console.error('Failed to save module deployments:', error);
      throw new Error(`Failed to save module deployments: ${error.message}`);
    }

    console.log(`Saved ${modules.length} module deployments to database`);
  }

  /**
   * Helper: Get factory ABI
   */
  private static async getFactoryABI(
    network: string,
    environment: string
  ): Promise<any> {
    // Query contract_masters for factory ABI
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .like('contract_type', '%factory%')
      .single();

    if (error || !data) {
      throw new Error('Factory ABI not found');
    }

    return data.abi;
  }

  /**
   * Helper: Get token ABI
   */
  private static async getTokenABI(
    tokenStandard: string,
    network: string,
    environment: string
  ): Promise<any> {
    const contractType = `${tokenStandard}_master`;
    
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`${tokenStandard} master ABI not found`);
    }

    return data.abi;
  }
}
