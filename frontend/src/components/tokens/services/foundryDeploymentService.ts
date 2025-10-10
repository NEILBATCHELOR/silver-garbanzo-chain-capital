/**
 * Foundry Token Deployment Service
 * 
 * Provides deployment functionality for Foundry-compiled smart contracts
 * Integrates with the existing token deployment infrastructure
 * 
 * IMPORTANT: ABIs and Bytecode are imported from Foundry's compiled artifacts
 * Location: /frontend/foundry-contracts/out/{ContractName}.sol/{ContractName}.json
 */

import { ethers } from 'ethers';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { supabase } from '@/infrastructure/database/client';
import { logActivity } from '@/infrastructure/activityLogger';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { WalletAuditService } from '@/services/security/walletAuditService';
import type { ProjectCredential } from '@/types/credentials';
import { 
  FoundryDeploymentParams, 
  FoundryTokenConfig, 
  DeployedContract,
  FoundryERC20Config,
  FoundryERC721Config,
  FoundryERC1155Config,
  FoundryERC4626Config,
  FoundryERC3525Config,
  GasConfig // ✅ FIX #5: Import GasConfig
} from '../interfaces/TokenInterfaces';
import { DeploymentStatus, DeploymentResult } from '@/types/deployment/TokenDeploymentTypes';
import { contractConfigurationService, ContractConfigurationError } from './contractConfigurationService';
import { enhancedGasEstimator, FeePriority } from '@/services/blockchain/EnhancedGasEstimationService';

// Import compiled Foundry artifacts (JSON files contain both ABI and bytecode)
// These are the STATIC master contract artifacts compiled by Foundry
import ERC20MasterArtifact from '../../../../foundry-contracts/out/ERC20Master.sol/ERC20Master.json';
import ERC721MasterArtifact from '../../../../foundry-contracts/out/ERC721Master.sol/ERC721Master.json';
import ERC1155MasterArtifact from '../../../../foundry-contracts/out/ERC1155Master.sol/ERC1155Master.json';
import ERC3525MasterArtifact from '../../../../foundry-contracts/out/ERC3525Master.sol/ERC3525Master.json';
import ERC4626MasterArtifact from '../../../../foundry-contracts/out/ERC4626Master.sol/ERC4626Master.json';
import ERC1400MasterArtifact from '../../../../foundry-contracts/out/ERC1400Master.sol/ERC1400Master.json';
import ERC20RebasingMasterArtifact from '../../../../foundry-contracts/out/ERC20RebasingMaster.sol/ERC20RebasingMaster.json';
import TokenFactoryArtifact from '../../../../foundry-contracts/out/TokenFactory.sol/TokenFactory.json';

/**
 * Extract ABI from Foundry artifact
 * Foundry artifacts have the structure: { abi: [...], bytecode: { object: "0x..." } }
 */
const getABI = (artifact: any): any[] => {
  if (Array.isArray(artifact)) return artifact;
  if (artifact.abi) return artifact.abi;
  throw new Error('Invalid artifact structure: ABI not found');
};

/**
 * Extract bytecode from Foundry artifact
 * Foundry artifacts store bytecode in bytecode.object
 */
const getBytecode = (artifact: any): string => {
  if (typeof artifact === 'string') return artifact;
  if (artifact.bytecode?.object) return artifact.bytecode.object;
  if (artifact.bytecode) return artifact.bytecode;
  if (artifact.object) return artifact.object;
  throw new Error('Invalid artifact structure: Bytecode not found');
};

/**
 * Foundry-compiled token deployment service
 * 
 * Key Concepts:
 * - STATIC: Master contract bytecode and ABIs (same for all deployments)
 * - DYNAMIC: Initialization parameters from user forms (unique per deployment)
 * - DATABASE-DRIVEN: Contract addresses loaded from database via contractConfigurationService
 */
export class FoundryDeploymentService {
  /**
   * Initialize Key Vault connection with proper credentials
   */
  private async initializeKeyVault(): Promise<void> {
    try {
      // Check if already connected
      try {
        await keyVaultClient.getKey('test-connection');
        return;
      } catch {
        // Not connected, proceed with initialization
      }
      
      const credentials: ProjectCredential = {
        id: 'foundry-deployment-credentials',
        name: 'Foundry Deployment Key Vault',
        service: 'local',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await keyVaultClient.connect(credentials);
    } catch (error) {
      console.error('Failed to initialize key vault:', error);
      throw new Error('Key vault initialization failed');
    }
  }

  /**
   * Get the latest key ID from the project_wallets table
   */
  private async getLatestKeyId(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select('key_vault_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error || !data) {
        throw new Error('No keys found in vault');
      }
      
      return data.key_vault_id;
    } catch (error) {
      console.error('Failed to get latest key ID:', error);
      throw new Error('Failed to retrieve key from vault');
    }
  }

  /**
   * Parse timestamp string to Unix timestamp
   */
  private parseTimestamp(dateTimeString: string): number {
    if (!dateTimeString) return 0;
    try {
      return Math.floor(new Date(dateTimeString).getTime() / 1000);
    } catch {
      return 0;
    }
  }

  /**
   * Build gas configuration options for transactions
   * ✅ FIX #5: Helper method to convert GasConfig to transaction options
   */
  private buildGasOptions(gasConfig?: GasConfig): {
    gasPrice?: bigint;
    gasLimit?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  } {
    if (!gasConfig) return {};

    const options: any = {};

    // Legacy gas price (for non-EIP-1559 networks)
    if (gasConfig.gasPrice) {
      try {
        options.gasPrice = ethers.parseUnits(gasConfig.gasPrice, 'gwei');
      } catch (error) {
        console.warn('Invalid gasPrice format, skipping:', error);
      }
    }

    // Gas limit
    if (gasConfig.gasLimit) {
      options.gasLimit = BigInt(gasConfig.gasLimit);
    }

    // EIP-1559 gas fields (overrides legacy gasPrice if present)
    if (gasConfig.maxFeePerGas) {
      try {
        options.maxFeePerGas = ethers.parseUnits(gasConfig.maxFeePerGas, 'gwei');
        // Remove gasPrice if using EIP-1559
        delete options.gasPrice;
      } catch (error) {
        console.warn('Invalid maxFeePerGas format, skipping:', error);
      }
    }

    if (gasConfig.maxPriorityFeePerGas) {
      try {
        options.maxPriorityFeePerGas = ethers.parseUnits(gasConfig.maxPriorityFeePerGas, 'gwei');
      } catch (error) {
        console.warn('Invalid maxPriorityFeePerGas format, skipping:', error);
      }
    }

    console.log('✅ FIX #5: Built gas options from config:', {
      input: gasConfig,
      output: options
    });

    return options;
  }

  /**
   * Get private key from project_wallets table
   * IMPORTANT: Decrypts encrypted private keys before use
   */
  private async getProjectWalletPrivateKey(
    projectId: string,
    blockchain: string,
    userId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, private_key, key_vault_id, wallet_address')
        .eq('project_id', projectId)
        .eq('wallet_type', blockchain)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Failed to fetch project wallet: ${error.message}`);
      }
      
      if (!data) {
        throw new Error(`No wallet found for project ${projectId} on ${blockchain}`);
      }
      
      let privateKey: string;
      
      // If wallet has key_vault_id, fetch from vault
      if (data.key_vault_id) {
        console.log(`Retrieving key from vault: ${data.key_vault_id}`);
        await this.initializeKeyVault();
        const keyData = await keyVaultClient.getKey(data.key_vault_id);
        privateKey = typeof keyData === 'string' ? keyData : keyData.privateKey;
      } else if (data.private_key) {
        // Check if the private key is encrypted
        if (WalletEncryptionClient.isEncrypted(data.private_key)) {
          console.log(`Decrypting private key for wallet: ${data.wallet_address}`);
          
          try {
            privateKey = await WalletEncryptionClient.decrypt(data.private_key);
            
            // Log successful decryption
            if (userId && data.id) {
              await WalletAuditService.logAccess({
                walletId: data.id,
                accessedBy: userId,
                action: 'decrypt',
                success: true,
                metadata: {
                  blockchain,
                  purpose: 'token_deployment'
                }
              });
            }
          } catch (decryptError) {
            console.error('Failed to decrypt private key:', decryptError);
            
            // Log failed decryption attempt
            if (userId && data.id) {
              await WalletAuditService.logAccess({
                walletId: data.id,
                accessedBy: userId,
                action: 'decrypt',
                success: false,
                errorMessage: decryptError instanceof Error ? decryptError.message : 'Decryption failed',
                metadata: {
                  blockchain,
                  purpose: 'token_deployment'
                }
              });
            }
            
            throw new Error('Failed to decrypt private key. Please check encryption configuration.');
          }
        } else {
          // Unencrypted key (legacy or migration pending)
          console.warn(`⚠️ WARNING: Private key for wallet ${data.wallet_address} is not encrypted!`);
          privateKey = data.private_key;
        }
      } else {
        throw new Error('No private key found in project wallet');
      }
      
      // Validate private key format
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      
      return privateKey;
    } catch (error) {
      console.error('Failed to get project wallet private key:', error);
      throw error;
    }
  }

  /**
   * Get factory address dynamically from database
   */
  private async getFactoryAddress(
    blockchain: string,
    environment: 'mainnet' | 'testnet'
  ): Promise<string> {
    try {
      const address = await contractConfigurationService.getFactoryAddress(
        blockchain as any,
        environment
      );
      console.log(`Factory address for ${blockchain}-${environment}: ${address}`);
      return address;
    } catch (error) {
      if (error instanceof ContractConfigurationError) {
        throw new Error(
          `Factory not deployed for ${blockchain}-${environment}. ` +
          `Please deploy contracts first using Foundry deployment scripts. ` +
          `See /frontend/foundry-contracts/script/DeployTokenFactory.s.sol`
        );
      }
      throw error;
    }
  }

  /**
   * Get master implementation address from database
   */
  private async getMasterAddress(
    blockchain: string,
    environment: 'mainnet' | 'testnet',
    standard: string
  ): Promise<string> {
    // Map token standard to contract type
    const contractTypeMap: Record<string, string> = {
      'ERC-20': 'erc20_master',
      'ERC-721': 'erc721_master',
      'ERC-1155': 'erc1155_master',
      'ERC-3525': 'erc3525_master',
      'ERC-4626': 'erc4626_master',
      'ERC-1400': 'erc1400_master',
      'ERC20Rebasing': 'erc20_rebasing_master',
      'EnhancedERC20': 'erc20_master',
      'EnhancedERC721': 'erc721_master',
      'EnhancedERC1155': 'erc1155_master',
      'EnhancedERC3525': 'erc3525_master',
      'EnhancedERC4626': 'erc4626_master',
      'BaseERC1400': 'erc1400_master',
      'EnhancedERC1400': 'erc1400_master',
    };
    
    const contractType = contractTypeMap[standard];
    if (!contractType) {
      throw new Error(`Unknown token standard: ${standard}`);
    }
    
    try {
      const address = await contractConfigurationService.getMasterAddress(
        blockchain as any,
        environment,
        contractType as any
      );
      console.log(`Master address for ${standard} on ${blockchain}-${environment}: ${address}`);
      return address;
    } catch (error) {
      if (error instanceof ContractConfigurationError) {
        throw new Error(
          `Master contract not deployed for ${standard} on ${blockchain}-${environment}. ` +
          `Please deploy contracts first.`
        );
      }
      throw error;
    }
  }

  /**
   * Check if wallet has sufficient balance for deployment
   */
  private async checkWalletBalance(
    wallet: ethers.Wallet,
    estimatedGas: bigint,
    blockchain: string,
    environment: string
  ): Promise<void> {
    const balance = await wallet.provider.getBalance(wallet.address);
    const feeData = await wallet.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    
    const estimatedCost = estimatedGas * gasPrice;
    const estimatedCostInEth = ethers.formatEther(estimatedCost);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log(`Wallet Balance Check:
      - Address: ${wallet.address}
      - Balance: ${balanceInEth} ETH
      - Estimated Gas: ${estimatedGas.toString()} units
      - Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei
      - Estimated Cost: ${estimatedCostInEth} ETH`);
    
    if (balance < estimatedCost) {
      const network = environment === 'testnet' ? 'testnet' : 'mainnet';
      throw new Error(
        `Insufficient funds for deployment. ` +
        `Wallet ${wallet.address} has ${balanceInEth} ETH but needs approximately ${estimatedCostInEth} ETH for gas. ` +
        `Please fund your wallet on ${blockchain} ${network} before deploying.`
      );
    }
  }

  /**
   * Save deployment to database
   * Writes to token_deployments, token_deployment_history, and contract_masters tables
   */
  private async saveDeploymentToDatabase(
    params: FoundryDeploymentParams,
    deployedContract: DeployedContract,
    receipt: ethers.ContractTransactionReceipt,
    masterAddress: string | null,
    factoryAddress: string | null,
    userId: string
  ): Promise<void> {
    try {
      const normalizedType = this.normalizeTokenType(params.tokenType);
      
      // 1. Insert into token_deployments table
      const { error: deploymentError } = await supabase
        .from('token_deployments')
        .insert({
          token_id: params.tokenId,
          network: params.blockchain,
          contract_address: deployedContract.address,
          transaction_hash: deployedContract.deploymentTx,
          deployed_by: userId,
          status: 'deployed',
          deployment_strategy: factoryAddress ? 'factory' : 'direct',
          factory_address: factoryAddress,
          master_address: masterAddress,
          gas_used: receipt.gasUsed.toString(),
          gas_price: receipt.gasPrice?.toString() || null,
          details: {
            tokenType: normalizedType,
            name: deployedContract.name,
            symbol: deployedContract.symbol,
            decimals: deployedContract.decimals,
            config: params.config,
            initialized: true,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash
          }
        });

      if (deploymentError) {
        console.error('Failed to save to token_deployments:', deploymentError);
        throw deploymentError;
      }

      // 2. Insert into token_deployment_history table
      const { error: historyError } = await supabase
        .from('token_deployment_history')
        .insert({
          token_id: params.tokenId,
          project_id: params.projectId,
          status: 'success',
          transaction_hash: deployedContract.deploymentTx,
          block_number: receipt.blockNumber,
          blockchain: params.blockchain,
          environment: params.environment
        });

      if (historyError) {
        console.error('Failed to save to token_deployment_history:', historyError);
        throw historyError;
      }

      // 3. Update contract_masters table if this is a new master deployment
      if (masterAddress) {
        const contractType = this.getContractTypeForDatabase(normalizedType);
        
        const { error: masterError } = await supabase
          .from('contract_masters')
          .upsert({
            network: params.blockchain,
            environment: params.environment,
            contract_type: contractType,
            contract_address: masterAddress,
            version: '1.0.0',
            abi_version: '1.0.0',
            abi: deployedContract.abi,
            deployed_by: userId,
            deployment_tx_hash: deployedContract.deploymentTx,
            is_active: true,
            deployment_data: {
              tokenType: normalizedType,
              deploymentStrategy: factoryAddress ? 'factory' : 'direct',
              factoryAddress
            }
          }, {
            onConflict: 'network,environment,contract_type',
            ignoreDuplicates: false
          });

        if (masterError) {
          console.error('Failed to update contract_masters:', masterError);
          // Don't throw - this is not critical
        }
      }

      console.log('✅ Deployment saved to database successfully');
    } catch (error) {
      console.error('Database persistence error:', error);
      // Log but don't fail the deployment
      await logActivity({
        action: 'deployment_database_save_failed',
        entity_type: 'token',
        entity_id: deployedContract.address,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tokenType: params.tokenType,
          blockchain: params.blockchain
        },
        status: 'error'
      });
    }
  }

  /**
   * Map normalized token type to database contract_type
   */
  private getContractTypeForDatabase(tokenType: string): string {
    const typeMap: Record<string, string> = {
      'ERC20': 'erc20_master',
      'EnhancedERC20': 'erc20_master',
      'ERC721': 'erc721_master',
      'EnhancedERC721': 'erc721_master',
      'ERC1155': 'erc1155_master',
      'EnhancedERC1155': 'erc1155_master',
      'ERC3525': 'erc3525_master',
      'EnhancedERC3525': 'erc3525_master',
      'ERC4626': 'erc4626_master',
      'EnhancedERC4626': 'erc4626_master',
      'ERC1400': 'erc1400_master',
      'BaseERC1400': 'erc1400_master',
      'EnhancedERC1400': 'erc1400_master',
      'ERC20Rebasing': 'erc20_rebasing_master'
    };
    return typeMap[tokenType] || tokenType.toLowerCase();
  }

  /**
   * Normalize token type by removing "Master" suffix
   */
  private normalizeTokenType(tokenType: string): string {
    return tokenType.replace(/Master$/, '');
  }

  /**
   * Estimate gas for contract deployment using REAL blockchain estimation
   * Uses EnhancedGasEstimationService for accurate gas calculation
   */
  private async estimateContractDeploymentGas(
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<bigint> {
    try {
      const normalizedType = this.normalizeTokenType(params.tokenType);
      
      // Get artifact and prepare constructor args for estimation
      const { artifact, constructorArgs } = this.getArtifactAndArgs(params);
      
      console.log(`[FoundryDeployment] Using EnhancedGasEstimator for ${params.tokenType}`);
      
      // Use enhanced gas estimator for REAL blockchain-based estimation
      const estimation = await enhancedGasEstimator.estimateDeploymentCost({
        provider: wallet.provider,
        bytecode: getBytecode(artifact),
        abi: getABI(artifact),
        constructorArgs,
        blockchain: params.blockchain,
        tokenType: normalizedType,
        priority: FeePriority.MEDIUM,
        from: wallet.address
      });
      
      console.log(`[FoundryDeployment] Gas Estimation:
        - Estimated Gas: ${estimation.estimatedGasLimit.toString()} units
        - Recommended Gas (with buffer): ${estimation.recommendedGasLimit.toString()} units
        - Estimated Cost: ${estimation.estimatedCostNative} ${estimation.breakdown.nativeCurrency}
        - Gas Price Source: ${estimation.gasPriceSource || 'unknown'}
        - Network Congestion: ${estimation.networkCongestion}`);
      
      if (estimation.warnings.length > 0) {
        console.warn('[FoundryDeployment] Warnings:', estimation.warnings);
      }
      
      return estimation.recommendedGasLimit;
    } catch (error) {
      console.error('[FoundryDeployment] Enhanced gas estimation failed, using fallback:', error);
      
      // Fallback to quick estimate if full estimation fails
      const normalizedType = this.normalizeTokenType(params.tokenType);
      const quickEstimate = await enhancedGasEstimator.quickEstimate(
        params.blockchain,
        normalizedType,
        FeePriority.MEDIUM
      );
      
      console.log(`[FoundryDeployment] Fallback estimate: ${quickEstimate.gasLimit} gas units`);
      return BigInt(quickEstimate.gasLimit);
    }
  }
  
  /**
   * Helper: Get artifact and constructor args for gas estimation
   */
  private getArtifactAndArgs(params: FoundryDeploymentParams): { 
    artifact: any; 
    constructorArgs: any[] 
  } {
    const normalizedType = this.normalizeTokenType(params.tokenType);
    
    switch (normalizedType) {
      case 'ERC20':
      case 'EnhancedERC20':
        return {
          artifact: ERC20MasterArtifact,
          constructorArgs: [this.encodeERC20Config(params.config as FoundryERC20Config)]
        };
        
      case 'ERC721':
      case 'EnhancedERC721':
        return {
          artifact: ERC721MasterArtifact,
          constructorArgs: [this.encodeERC721Config(params.config as FoundryERC721Config)]
        };
        
      case 'ERC1155':
      case 'EnhancedERC1155':
        return {
          artifact: ERC1155MasterArtifact,
          constructorArgs: [this.encodeERC1155Config(params.config as FoundryERC1155Config)]
        };
        
      case 'ERC3525':
      case 'EnhancedERC3525':
        const erc3525Config = this.encodeERC3525Config(params.config as FoundryERC3525Config);
        return {
          artifact: ERC3525MasterArtifact,
          constructorArgs: [
            erc3525Config.tokenConfig,
            erc3525Config.initialSlots,
            erc3525Config.allocations,
            erc3525Config.royaltyFraction,
            erc3525Config.royaltyRecipient
          ]
        };
        
      case 'ERC4626':
      case 'EnhancedERC4626':
        return {
          artifact: ERC4626MasterArtifact,
          constructorArgs: [this.encodeERC4626Config(params.config as FoundryERC4626Config)]
        };
        
      case 'ERC1400':
      case 'BaseERC1400':
      case 'EnhancedERC1400':
        return {
          artifact: ERC1400MasterArtifact,
          constructorArgs: [this.encodeERC1400Config(params.config as any)]
        };
        
      case 'ERC20Rebasing':
        return {
          artifact: ERC20RebasingMasterArtifact,
          constructorArgs: [this.encodeERC20RebasingConfig(params.config as any)]
        };
        
      default:
        throw new Error(`Unsupported token type: ${params.tokenType}`);
    }
  }

  /**
   * Deploy a token using Foundry contracts
   * 
   * Flow:
   * 1. Get private key from project_wallets
   * 2. Create wallet and provider
   * 3. Estimate gas and check balance
   * 4. Deploy contract (via factory or directly)
   * 5. Initialize with DYNAMIC user parameters
   * 6. Save to database (token_deployments, token_deployment_history, contract_masters)
   */
  async deployToken(
    params: FoundryDeploymentParams,
    userId: string,
    projectId: string
  ): Promise<DeploymentResult> {
    let deployedAddress: string | undefined;
    let masterAddress: string | null = null;
    let factoryAddress: string | null = null;
    
    try {
      // Get private key (with decryption)
      const privateKey = await this.getProjectWalletPrivateKey(projectId, params.blockchain, userId);
      
      if (!privateKey) {
        throw new Error(`No private key found for project wallet`);
      }

      // Get provider
      const environment = params.environment === 'mainnet' 
        ? NetworkEnvironment.MAINNET 
        : NetworkEnvironment.TESTNET;
      
      const provider = providerManager.getProviderForEnvironment(params.blockchain as any, environment);
      if (!provider) {
        throw new Error(`No provider available for ${params.blockchain} (${environment})`);
      }

      // Create wallet
      const wallet = new ethers.Wallet(privateKey, provider);

      // Estimate gas and check balance
      const estimatedGas = await this.estimateContractDeploymentGas(wallet, params);
      await this.checkWalletBalance(wallet, estimatedGas, params.blockchain, params.environment);

      // Get factory and master addresses from database
      try {
        factoryAddress = await this.getFactoryAddress(params.blockchain, params.environment);
        masterAddress = await this.getMasterAddress(
          params.blockchain, 
          params.environment, 
          params.tokenType
        );
      } catch (error) {
        console.warn('Factory/Master not found, will deploy directly:', error);
        // If not found, we'll deploy directly below
      }

      // Deploy
      let deploymentResult: DeployedContract;
      let receipt: ethers.ContractTransactionReceipt;
      
      if (factoryAddress) {
        console.log(`Deploying via factory at: ${factoryAddress}`);
        deploymentResult = await this.deployViaFactory(wallet, params, factoryAddress);
      } else {
        console.log('Deploying directly (no factory found)');
        deploymentResult = await this.deployDirectly(wallet, params);
      }
      
      deployedAddress = deploymentResult.address;

      // Get receipt for database persistence
      const tx = await wallet.provider.getTransaction(deploymentResult.deploymentTx);
      if (!tx) {
        throw new Error('Could not retrieve deployment transaction');
      }
      receipt = await tx.wait() as ethers.ContractTransactionReceipt;
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Save to database
      await this.saveDeploymentToDatabase(
        params,
        deploymentResult,
        receipt,
        masterAddress,
        factoryAddress,
        userId
      );

      // Log success
      await logActivity({
        action: 'foundry_token_deployed',
        entity_type: 'token',
        entity_id: deploymentResult.address,
        details: {
          tokenType: deploymentResult.tokenType,
          blockchain: params.blockchain,
          environment: params.environment,
          name: deploymentResult.name,
          symbol: deploymentResult.symbol,
          deploymentStrategy: factoryAddress ? 'factory' : 'direct',
          databasePersisted: true
        }
      });

      return {
        status: DeploymentStatus.SUCCESS,
        tokenAddress: deploymentResult.address,
        transactionHash: deploymentResult.deploymentTx,
        blockNumber: deploymentResult.deploymentBlock,
        timestamp: deploymentResult.deploymentTimestamp
      };

    } catch (error) {
      console.error('Foundry token deployment failed:', error);
      
      // Attempt database rollback if we have a deployed address
      if (deployedAddress) {
        try {
          await supabase
            .from('token_deployment_history')
            .insert({
              token_id: params.tokenId,
              project_id: params.projectId,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              blockchain: params.blockchain,
              environment: params.environment
            });
        } catch (dbError) {
          console.error('Failed to log deployment failure:', dbError);
        }
      }
      
      await logActivity({
        action: 'foundry_token_deployment_failed',
        entity_type: 'token',
        entity_id: deployedAddress || 'unknown',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tokenType: params.tokenType,
          blockchain: params.blockchain,
          environment: params.environment
        },
        status: 'error'
      });

      return {
        status: DeploymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown deployment error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Deploy token via factory contract
   */
  private async deployViaFactory(
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams,
    factoryAddress: string
  ): Promise<DeployedContract> {
    const factory = new ethers.Contract(
      factoryAddress, 
      getABI(TokenFactoryArtifact), 
      wallet
    );
    
    let tx: ethers.ContractTransactionResponse;
    let deployedAddress: string;

    // Map token type to factory method and encode config
    const tokenTypeMap: Record<string, string> = {
      'ERC20': 'deployERC20Token',
      'ERC721': 'deployERC721Token',
      'ERC1155': 'deployERC1155Token',
      'ERC3525': 'deployERC3525Token',
      'ERC4626': 'deployERC4626Token',
      'ERC1400': 'deployERC1400Token',
      'ERC20Rebasing': 'deployERC20RebasingToken',
      'EnhancedERC20': 'deployERC20Token',
      'EnhancedERC721': 'deployERC721Token',
      'EnhancedERC1155': 'deployERC1155Token',
      'EnhancedERC3525': 'deployERC3525Token',
      'EnhancedERC4626': 'deployERC4626Token',
      'BaseERC1400': 'deployERC1400Token',
      'EnhancedERC1400': 'deployERC1400Token',
    };

    const normalizedType = this.normalizeTokenType(params.tokenType);
    const methodName = tokenTypeMap[normalizedType];
    if (!methodName) {
      throw new Error(`Unsupported token type: ${params.tokenType}`);
    }

    // Encode config based on token type
    const encodedConfig = this.encodeConfig(params);
    
    // ✅ FIX #5: Build gas options from params.gasConfig
    const gasOptions = this.buildGasOptions(params.gasConfig);
    
    // Call factory method with gas configuration
    if (Object.keys(gasOptions).length > 0) {
      console.log('✅ FIX #5: Deploying via factory with gas configuration:', gasOptions);
      tx = await factory[methodName](encodedConfig, gasOptions);
    } else {
      tx = await factory[methodName](encodedConfig);
    }

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    // Find deployment event
    const deploymentEvent = receipt.logs.find(log => {
      try {
        const decoded = factory.interface.parseLog(log);
        return decoded?.name.includes('TokenDeployed');
      } catch {
        return false;
      }
    });

    if (!deploymentEvent) {
      throw new Error('Could not find deployment event');
    }

    const parsedEvent = factory.interface.parseLog(deploymentEvent);
    deployedAddress = parsedEvent?.args[0];

    // ✅ CRITICAL FIX: Initialize UUPS contract after factory deployment
    console.log('🔧 Step 2: Initializing UUPS contract deployed via factory...');
    try {
      await this.initializeUUPSContract(
        deployedAddress,
        wallet,
        params
      );
    } catch (initError) {
      console.error('❌ UUPS initialization failed:', initError);
      // Log but don't fail deployment - contract is deployed, just not initialized
      await logActivity({
        action: 'uups_initialization_failed',
        entity_type: 'token',
        entity_id: deployedAddress,
        details: {
          error: initError instanceof Error ? initError.message : 'Unknown error',
          contractAddress: deployedAddress,
          tokenType: params.tokenType,
          deploymentMethod: 'factory'
        },
        status: 'warning'
      });
    }

    return this.createDeployedContractInfo(
      deployedAddress,
      params,
      tx.hash,
      receipt.blockNumber,
      receipt.blockHash
    );
  }

  /**
   * Deploy token directly (without factory)
   */
  private async deployDirectly(
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<DeployedContract> {
    let artifact: any;
    let constructorArgs: any[];

    // Normalize token type for artifact selection
    const normalizedType = this.normalizeTokenType(params.tokenType);

    // Get artifact based on normalized token type
    switch (normalizedType) {
      case 'ERC20':
      case 'EnhancedERC20':
        artifact = ERC20MasterArtifact;
        constructorArgs = [this.encodeERC20Config(params.config as FoundryERC20Config)];
        break;
        
      case 'ERC721':
      case 'EnhancedERC721':
        artifact = ERC721MasterArtifact;
        constructorArgs = [this.encodeERC721Config(params.config as FoundryERC721Config)];
        break;
        
      case 'ERC1155':
      case 'EnhancedERC1155':
        artifact = ERC1155MasterArtifact;
        constructorArgs = [this.encodeERC1155Config(params.config as FoundryERC1155Config)];
        break;
        
      case 'ERC3525':
      case 'EnhancedERC3525':
        artifact = ERC3525MasterArtifact;
        const erc3525Config = this.encodeERC3525Config(params.config as FoundryERC3525Config);
        constructorArgs = [
          erc3525Config.tokenConfig,
          erc3525Config.initialSlots,
          erc3525Config.allocations,
          erc3525Config.royaltyFraction,
          erc3525Config.royaltyRecipient
        ];
        break;
        
      case 'ERC4626':
      case 'EnhancedERC4626':
        artifact = ERC4626MasterArtifact;
        constructorArgs = [this.encodeERC4626Config(params.config as FoundryERC4626Config)];
        break;
        
      case 'ERC1400':
      case 'BaseERC1400':
      case 'EnhancedERC1400':
        artifact = ERC1400MasterArtifact;
        constructorArgs = [this.encodeERC1400Config(params.config as any)];
        break;
        
      case 'ERC20Rebasing':
        artifact = ERC20RebasingMasterArtifact;
        constructorArgs = [this.encodeERC20RebasingConfig(params.config as any)];
        break;
        
      default:
        throw new Error(`Unsupported token type: ${params.tokenType}`);
    }

    // Create contract factory with ABI and bytecode from artifact
    const contractFactory = new ethers.ContractFactory(
      getABI(artifact),
      getBytecode(artifact),
      wallet
    );

    // ✅ FIX #5: Build gas options from params.gasConfig
    const gasOptions = this.buildGasOptions(params.gasConfig);
    
    // Deploy with gas configuration
    let contract;
    if (Object.keys(gasOptions).length > 0) {
      console.log('✅ FIX #5: Deploying directly with gas configuration:', gasOptions);
      contract = await contractFactory.deploy(...constructorArgs, gasOptions);
    } else {
      contract = await contractFactory.deploy(...constructorArgs);
    }
    const deploymentTx = contract.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    // ✅ CRITICAL FIX: Initialize UUPS contract after deployment
    console.log('🔧 Step 2: Initializing UUPS contract...');
    try {
      await this.initializeUUPSContract(
        await contract.getAddress(),
        wallet,
        params
      );
    } catch (initError) {
      console.error('❌ UUPS initialization failed:', initError);
      // Log but don't fail deployment - contract is deployed, just not initialized
      // User can manually initialize later if needed
      await logActivity({
        action: 'uups_initialization_failed',
        entity_type: 'token',
        entity_id: await contract.getAddress(),
        details: {
          error: initError instanceof Error ? initError.message : 'Unknown error',
          contractAddress: await contract.getAddress(),
          tokenType: params.tokenType
        },
        status: 'warning'
      });
    }

    return this.createDeployedContractInfo(
      await contract.getAddress(),
      params,
      deploymentTx.hash,
      receipt.blockNumber,
      receipt.blockHash
    );
  }

  /**
   * Encode config based on token type (router method)
   */
  private encodeConfig(params: FoundryDeploymentParams): any {
    const normalizedType = this.normalizeTokenType(params.tokenType);
    
    switch (normalizedType) {
      case 'ERC20':
      case 'EnhancedERC20':
        return this.encodeERC20Config(params.config as FoundryERC20Config);
      case 'ERC721':
      case 'EnhancedERC721':
        return this.encodeERC721Config(params.config as FoundryERC721Config);
      case 'ERC1155':
      case 'EnhancedERC1155':
        return this.encodeERC1155Config(params.config as FoundryERC1155Config);
      case 'ERC3525':
      case 'EnhancedERC3525':
        return this.encodeERC3525Config(params.config as FoundryERC3525Config);
      case 'ERC4626':
      case 'EnhancedERC4626':
        return this.encodeERC4626Config(params.config as FoundryERC4626Config);
      case 'ERC1400':
      case 'BaseERC1400':
      case 'EnhancedERC1400':
        return this.encodeERC1400Config(params.config as any);
      case 'ERC20Rebasing':
        return this.encodeERC20RebasingConfig(params.config as any);
      default:
        throw new Error(`Unsupported token type: ${params.tokenType}`);
    }
  }

  /**
   * Encode ERC20 configuration for contract deployment
   */
  private encodeERC20Config(config: FoundryERC20Config): any {
    return {
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals,
      initialSupply: ethers.parseUnits(config.initialSupply, config.decimals),
      maxSupply: config.maxSupply === '0' ? 0 : ethers.parseUnits(config.maxSupply, config.decimals),
      transfersPaused: config.transfersPaused,
      mintingEnabled: config.mintingEnabled,
      burningEnabled: config.burningEnabled,
      votingEnabled: config.votingEnabled,
      initialOwner: config.initialOwner
    };
  }

  /**
   * Encode ERC721 configuration for contract deployment
   */
  private encodeERC721Config(config: FoundryERC721Config): any {
    return {
      name: config.name,
      symbol: config.symbol,
      baseURI: config.baseURI,
      maxSupply: config.maxSupply,
      mintPrice: ethers.parseEther(config.mintPrice),
      transfersPaused: config.transfersPaused,
      mintingEnabled: config.mintingEnabled,
      burningEnabled: config.burningEnabled,
      publicMinting: config.publicMinting,
      initialOwner: config.initialOwner
    };
  }

  /**
   * Encode ERC1155 configuration for contract deployment
   */
  private encodeERC1155Config(config: FoundryERC1155Config): any {
    return {
      name: config.name,
      symbol: config.symbol,
      baseURI: config.baseURI,
      transfersPaused: config.transfersPaused,
      mintingEnabled: config.mintingEnabled,
      burningEnabled: config.burningEnabled,
      publicMinting: config.publicMinting,
      initialOwner: config.initialOwner
    };
  }

  /**
   * Encode ERC4626 configuration for contract deployment
   */
  private encodeERC4626Config(config: FoundryERC4626Config): any {
    return {
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals,
      asset: config.asset,
      managementFee: config.managementFee,
      performanceFee: config.performanceFee,
      depositLimit: ethers.parseUnits(config.depositLimit, config.decimals),
      minDeposit: ethers.parseUnits(config.minDeposit, config.decimals),
      depositsEnabled: config.depositsEnabled,
      withdrawalsEnabled: config.withdrawalsEnabled,
      transfersPaused: config.transfersPaused,
      initialOwner: config.initialOwner
    };
  }

  /**
   * Encode ERC3525 configuration for contract deployment
   */
  private encodeERC3525Config(config: FoundryERC3525Config): any {
    const tokenConfig = {
      name: config.name,
      symbol: config.symbol,
      valueDecimals: config.valueDecimals,
      mintingEnabled: config.mintingEnabled,
      burningEnabled: config.burningEnabled,
      transfersPaused: config.transfersPaused,
      initialOwner: config.initialOwner
    };

    const initialSlots = config.initialSlots.map(slot => ({
      name: slot.name,
      description: slot.description,
      isActive: slot.isActive,
      maxSupply: slot.maxSupply,
      currentSupply: 0,
      metadata: slot.metadata
    }));

    const allocations = config.allocations.map(allocation => ({
      slot: allocation.slot,
      recipient: allocation.recipient,
      value: ethers.parseUnits(allocation.value, config.valueDecimals),
      description: allocation.description
    }));

    return {
      tokenConfig,
      initialSlots,
      allocations,
      royaltyFraction: config.royaltyFraction,
      royaltyRecipient: config.royaltyRecipient
    };
  }

  /**
   * Encode ERC1400 configuration for contract deployment
   */
  private encodeERC1400Config(config: any): any {
    return {
      name: config.name,
      symbol: config.symbol,
      initialSupply: ethers.parseUnits(config.initialSupply || '0', 18),
      cap: config.cap === '0' ? 0 : ethers.parseUnits(config.cap || '0', 18),
      controllerAddress: config.controllerAddress || config.initialOwner || ethers.ZeroAddress,
      requireKyc: config.requireKyc ?? true,
      documentUri: config.documentUri || '',
      documentHash: config.documentHash || '0x0000000000000000000000000000000000000000000000000000000000000000'
    };
  }

  /**
   * Encode ERC20 Rebasing configuration for contract deployment
   */
  private encodeERC20RebasingConfig(config: any): any {
    return {
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals || 18,
      initialSupply: ethers.parseUnits(config.initialSupply || '0', config.decimals || 18),
      rebaseInterval: config.rebaseInterval || 86400, // Default 24 hours
      rebaseRate: config.rebaseRate || 0, // Basis points
      positiveRebase: config.positiveRebase ?? true,
      initialOwner: config.initialOwner
    };
  }

  /**
   * Create deployed contract information object
   */
  private async createDeployedContractInfo(
    address: string,
    params: FoundryDeploymentParams,
    txHash: string,
    blockNumber: number,
    blockHash: string
  ): Promise<DeployedContract> {
    const config = params.config;
    const normalizedType = this.normalizeTokenType(params.tokenType) as DeployedContract['tokenType'];
    
    return {
      address,
      tokenType: normalizedType,
      name: config.name,
      symbol: config.symbol,
      decimals: 'decimals' in config ? config.decimals : undefined,
      valueDecimals: 'valueDecimals' in config ? config.valueDecimals : undefined,
      blockchain: params.blockchain,
      environment: params.environment,
      deploymentTx: txHash,
      deploymentBlock: blockNumber,
      deploymentTimestamp: Date.now(),
      verified: false,
      abi: this.getABIForTokenType(normalizedType)
    };
  }

  /**
   * Get ABI for token type from Foundry artifacts
   */
  private getABIForTokenType(tokenType: string): any[] {
    const normalizedType = this.normalizeTokenType(tokenType);
    
    switch (normalizedType) {
      case 'ERC20':
      case 'EnhancedERC20':
        return getABI(ERC20MasterArtifact);
      case 'ERC721':
      case 'EnhancedERC721':
        return getABI(ERC721MasterArtifact);
      case 'ERC1155':
      case 'EnhancedERC1155':
        return getABI(ERC1155MasterArtifact);
      case 'ERC3525':
      case 'EnhancedERC3525':
        return getABI(ERC3525MasterArtifact);
      case 'ERC4626':
      case 'EnhancedERC4626':
        return getABI(ERC4626MasterArtifact);
      case 'ERC1400':
      case 'BaseERC1400':
      case 'EnhancedERC1400':
        return getABI(ERC1400MasterArtifact);
      case 'ERC20Rebasing':
        return getABI(ERC20RebasingMasterArtifact);
      default:
        return [];
    }
  }

  /**
   * Initialize UUPS proxy contract after deployment
   * 
   * CRITICAL: Each token type has different initialization signatures
   * Routes to the appropriate initialization method based on token type
   * 
   * @param contractAddress - Deployed contract address
   * @param wallet - Signer wallet
   * @param params - Deployment parameters containing token config
   * @returns Transaction receipt from initialization
   */
  private async initializeUUPSContract(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const normalizedType = this.normalizeTokenType(params.tokenType);
    
    console.log(`🔧 Initializing ${normalizedType} contract at:`, contractAddress);

    switch (normalizedType) {
      case 'ERC20':
      case 'EnhancedERC20':
        return this.initializeERC20(contractAddress, wallet, params);
      
      case 'ERC721':
      case 'EnhancedERC721':
        return this.initializeERC721(contractAddress, wallet, params);
      
      case 'ERC1155':
      case 'EnhancedERC1155':
        return this.initializeERC1155(contractAddress, wallet, params);
      
      case 'ERC3525':
      case 'EnhancedERC3525':
        return this.initializeERC3525(contractAddress, wallet, params);
      
      case 'ERC4626':
      case 'EnhancedERC4626':
        return this.initializeERC4626(contractAddress, wallet, params);
      
      case 'ERC1400':
      case 'BaseERC1400':
      case 'EnhancedERC1400':
        return this.initializeERC1400(contractAddress, wallet, params);
      
      case 'ERC20Rebasing':
        return this.initializeERC20Rebasing(contractAddress, wallet, params);
      
      default:
        throw new Error(`Unsupported token type for initialization: ${params.tokenType}`);
    }
  }

  /**
   * Initialize ERC20 token
   * Signature: initialize(name, symbol, maxSupply, initialSupply, owner)
   */
  private async initializeERC20(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as FoundryERC20Config;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, uint256 maxSupply, uint256 initialSupply, address owner) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    const maxSupply = config.maxSupply === '0' ? 0n : ethers.parseUnits(config.maxSupply, config.decimals);
    const initialSupply = ethers.parseUnits(config.initialSupply, config.decimals);
    
    console.log('📝 ERC20 Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      maxSupply: ethers.formatUnits(maxSupply, config.decimals),
      initialSupply: ethers.formatUnits(initialSupply, config.decimals),
      owner: config.initialOwner
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      maxSupply,
      initialSupply,
      config.initialOwner
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC20 initialization failed');
    
    console.log('✅ ERC20 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC721 token
   * Signature: initialize(name, symbol, baseTokenURI, maxSupply, owner, mintingEnabled, burningEnabled)
   */
  private async initializeERC721(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as FoundryERC721Config;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, string memory baseTokenURI, uint256 maxSupply, address owner, bool mintingEnabled, bool burningEnabled) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    console.log('📝 ERC721 Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      baseURI: config.baseURI,
      maxSupply: config.maxSupply,
      owner: config.initialOwner,
      mintingEnabled: config.mintingEnabled,
      burningEnabled: config.burningEnabled
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      config.baseURI,
      config.maxSupply,
      config.initialOwner,
      config.mintingEnabled,
      config.burningEnabled
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC721 initialization failed');
    
    console.log('✅ ERC721 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC1155 token
   * Signature: initialize(name, symbol, uri, owner)
   */
  private async initializeERC1155(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as FoundryERC1155Config;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, string memory uri, address owner) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    console.log('📝 ERC1155 Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      uri: config.baseURI,
      owner: config.initialOwner
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      config.baseURI,
      config.initialOwner
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC1155 initialization failed');
    
    console.log('✅ ERC1155 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC3525 token
   * Signature: initialize(name, symbol, decimals, owner)
   */
  private async initializeERC3525(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as FoundryERC3525Config;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, uint8 decimals, address owner) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    console.log('📝 ERC3525 Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      decimals: config.valueDecimals,
      owner: config.initialOwner
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      config.valueDecimals,
      config.initialOwner
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC3525 initialization failed');
    
    console.log('✅ ERC3525 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC4626 token
   * Signature: initialize(asset, name, symbol, depositCap, minimumDeposit, owner)
   */
  private async initializeERC4626(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as FoundryERC4626Config;
    
    const initializeABI = [
      'function initialize(address asset, string memory name, string memory symbol, uint256 depositCap, uint256 minimumDeposit, address owner) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    const depositCap = ethers.parseUnits(config.depositLimit, config.decimals);
    const minimumDeposit = ethers.parseUnits(config.minDeposit, config.decimals);
    
    console.log('📝 ERC4626 Initialize params:', {
      asset: config.asset,
      name: config.name,
      symbol: config.symbol,
      depositCap: ethers.formatUnits(depositCap, config.decimals),
      minimumDeposit: ethers.formatUnits(minimumDeposit, config.decimals),
      owner: config.initialOwner
    });
    
    const tx = await contract.initialize(
      config.asset,
      config.name,
      config.symbol,
      depositCap,
      minimumDeposit,
      config.initialOwner
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC4626 initialization failed');
    
    console.log('✅ ERC4626 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC1400 token
   * Signature: initialize(name, symbol, decimals, defaultPartitions, owner, isControllable)
   */
  private async initializeERC1400(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as any;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, uint8 decimals, bytes32[] memory defaultPartitions, address owner, bool isControllable) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    // Default partitions if not provided
    const defaultPartitions = config.defaultPartitions || [ethers.id('default')];
    const isControllable = config.isControllable ?? true;
    
    console.log('📝 ERC1400 Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      decimals: 18,
      defaultPartitions,
      owner: config.initialOwner,
      isControllable
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      18,
      defaultPartitions,
      config.initialOwner,
      isControllable
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC1400 initialization failed');
    
    console.log('✅ ERC1400 initialized successfully');
    return receipt;
  }

  /**
   * Initialize ERC20 Rebasing token
   * Signature: initialize(name, symbol, initialSupply, owner)
   */
  private async initializeERC20Rebasing(
    contractAddress: string,
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<ethers.ContractTransactionReceipt> {
    const config = params.config as any;
    
    const initializeABI = [
      'function initialize(string memory name, string memory symbol, uint256 initialSupply, address owner) public'
    ];
    
    const contract = new ethers.Contract(contractAddress, initializeABI, wallet);
    
    const decimals = config.decimals || 18;
    const initialSupply = ethers.parseUnits(config.initialSupply || '0', decimals);
    
    console.log('📝 ERC20Rebasing Initialize params:', {
      name: config.name,
      symbol: config.symbol,
      initialSupply: ethers.formatUnits(initialSupply, decimals),
      owner: config.initialOwner
    });
    
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      initialSupply,
      config.initialOwner
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('ERC20Rebasing initialization failed');
    
    console.log('✅ ERC20Rebasing initialized successfully');
    return receipt;
  }

  /**
   * Verify a deployed contract
   */
  async verifyContract(
    contractAddress: string,
    blockchain: string,
    environment: string,
    tokenType: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await logActivity({
        action: 'contract_verification_submitted',
        entity_type: 'token',
        entity_id: contractAddress,
        details: {
          blockchain,
          environment,
          tokenType
        }
      });

      return {
        success: true,
        message: 'Contract verification submitted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Check if network is configured with deployed contracts
   */
  async isNetworkConfigured(
    blockchain: string,
    environment: 'mainnet' | 'testnet'
  ): Promise<boolean> {
    try {
      await this.getFactoryAddress(blockchain, environment);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all deployed contract addresses for a network
   */
  async getNetworkContractAddresses(
    blockchain: string,
    environment: 'mainnet' | 'testnet'
  ): Promise<Record<string, string>> {
    try {
      return await contractConfigurationService.getAllMasterAddresses(
        blockchain as any,
        environment
      );
    } catch (error) {
      throw new Error(
        `Failed to get contract addresses for ${blockchain}-${environment}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// Export singleton instance
export const foundryDeploymentService = new FoundryDeploymentService();
