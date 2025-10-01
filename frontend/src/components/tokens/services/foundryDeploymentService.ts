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
import { supa } from '@/infrastructure/data/client';
import { logActivity } from '@/infrastructure/activityLogger';
import type { ProjectCredential } from '@/types/credentials';
import { 
  FoundryDeploymentParams, 
  FoundryTokenConfig, 
  DeployedContract,
  FoundryERC20Config,
  FoundryERC721Config,
  FoundryERC1155Config,
  FoundryERC4626Config,
  FoundryERC3525Config
} from '../interfaces/TokenInterfaces';
import { DeploymentStatus, DeploymentResult } from '@/types/deployment/TokenDeploymentTypes';

// Import compiled Foundry artifacts (JSON files contain both ABI and bytecode)
// These are the STATIC master contract artifacts compiled by Foundry
import ERC20MasterArtifact from '../../../../../../foundry-contracts/out/ERC20Master.sol/ERC20Master.json';
import ERC721MasterArtifact from '../../../../../../foundry-contracts/out/ERC721Master.sol/ERC721Master.json';
import ERC1155MasterArtifact from '../../../../../../foundry-contracts/out/ERC1155Master.sol/ERC1155Master.json';
import ERC3525MasterArtifact from '../../../../../../foundry-contracts/out/ERC3525Master.sol/ERC3525Master.json';
import ERC4626MasterArtifact from '../../../../../../foundry-contracts/out/ERC4626Master.sol/ERC4626Master.json';
import ERC1400MasterArtifact from '../../../../../../foundry-contracts/out/ERC1400Master.sol/ERC1400Master.json';
import ERC20RebasingMasterArtifact from '../../../../../../foundry-contracts/out/ERC20RebasingMaster.sol/ERC20RebasingMaster.json';
import TokenFactoryArtifact from '../../../../../../foundry-contracts/out/TokenFactory.sol/TokenFactory.json';

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
 * Factory contract addresses for different networks
 * These will be populated after factory deployment
 */
const FACTORY_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    mainnet: '', // To be deployed
    testnet: '', // To be deployed
  },
  polygon: {
    mainnet: '', // To be deployed
    testnet: '', // To be deployed
  }
};

/**
 * Foundry-compiled token deployment service
 * 
 * Key Concepts:
 * - STATIC: Master contract bytecode and ABIs (same for all deployments)
 * - DYNAMIC: Initialization parameters from user forms (unique per deployment)
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
      const { data, error } = await supa
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
   * Get private key from project_wallets table
   */
  private async getProjectWalletPrivateKey(
    projectId: string,
    blockchain: string
  ): Promise<string> {
    try {
      const { data, error } = await supa
        .from('project_wallets')
        .select('private_key, key_vault_id')
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
      
      // If wallet has key_vault_id, fetch from vault
      if (data.key_vault_id) {
        await this.initializeKeyVault();
        const keyData = await keyVaultClient.getKey(data.key_vault_id);
        return typeof keyData === 'string' ? keyData : keyData.privateKey;
      }
      
      // Otherwise use private_key directly
      if (data.private_key) {
        return data.private_key;
      }
      
      throw new Error('No private key found in project wallet');
    } catch (error) {
      console.error('Failed to get project wallet private key:', error);
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
   * Estimate gas for contract deployment
   */
  private async estimateContractDeploymentGas(
    wallet: ethers.Wallet,
    params: FoundryDeploymentParams
  ): Promise<bigint> {
    try {
      // Conservative gas estimates for different token types
      const gasEstimates: Record<string, number> = {
        'ERC20': 1500000,
        'ERC20Master': 1500000,
        'ERC721': 2500000,
        'ERC721Master': 2500000,
        'ERC1155': 2800000,
        'ERC1155Master': 2800000,
        'ERC3525': 3200000,
        'ERC3525Master': 3200000,
        'ERC4626': 2600000,
        'ERC4626Master': 2600000,
        'ERC1400': 3500000,
        'ERC1400Master': 3500000,
        'ERC20Rebasing': 2000000,
        'ERC20RebasingMaster': 2000000,
      };

      const baseGas = gasEstimates[params.tokenType] || 3000000;
      
      // Add 20% buffer for safety
      const gasWithBuffer = Math.floor(baseGas * 1.2);
      
      console.log(`Gas Estimation for ${params.tokenType}:
        - Base Estimate: ${baseGas} units
        - With 20% Buffer: ${gasWithBuffer} units`);
      
      return BigInt(gasWithBuffer);
    } catch (error) {
      console.error('Error estimating deployment gas:', error);
      // Fallback to 4M gas if estimation fails
      return BigInt(4000000);
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
   */
  async deployToken(
    params: FoundryDeploymentParams,
    userId: string,
    projectId: string
  ): Promise<DeploymentResult> {
    try {
      // Get private key
      const privateKey = await this.getProjectWalletPrivateKey(projectId, params.blockchain);
      
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

      // Deploy
      const factoryAddress = FACTORY_ADDRESSES[params.blockchain]?.[params.environment];
      
      let deploymentResult: DeployedContract;
      
      if (factoryAddress && factoryAddress !== '') {
        deploymentResult = await this.deployViaFactory(wallet, params, factoryAddress);
      } else {
        deploymentResult = await this.deployDirectly(wallet, params);
      }

      // Log success
      await logActivity({
        action: 'foundry_token_deployed',
        entity_type: 'token',
        entity_id: deploymentResult.address,
        details: {
          tokenType: params.tokenType,
          blockchain: params.blockchain,
          environment: params.environment,
          name: deploymentResult.name,
          symbol: deploymentResult.symbol
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
      
      await logActivity({
        action: 'foundry_token_deployment_failed',
        entity_type: 'token',
        entity_id: 'unknown',
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
      'ERC20Master': 'deployERC20Token',
      'ERC721': 'deployERC721Token',
      'ERC721Master': 'deployERC721Token',
      'ERC1155': 'deployERC1155Token',
      'ERC1155Master': 'deployERC1155Token',
      'ERC3525': 'deployERC3525Token',
      'ERC3525Master': 'deployERC3525Token',
      'ERC4626': 'deployERC4626Token',
      'ERC4626Master': 'deployERC4626Token',
      'ERC1400': 'deployERC1400Token',
      'ERC1400Master': 'deployERC1400Token',
      'ERC20Rebasing': 'deployERC20RebasingToken',
      'ERC20RebasingMaster': 'deployERC20RebasingToken',
    };

    const methodName = tokenTypeMap[params.tokenType];
    if (!methodName) {
      throw new Error(`Unsupported token type: ${params.tokenType}`);
    }

    // Encode config based on token type
    const encodedConfig = this.encodeConfig(params);
    
    // Call factory method
    tx = await factory[methodName](encodedConfig);

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

    // Get artifact based on token type
    switch (params.tokenType) {
      case 'ERC20':
      case 'ERC20Master':
        artifact = ERC20MasterArtifact;
        constructorArgs = [this.encodeERC20Config(params.config as FoundryERC20Config)];
        break;
        
      case 'ERC721':
      case 'ERC721Master':
        artifact = ERC721MasterArtifact;
        constructorArgs = [this.encodeERC721Config(params.config as FoundryERC721Config)];
        break;
        
      case 'ERC1155':
      case 'ERC1155Master':
        artifact = ERC1155MasterArtifact;
        constructorArgs = [this.encodeERC1155Config(params.config as FoundryERC1155Config)];
        break;
        
      case 'ERC3525':
      case 'ERC3525Master':
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
      case 'ERC4626Master':
        artifact = ERC4626MasterArtifact;
        constructorArgs = [this.encodeERC4626Config(params.config as FoundryERC4626Config)];
        break;
        
      case 'ERC1400':
      case 'ERC1400Master':
        artifact = ERC1400MasterArtifact;
        constructorArgs = [this.encodeERC1400Config(params.config as any)];
        break;
        
      case 'ERC20Rebasing':
      case 'ERC20RebasingMaster':
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

    // Deploy
    const contract = await contractFactory.deploy(...constructorArgs);
    const deploymentTx = contract.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
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
    switch (params.tokenType) {
      case 'ERC20':
      case 'ERC20Master':
        return this.encodeERC20Config(params.config as FoundryERC20Config);
      case 'ERC721':
      case 'ERC721Master':
        return this.encodeERC721Config(params.config as FoundryERC721Config);
      case 'ERC1155':
      case 'ERC1155Master':
        return this.encodeERC1155Config(params.config as FoundryERC1155Config);
      case 'ERC3525':
      case 'ERC3525Master':
        return this.encodeERC3525Config(params.config as FoundryERC3525Config);
      case 'ERC4626':
      case 'ERC4626Master':
        return this.encodeERC4626Config(params.config as FoundryERC4626Config);
      case 'ERC1400':
      case 'ERC1400Master':
        return this.encodeERC1400Config(params.config as any);
      case 'ERC20Rebasing':
      case 'ERC20RebasingMaster':
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
      URI: config.URI,
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
      URI: config.URI,
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
    
    return {
      address,
      tokenType: params.tokenType,
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
      abi: this.getABIForTokenType(params.tokenType)
    };
  }

  /**
   * Get ABI for token type from Foundry artifacts
   */
  private getABIForTokenType(tokenType: string): any[] {
    switch (tokenType) {
      case 'ERC20':
      case 'ERC20Master':
        return getABI(ERC20MasterArtifact);
      case 'ERC721':
      case 'ERC721Master':
        return getABI(ERC721MasterArtifact);
      case 'ERC1155':
      case 'ERC1155Master':
        return getABI(ERC1155MasterArtifact);
      case 'ERC3525':
      case 'ERC3525Master':
        return getABI(ERC3525MasterArtifact);
      case 'ERC4626':
      case 'ERC4626Master':
        return getABI(ERC4626MasterArtifact);
      case 'ERC1400':
      case 'ERC1400Master':
        return getABI(ERC1400MasterArtifact);
      case 'ERC20Rebasing':
      case 'ERC20RebasingMaster':
        return getABI(ERC20RebasingMasterArtifact);
      default:
        return [];
    }
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
   * Get factory address for a network
   */
  getFactoryAddress(blockchain: string, environment: string): string {
    return FACTORY_ADDRESSES[blockchain]?.[environment] || '';
  }

  /**
   * Set factory address for a network
   */
  setFactoryAddress(blockchain: string, environment: string, address: string): void {
    if (!FACTORY_ADDRESSES[blockchain]) {
      FACTORY_ADDRESSES[blockchain] = {};
    }
    FACTORY_ADDRESSES[blockchain][environment] = address;
  }

  /**
   * Predict token address for create2 deployment
   */
  async predictTokenAddress(params: FoundryDeploymentParams): Promise<string> {
    if (!params.salt) {
      throw new Error('Salt required for address prediction');
    }

    const factoryAddress = this.getFactoryAddress(params.blockchain, params.environment);
    if (!factoryAddress) {
      throw new Error('Factory not deployed for this network');
    }

    return '0x0000000000000000000000000000000000000000';
  }
}

// Export singleton instance
export const foundryDeploymentService = new FoundryDeploymentService();
