/**
 * Factory Deployment Service
 * 
 * Orchestrates template-based token deployment using factory pattern
 * Integrates with:
 * - Admin template management (active templates from database)
 * - Project wallet signing (encrypted private keys from key_vault)
 * - Factory configuration (factory contracts from database)
 * - Module deployment (instance cloning)
 * - Role assignment (contract roles)
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { WalletAuditService } from '@/services/security/walletAuditService';
import { InstanceConfigurationService } from '@/services/modules/InstanceConfigurationService';
import { TokenRoleManagementService } from '@/components/tokens/services/tokenRoleManagementService';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { logActivity } from '@/infrastructure/activityLogger';

// Interfaces
export interface FactoryDeploymentParams {
  tokenId: string;
  projectId: string;
  userId: string;
  blockchain: string;
  environment: 'mainnet' | 'testnet';
  
  // Token Configuration
  standard: string; // 'ERC20', 'ERC721', etc.
  name: string;
  symbol: string;
  decimals?: number;
  totalSupply?: string;
  
  // Module Selection
  selectedModules: string[]; // ['vesting', 'compliance', etc.]
  moduleConfigs: Record<string, any>;
  
  // Role Assignment
  roleAddresses: Record<string, string>; // { 'minter': '0x...', 'pauser': '0x...' }
  
  // Gas Configuration (optional)
  gasConfig?: {
    gasPrice?: string;
    gasLimit?: number;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface DeploymentResult {
  success: boolean;
  masterAddress?: string;
  moduleAddresses?: Record<string, string>;
  transactionHashes: string[];
  error?: string;
}

interface TemplateInfo {
  id: string;
  contract_type: string;
  contract_address: string;
  abi: any;
  network: string;
  environment: string;
}

export class FactoryDeploymentService {
  /**
   * Deploy token using factory pattern with project wallet
   */
  static async deployToken(
    params: FactoryDeploymentParams
  ): Promise<DeploymentResult> {
    const transactionHashes: string[] = [];
    let masterAddress: string | undefined;
    let moduleAddresses: Record<string, string> = {};
    
    try {
      console.log('🚀 Starting factory-based deployment...');
      
      // 1. Get project wallet and create signer
      const signer = await this.getProjectWalletSigner(
        params.projectId,
        params.blockchain,
        params.environment,
        params.userId
      );
      
      console.log(`✅ Connected wallet: ${await signer.getAddress()}`);
      
      // 2. Get factory contract
      const factory = await this.getFactoryContract(
        params.blockchain,
        params.environment,
        signer
      );
      
      console.log(`✅ Factory loaded: ${await factory.getAddress()}`);
      
      // 3. Get active template for this token standard
      const masterTemplate = await this.getActiveTemplate(
        params.standard,
        params.blockchain,
        params.environment
      );
      
      console.log(`✅ Master template: ${masterTemplate.contract_address}`);
      
      // 4. Clone master from template
      masterAddress = await this.cloneMaster(
        factory,
        masterTemplate,
        params,
        signer
      );
      
      console.log(`✅ Master deployed: ${masterAddress}`);
      
      // Track transaction
      const masterDeployTx = await signer.provider?.getTransaction(
        (await factory.interface.getEvent('MasterDeployed'))?.name || ''
      );
      if (masterDeployTx?.hash) {
        transactionHashes.push(masterDeployTx.hash);
      }
      
      // 5. Deploy and configure modules (if selected)
      if (params.selectedModules.length > 0) {
        moduleAddresses = await this.deployModules(
          factory,
          masterAddress,
          params.selectedModules,
          params.moduleConfigs,
          params.blockchain,
          params.environment,
          signer,
          transactionHashes
        );
      }
      
      // 6. Assign roles to addresses
      if (Object.keys(params.roleAddresses).length > 0) {
        await this.assignRoles(
          masterAddress,
          params.roleAddresses,
          params.userId,
          signer,
          transactionHashes
        );
      }
      
      // 7. Save deployment to database
      await this.saveDeployment(
        params.tokenId,
        params.projectId,
        params.userId,
        masterAddress,
        moduleAddresses,
        transactionHashes,
        params.blockchain,
        params.environment
      );
      
      // Log success
      await logActivity({
        action: 'factory_token_deployed',
        entity_type: 'token',
        entity_id: masterAddress,
        details: {
          tokenType: params.standard,
          blockchain: params.blockchain,
          environment: params.environment,
          modules: params.selectedModules,
          roles: Object.keys(params.roleAddresses)
        }
      });
      
      return {
        success: true,
        masterAddress,
        moduleAddresses,
        transactionHashes
      };
      
    } catch (error) {
      console.error('❌ Factory deployment failed:', error);
      
      // Log failure
      await logActivity({
        action: 'factory_deployment_failed',
        entity_type: 'token',
        entity_id: masterAddress || 'unknown',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tokenType: params.standard,
          blockchain: params.blockchain
        },
        status: 'error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
        transactionHashes
      };
    }
  }
  
  /**
   * Get project wallet signer with decrypted private key
   */
  private static async getProjectWalletSigner(
    projectId: string,
    blockchain: string,
    environment: string,
    userId: string
  ): Promise<ethers.Wallet> {
    try {
      // Get project wallet from database
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, private_key, private_key_vault_id, wallet_address')
        .eq('project_id', projectId)
        .eq('wallet_type', blockchain)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        throw new Error(`No wallet found for project ${projectId} on ${blockchain}`);
      }
      
      let privateKey: string;
      
      // Get private key from vault or decrypt
      if (data.private_key_vault_id) {
        console.log(`Retrieving key from vault: ${data.private_key_vault_id}`);
        const keyData = await keyVaultClient.getKey(data.private_key_vault_id);
        privateKey = typeof keyData === 'string' ? keyData : keyData.privateKey;
        
        // Log vault access
        await WalletAuditService.logAccess({
          walletId: data.id,
          accessedBy: userId,
          action: 'read', // ✅ FIX: Changed from 'retrieve' to 'read' to match WalletAccessLogParams type
          success: true,
          metadata: {
            blockchain,
            purpose: 'factory_deployment'
          }
        });
      } else if (data.private_key) {
        // Decrypt if encrypted
        if (WalletEncryptionClient.isEncrypted(data.private_key)) {
          console.log(`Decrypting private key for wallet: ${data.wallet_address}`);
          privateKey = await WalletEncryptionClient.decrypt(data.private_key);
          
          // Log decryption
          await WalletAuditService.logAccess({
            walletId: data.id,
            accessedBy: userId,
            action: 'decrypt',
            success: true,
            metadata: {
              blockchain,
              purpose: 'factory_deployment'
            }
          });
        } else {
          privateKey = data.private_key;
        }
      } else {
        throw new Error('No private key found in project wallet');
      }
      
      // Ensure proper format
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      // Get provider
      const env = environment === 'mainnet' 
        ? NetworkEnvironment.MAINNET 
        : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(
        blockchain as any,
        env
      );
      
      if (!provider) {
        throw new Error(`No provider available for ${blockchain} (${environment})`);
      }
      
      return new ethers.Wallet(privateKey, provider);
      
    } catch (error) {
      console.error('Failed to get project wallet signer:', error);
      throw error;
    }
  }
  
  /**
   * Get factory contract from database
   */
  private static async getFactoryContract(
    blockchain: string,
    environment: string,
    signer: ethers.Wallet
  ): Promise<ethers.Contract> {
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('contract_address, abi')
        .eq('network', blockchain)
        .eq('environment', environment)
        .like('contract_type', '%factory%')
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        throw new Error(`Factory not found for ${blockchain}-${environment}`);
      }
      
      return new ethers.Contract(
        data.contract_address,
        data.abi || [],
        signer
      );
    } catch (error) {
      console.error('Failed to get factory contract:', error);
      throw error;
    }
  }
  
  /**
   * Get active template from database
   */
  private static async getActiveTemplate(
    standard: string,
    blockchain: string,
    environment: string
  ): Promise<TemplateInfo> {
    try {
      // Map token standard to contract type
      const contractTypeMap: Record<string, string> = {
        'ERC20': 'erc20_master',
        'ERC721': 'erc721_master',
        'ERC1155': 'erc1155_master',
        'ERC1400': 'erc1400_master',
        'ERC3525': 'erc3525_master',
        'ERC4626': 'erc4626_master',
      };
      
      const contractType = contractTypeMap[standard.toUpperCase()];
      if (!contractType) {
        throw new Error(`Unknown token standard: ${standard}`);
      }
      
      const { data, error } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', blockchain)
        .eq('environment', environment)
        .eq('contract_type', contractType)
        .eq('is_template', true)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        throw new Error(`Active template not found for ${standard} on ${blockchain}-${environment}`);
      }
      
      return {
        id: data.id,
        contract_type: data.contract_type,
        contract_address: data.contract_address,
        abi: data.abi || [],
        network: data.network,
        environment: data.environment
      };
    } catch (error) {
      console.error('Failed to get active template:', error);
      throw error;
    }
  }
  
  /**
   * Clone master from template
   */
  private static async cloneMaster(
    factory: ethers.Contract,
    template: TemplateInfo,
    params: FactoryDeploymentParams,
    signer: ethers.Wallet
  ): Promise<string> {
    try {
      console.log(`Cloning master from template: ${template.contract_address}`);
      
      // Prepare constructor args based on token standard
      const constructorArgs = this.prepareConstructorArgs(params);
      
      // Build gas options if provided
      const gasOptions: any = {};
      if (params.gasConfig) {
        if (params.gasConfig.gasPrice) {
          gasOptions.gasPrice = ethers.parseUnits(params.gasConfig.gasPrice, 'gwei');
        }
        if (params.gasConfig.gasLimit) {
          gasOptions.gasLimit = params.gasConfig.gasLimit;
        }
        if (params.gasConfig.maxFeePerGas) {
          gasOptions.maxFeePerGas = ethers.parseUnits(params.gasConfig.maxFeePerGas, 'gwei');
          delete gasOptions.gasPrice; // EIP-1559
        }
        if (params.gasConfig.maxPriorityFeePerGas) {
          gasOptions.maxPriorityFeePerGas = ethers.parseUnits(params.gasConfig.maxPriorityFeePerGas, 'gwei');
        }
      }
      
      // Call factory.deployMasterInstance()
      const tx = Object.keys(gasOptions).length > 0
        ? await factory.deployMasterInstance(
            template.contract_type,
            ...constructorArgs,
            gasOptions
          )
        : await factory.deployMasterInstance(
            template.contract_type,
            ...constructorArgs
          );
      
      console.log(`Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }
      
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Extract instance address from MasterDeployed event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'MasterDeployed');
      
      if (!event) {
        throw new Error('Failed to extract instance address from deployment');
      }
      
      const instanceAddress = event.args.instanceAddress;
      console.log(`✅ Master instance deployed: ${instanceAddress}`);
      
      return instanceAddress;
    } catch (error) {
      console.error('Failed to clone master:', error);
      throw error;
    }
  }
  
  /**
   * Prepare constructor args based on token standard
   */
  private static prepareConstructorArgs(params: FactoryDeploymentParams): any[] {
    switch (params.standard.toUpperCase()) {
      case 'ERC20':
        return [
          params.name,
          params.symbol,
          params.decimals || 18,
          ethers.parseUnits(params.totalSupply || '0', params.decimals || 18)
        ];
      
      case 'ERC721':
        return [
          params.name,
          params.symbol
        ];
      
      case 'ERC1155':
        return [
          params.name
        ];
      
      default:
        return [params.name, params.symbol];
    }
  }
  
  /**
   * Deploy modules using factory
   */
  private static async deployModules(
    factory: ethers.Contract,
    masterAddress: string,
    selectedModules: string[],
    moduleConfigs: Record<string, any>,
    blockchain: string,
    environment: string,
    signer: ethers.Wallet,
    transactionHashes: string[]
  ): Promise<Record<string, string>> {
    const moduleAddresses: Record<string, string> = {};
    
    for (const moduleType of selectedModules) {
      try {
        console.log(`Deploying ${moduleType} module...`);
        
        // Get active module template
        const moduleTemplate = await this.getActiveTemplate(
          moduleType + '_module',
          blockchain,
          environment
        );
        
        // Clone module from template
        const tx = await factory.deployModuleInstance(
          moduleTemplate.contract_type,
          masterAddress
        );
        
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Module deployment transaction failed');
        }
        
        transactionHashes.push(tx.hash);
        
        // Extract module address from ModuleDeployed event
        const event = receipt.logs
          .map((log: any) => {
            try {
              return factory.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e: any) => e?.name === 'ModuleDeployed');
        
        if (!event) {
          throw new Error(`Failed to extract ${moduleType} module address`);
        }
        
        const moduleAddress = event.args.instanceAddress;
        moduleAddresses[moduleType] = moduleAddress;
        
        console.log(`✅ ${moduleType} module deployed: ${moduleAddress}`);
        
        // Configure module
        await this.configureModule(
          moduleAddress,
          moduleType,
          moduleConfigs[moduleType],
          moduleTemplate.abi,
          signer
        );
        
      } catch (error) {
        console.error(`Failed to deploy ${moduleType} module:`, error);
        // Continue with other modules
      }
    }
    
    return moduleAddresses;
  }
  
  /**
   * Configure module after deployment
   */
  private static async configureModule(
    moduleAddress: string,
    moduleType: string,
    config: any,
    abi: any,
    signer: ethers.Wallet
  ): Promise<void> {
    if (!config) return;
    
    try {
      const moduleContract = new ethers.Contract(moduleAddress, abi, signer);
      
      switch (moduleType) {
        case 'vesting':
          for (const schedule of config.schedules || []) {
            await moduleContract.createVestingSchedule(
              schedule.beneficiary,
              ethers.parseUnits(schedule.amount, 18),
              schedule.startTime,
              schedule.cliffDuration,
              schedule.vestingDuration,
              schedule.revocable,
              ethers.encodeBytes32String(schedule.category || 'default')
            );
          }
          break;
        
        case 'document':
          for (const doc of config.documents || []) {
            await moduleContract.setDocument(
              ethers.encodeBytes32String(doc.name),
              doc.uri,
              doc.hash
            );
          }
          break;
        
        case 'compliance':
          if (config.kycRequired !== undefined) {
            await moduleContract.setKYCRequired(config.kycRequired);
          }
          break;
        
        // Add more module configurations as needed
      }
      
      console.log(`✅ ${moduleType} module configured`);
    } catch (error) {
      console.error(`Failed to configure ${moduleType} module:`, error);
      throw error;
    }
  }
  
  /**
   * Assign roles to addresses
   */
  private static async assignRoles(
    masterAddress: string,
    roleAddresses: Record<string, string>,
    userId: string,
    signer: ethers.Wallet,
    transactionHashes: string[]
  ): Promise<void> {
    try {
      console.log('Assigning roles...');
      
      // Define role constants (should match contract)
      const ROLES: Record<string, string> = {
        'minter': ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE')),
        'pauser': ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE')),
        'burner': ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE')),
        'upgrader': ethers.keccak256(ethers.toUtf8Bytes('UPGRADER_ROLE')),
      };
      
      // Simple ABI for AccessControl
      const masterContract = new ethers.Contract(
        masterAddress,
        ['function grantRole(bytes32 role, address account) external'],
        signer
      );
      
      // Get TokenRoleManagementService instance
      const roleService = TokenRoleManagementService.getInstance();
      
      for (const [roleName, address] of Object.entries(roleAddresses)) {
        if (ROLES[roleName] && address && ethers.isAddress(address)) {
          try {
            const tx = await masterContract.grantRole(ROLES[roleName], address);
            await tx.wait();
            transactionHashes.push(tx.hash);
            
            console.log(`✅ Granted ${roleName} role to ${address}`);
            
            // Save role assignment to database
            await roleService.saveRoleAssignment(
              userId,
              address,
              masterAddress,
              roleName
            );
            
          } catch (error) {
            console.error(`Failed to grant ${roleName} role:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to assign roles:', error);
      throw error;
    }
  }
  
  /**
   * Save deployment to database
   */
  private static async saveDeployment(
    tokenId: string,
    projectId: string,
    userId: string,
    masterAddress: string,
    moduleAddresses: Record<string, string>,
    transactionHashes: string[],
    blockchain: string,
    environment: string
  ): Promise<void> {
    try {
      // 1. Update token record
      await supabase
        .from('tokens')
        .update({
          address: masterAddress,
          deployed_at: new Date().toISOString()
        })
        .eq('id', tokenId);
      
      // 2. Insert deployment history
      await supabase
        .from('token_deployment_history')
        .insert({
          token_id: tokenId,
          project_id: projectId,
          status: 'success',
          transaction_hash: transactionHashes[0],
          blockchain,
          environment
        });
      
      // 3. Insert module records
      for (const [moduleType, moduleAddress] of Object.entries(moduleAddresses)) {
        await supabase
          .from('token_modules')
          .insert({
            token_id: tokenId,
            module_type: moduleType,
            module_address: moduleAddress,
            is_active: true
          });
      }
      
      console.log('✅ Deployment saved to database');
    } catch (error) {
      console.error('Failed to save deployment to database:', error);
      throw error;
    }
  }
}
