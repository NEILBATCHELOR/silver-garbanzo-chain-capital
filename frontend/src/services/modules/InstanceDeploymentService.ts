// Instance Deployment Service
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
 * 
 * RENAMED FROM: ModuleDeploymentService → InstanceDeploymentService
 * To better reflect that we're deploying instances from templates
 */
export class InstanceDeploymentService {
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
      await this.getFactoryABI(factoryAddress, network, environment),
      deployer
    );

    // Get token contract (for attaching modules)
    const token = new ethers.Contract(
      tokenAddress,
      await this.getTokenABI(tokenStandard, network, environment),
      deployer
    );

    // ============ UNIVERSAL MODULES (All Standards) ============
    
    if (selection.compliance) {
      const result = await this.deployComplianceModule(
        factory, token, tokenAddress, tokenId,
        selection.complianceConfig || {}, network, environment
      );
      deployedModules.push(result);
    }

    if (selection.vesting) {
      const result = await this.deployVestingModule(
        factory, token, tokenAddress, tokenId,
        selection.vestingConfig || {}, network, environment
      );
      deployedModules.push(result);
    }

    if (selection.document) {
      const result = await this.deployDocumentModule(
        factory, token, tokenAddress, tokenId,
        selection.documentConfig || {}, network, environment
      );
      deployedModules.push(result);
    }

    if (selection.policyEngine) {
      const result = await this.deployPolicyEngine(
        factory, token, tokenAddress, tokenId,
        selection.policyEngineConfig || {}, network, environment
      );
      deployedModules.push(result);
    }

    // ============ ERC20-SPECIFIC MODULES ============
    if (tokenStandard === 'erc20') {
      if (selection.fees) {
        const result = await this.deployFeesModule(
          factory, token, tokenAddress, tokenId,
          selection.feesConfig || {}, network, environment, deployer
        );
        deployedModules.push(result);
      }

      if (selection.flashMint) {
        const result = await this.deployFlashMintModule(
          factory, token, tokenAddress, tokenId, selection.flashMintConfig || {}, network, environment, deployer
        );
        deployedModules.push(result);
      }

      if (selection.permit) {
        const result = await this.deployPermitModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.snapshot) {
        const result = await this.deploySnapshotModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.timelock) {
        const result = await this.deployTimelockModule(
          factory, token, tokenAddress, tokenId,
          selection.timelockConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.votes) {
        const result = await this.deployVotesModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.payableToken) {
        const result = await this.deployPayableTokenModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.temporaryApproval) {
        const result = await this.deployTemporaryApprovalModule(
          factory, token, tokenAddress, tokenId,
          selection.temporaryApprovalConfig || {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // ============ ERC721-SPECIFIC MODULES ============
    if (tokenStandard === 'erc721') {
      if (selection.royalty) {
        const result = await this.deployRoyaltyModule(
          factory, token, tokenAddress, tokenId,
          selection.royaltyConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.rental) {
        const result = await this.deployRentalModule(
          factory, token, tokenAddress, tokenId,
          selection.rentalConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.soulbound) {
        const result = await this.deploySoulboundModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.fraction) {
        const result = await this.deployFractionModule(
          factory, token, tokenAddress, tokenId,
          selection.fractionConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.consecutive) {
        const result = await this.deployConsecutiveModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.metadataEvents) {
        const result = await this.deployMetadataEventsModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.granularApproval) {
        const result = await this.deployGranularApprovalModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // ============ ERC1155-SPECIFIC MODULES ============
    if (tokenStandard === 'erc1155') {
      if (selection.royalty) {
        const result = await this.deployRoyaltyModule(
          factory, token, tokenAddress, tokenId,
          selection.royaltyConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.supplyCap) {
        const result = await this.deploySupplyCapModule(
          factory, token, tokenAddress, tokenId,
          selection.supplyCapConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.uriManagement) {
        const result = await this.deployUriManagementModule(
          factory, token, tokenAddress, tokenId,
          selection.uriManagementConfig || {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // ============ ERC3525-SPECIFIC MODULES ============
    if (tokenStandard === 'erc3525') {
      if (selection.slotApprovable) {
        const result = await this.deploySlotApprovableModule(
          factory, token, tokenAddress, tokenId, {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.slotManager) {
        const result = await this.deploySlotManagerModule(
          factory, token, tokenAddress, tokenId,
          selection.slotManagerConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.valueExchange) {
        const result = await this.deployValueExchangeModule(
          factory, token, tokenAddress, tokenId,
          selection.valueExchangeConfig || {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // ============ ERC4626-SPECIFIC MODULES ============
    if (tokenStandard === 'erc4626') {
      if (selection.feeStrategy) {
        const result = await this.deployFeeStrategyModule(
          factory, token, tokenAddress, tokenId,
          selection.feeStrategyConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.withdrawalQueue) {
        const result = await this.deployWithdrawalQueueModule(
          factory, token, tokenAddress, tokenId,
          selection.withdrawalQueueConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.yieldStrategy) {
        const result = await this.deployYieldStrategyModule(
          factory, token, tokenAddress, tokenId,
          selection.yieldStrategyConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.asyncVault) {
        const result = await this.deployAsyncVaultModule(
          factory, token, tokenAddress, tokenId,
          selection.asyncVaultConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.nativeVault) {
        const result = await this.deployNativeVaultModule(
          factory, token, tokenAddress, tokenId,
          selection.nativeVaultConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.router) {
        const result = await this.deployRouterModule(
          factory, token, tokenAddress, tokenId,
          selection.routerConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.multiAssetVault) {
        const result = await this.deployMultiAssetVaultModule(
          factory, token, tokenAddress, tokenId,
          selection.multiAssetVaultConfig || {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // ============ ERC1400-SPECIFIC MODULES ============
    if (tokenStandard === 'erc1400') {
      if (selection.transferRestrictions) {
        const result = await this.deployTransferRestrictionsModule(
          factory, token, tokenAddress, tokenId,
          selection.transferRestrictionsConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.controller) {
        const result = await this.deployControllerModule(
          factory, token, tokenAddress, tokenId,
          selection.controllerConfig || {}, network, environment
        );
        deployedModules.push(result);
      }

      if (selection.erc1400Document) {
        const result = await this.deployERC1400DocumentModule(
          factory, token, tokenAddress, tokenId,
          selection.erc1400DocumentConfig || {}, network, environment
        );
        deployedModules.push(result);
      }
    }

    // Save all deployed modules to database
    await this.saveModuleDeployments(tokenId, deployedModules);

    return deployedModules;
  }

  // ============ DEPLOYMENT METHODS - UNIVERSAL MODULES ============

  /**
   * Deploy compliance module instance
   * ✅ CORRECTED: Handles transformation of frontend config to smart contract parameters
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
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'compliance_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Compliance module master not found');
    }

    console.log(`Deploying NEW compliance module instance for token ${tokenAddress}`);
    
    // Transform jurisdictionRules to jurisdictions array (only allowed jurisdictions)
    let jurisdictions: string[] = [];
    if (config.jurisdictionRules && Array.isArray(config.jurisdictionRules)) {
      jurisdictions = config.jurisdictionRules
        .filter((rule: any) => rule.allowed)
        .map((rule: any) => rule.jurisdiction)
        .filter((j: string) => j && j.trim() !== ''); // Remove empty strings
    }
    
    // Get deployment parameters (all required by smart contract)
    const complianceLevel = config.complianceLevel ?? 1; // Default level 1 (minimal compliance)
    const maxHoldersPerJurisdiction = config.maxHoldersPerJurisdiction ?? 0; // Default 0 (unlimited)
    const kycRequired = config.kycRequired ?? false; // Default false
    
    console.log('Compliance deployment parameters:', {
      tokenAddress,
      jurisdictions,
      complianceLevel,
      maxHoldersPerJurisdiction,
      kycRequired
    });
    
    // Deploy compliance module with correct parameters
    const tx = await factory.deployCompliance(
      tokenAddress,
      jurisdictions,
      complianceLevel,
      maxHoldersPerJurisdiction,
      kycRequired
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'ComplianceModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address from transaction');
    }

    console.log(`NEW compliance module deployed at: ${newModuleAddress}`);
    
    // Attach module to token
    await token.setComplianceModule(newModuleAddress);

    // Post-deployment: Add whitelist addresses if provided
    if (config.whitelistAddresses && Array.isArray(config.whitelistAddresses) && config.whitelistAddresses.length > 0) {
      console.log(`Adding ${config.whitelistAddresses.length} addresses to whitelist...`);
      
      const complianceModule = new ethers.Contract(
        newModuleAddress,
        ['function addToWhitelistBatch(address[] calldata investors, bytes32[] calldata jurisdictions) external'],
        factory.runner
      );
      
      // Use first allowed jurisdiction as default for all addresses
      const defaultJurisdiction = jurisdictions[0] || 'US';
      const jurisdictionBytes = ethers.keccak256(ethers.toUtf8Bytes(defaultJurisdiction));
      const jurisdictionsArray = new Array(config.whitelistAddresses.length).fill(jurisdictionBytes);
      
      try {
        const whitelistTx = await complianceModule.addToWhitelistBatch(
          config.whitelistAddresses,
          jurisdictionsArray
        );
        await whitelistTx.wait();
        console.log('Whitelist addresses added successfully');
      } catch (error) {
        console.error('Failed to add whitelist addresses:', error);
        // Don't fail deployment if whitelist addition fails
      }
    }

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
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
    const tx = await factory.deployVesting(tokenAddress);
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
   * Deploy document module instance
   */
  private static async deployDocumentModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'document_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Document module master not found');
    }

    // NOTE: Document module not yet available in ERC20 extension factory
    // This is a universal module that may require a different factory
    throw new Error('Document module deployment not yet implemented for ERC20 tokens');
  }

  /**
   * Deploy policy engine instance
   */
  private static async deployPolicyEngine(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'policy_engine',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Policy engine master not found');
    }

    // NOTE: Policy engine not yet available in ERC20 extension factory
    // This is a universal module that may require a different factory
    throw new Error('Policy engine deployment not yet implemented for ERC20 tokens');
  }

  // ============ DEPLOYMENT METHODS - ERC20 MODULES ============

  /**
   * Deploy fees module instance (ERC20)
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
    
    // Ensure fee recipient is valid (not empty string, undefined, or placeholder)
    const feeRecipient = config.feeRecipient && 
                         config.feeRecipient.trim() &&
                         config.feeRecipient !== 'DEPLOYER'
      ? config.feeRecipient 
      : deployer.address;
    
    const feeBps = config.transferFeeBps || config.feePercent || 0;
    console.log(`Fee module config: {transferFeeBps: ${feeBps}, feeRecipient: ${feeRecipient}}`);
    
    // UPDATED: New parameter order (feeRecipient, feeBps)
    const tx = await factory.deployFees(
      tokenAddress,
      feeRecipient,
      feeBps
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
   * Deploy flash mint module instance (ERC20)
   */
  private static async deployFlashMintModule(
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
      'flash_mint_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Flash mint module master not found');
    }

    console.log(`Deploying NEW flash mint module instance for token ${tokenAddress}`);
    
    // UPDATED: New parameters (feeRecipient, flashFeeBasisPoints)
    const feeRecipient = config.feeRecipient || deployer.address;
    const flashFeeBasisPoints = config.flashFeeBasisPoints || config.flashFee || 100; // Default 1%
    
    const tx = await factory.deployFlashMint(
      tokenAddress,
      feeRecipient,
      flashFeeBasisPoints
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'FlashMintModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW flash mint module deployed at: ${newModuleAddress}`);
    await token.setFlashMintModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'flash_mint',
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
    const tx = await factory.deployPermit(
      tokenAddress,
      config.name || 'Token',
      config.version || '1'
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'PermitModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW permit module deployed at: ${newModuleAddress}`);
    await token.setPermitModule(newModuleAddress);

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
    const tx = await factory.deploySnapshot(tokenAddress);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'SnapshotModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW snapshot module deployed at: ${newModuleAddress}`);
    await token.setSnapshotModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'snapshot',
      configuration: config
    };
  }

  /**
   * Deploy timelock module instance (ERC20)
   */
  private static async deployTimelockModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'timelock_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Timelock module master not found');
    }

    console.log(`Deploying NEW timelock module instance for token ${tokenAddress}`);
    
    // UPDATED: New parameters (minDuration, maxDuration, allowExtension)
    const minDuration = config.minDuration || config.minDelay || 86400; // Default 1 day
    const maxDuration = config.maxDuration || 2592000; // Default 30 days
    const allowExtension = config.allowExtension ?? false; // Default false
    
    const tx = await factory.deployTimelock(
      tokenAddress,
      minDuration,
      maxDuration,
      allowExtension
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'TimelockModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW timelock module deployed at: ${newModuleAddress}`);
    await token.setTimelockModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'timelock',
      configuration: config
    };
  }

  /**
   * Deploy votes module instance (ERC20)
   * ✅ CORRECTED: All parameters are REQUIRED, proper type handling
   */
  private static async deployVotesModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'votes_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Votes module master not found');
    }

    console.log(`Deploying NEW votes module instance for token ${tokenAddress}`);
    
    // Get token info for naming
    let tokenName = 'Governance Token';
    try {
      tokenName = await token.name();
    } catch (error) {
      console.warn('Could not get token name, using default');
    }
    
    // All governance parameters are REQUIRED by smart contract
    const votingDelay = config.votingDelay ?? 0; // Default: immediate (0 blocks)
    const votingPeriod = config.votingPeriod ?? 50400; // Default: ~1 week (Ethereum)
    const quorumPercentage = config.quorumPercentage ?? 4; // Default: 4%
    
    // Handle proposalThreshold as string or number
    let proposalThreshold: bigint;
    if (typeof config.proposalThreshold === 'string') {
      // If already in wei or large number as string
      if (config.proposalThreshold === '0' || config.proposalThreshold === '') {
        proposalThreshold = BigInt(0);
      } else {
        proposalThreshold = BigInt(config.proposalThreshold);
      }
    } else if (typeof config.proposalThreshold === 'number') {
      proposalThreshold = BigInt(config.proposalThreshold);
    } else {
      proposalThreshold = BigInt(0); // Default: anyone can propose
    }
    
    console.log('Votes deployment parameters:', {
      tokenAddress,
      tokenName,
      votingDelay,
      votingPeriod,
      proposalThreshold: proposalThreshold.toString(),
      quorumPercentage
    });
    
    // Validate parameters
    if (votingDelay < 0) {
      throw new Error('Voting delay must be non-negative');
    }
    if (votingPeriod < 1) {
      throw new Error('Voting period must be at least 1 block');
    }
    if (quorumPercentage < 0.1 || quorumPercentage > 100) {
      throw new Error('Quorum percentage must be between 0.1 and 100');
    }
    
    const tx = await factory.deployVotes(
      tokenAddress,
      tokenName,
      votingDelay,
      votingPeriod,
      proposalThreshold,
      quorumPercentage
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'VotesModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW votes module deployed at: ${newModuleAddress}`);
    await token.setVotesModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'votes',
      configuration: config
    };
  }

  /**
   * Deploy payable token module instance (ERC20)
   */
  private static async deployPayableTokenModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'payable_token_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Payable token module master not found');
    }

    console.log(`Deploying NEW payable token module instance for token ${tokenAddress}`);
    
    // UPDATED: Add callbackGasLimit parameter (verified 2025-12-31)
    const callbackGasLimit = config.callbackGasLimit || 100000; // Default 100K gas
    
    const tx = await factory.deployPayable(
      tokenAddress,
      callbackGasLimit
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'PayableTokenModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW payable token module deployed at: ${newModuleAddress}`);
    await token.setPayableTokenModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'payable_token',
      configuration: config
    };
  }

  /**
   * Deploy temporary approval module instance (ERC20)
   */
  private static async deployTemporaryApprovalModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'temporary_approval_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Temporary approval module master not found');
    }

    console.log(`Deploying NEW temporary approval module instance for token ${tokenAddress}`);
    
    // UPDATED: New duration parameters
    const defaultDuration = config.defaultDuration || 3600; // Default 1 hour
    const minDuration = config.minDuration || 300; // Default 5 minutes
    const maxDuration = config.maxDuration || 604800; // Default 7 days
    
    const tx = await factory.deployTemporaryApproval(
      tokenAddress,
      defaultDuration,
      minDuration,
      maxDuration
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'TemporaryApprovalModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW temporary approval module deployed at: ${newModuleAddress}`);
    await token.setTemporaryApprovalModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'temporary_approval',
      configuration: config
    };
  }

  // ============ DEPLOYMENT METHODS - ERC721 MODULES ============

  /**
   * Deploy royalty module instance (ERC721/ERC1155)
   */
  private static async deployRoyaltyModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'royalty_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Royalty module master not found');
    }

    console.log(`Deploying NEW royalty module instance for token ${tokenAddress}`);
    
    // Extract parameters - UPDATED for ERC721 fix
    const defaultRoyaltyReceiver = config.royaltyRecipient || config.defaultRoyaltyReceiver || tokenAddress;
    const defaultRoyaltyPercentage = config.defaultRoyaltyBps || config.defaultRoyaltyPercentage || 250; // Default 2.5%
    const maxRoyaltyCap = config.maxRoyaltyCap || 1000; // Default 10% max cap
    
    const tx = await factory.deployRoyalty(
      tokenAddress,
      defaultRoyaltyReceiver,
      defaultRoyaltyPercentage,
      maxRoyaltyCap
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'RoyaltyModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW royalty module deployed at: ${newModuleAddress}`);
    await token.setRoyaltyModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'royalty',
      configuration: config
    };
  }

  /**
   * Deploy rental module instance (ERC721)
   */
  private static async deployRentalModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'rental_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Rental module master not found');
    }

    console.log(`Deploying NEW rental module instance for token ${tokenAddress}`);
    
    // Extract parameters - UPDATED for ERC721 fix
    const feeRecipient = config.feeRecipient || tokenAddress;
    const platformFeeBps = config.platformFeeBps || config.feeBps || 250; // Default 2.5%
    const minRentalDuration = config.minRentalDuration || 3600; // Default 1 hour
    const maxRentalDuration = config.maxRentalDuration || 2592000; // Default 30 days
    const minRentalPrice = config.minRentalPrice || 0; // Default 0 (free rentals allowed)
    const depositRequired = config.depositRequired ?? false; // Default false
    const minDepositBps = config.minDepositBps || 1000; // Default 10%
    
    const tx = await factory.deployRental(
      tokenAddress,
      feeRecipient,
      platformFeeBps,
      minRentalDuration,
      maxRentalDuration,
      minRentalPrice,
      depositRequired,
      minDepositBps
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'RentalModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW rental module deployed at: ${newModuleAddress}`);
    await token.setRentalModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'rental',
      configuration: config
    };
  }

  /**
   * Deploy soulbound module instance (ERC721)
   */
  private static async deploySoulboundModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'soulbound_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Soulbound module master not found');
    }

    console.log(`Deploying NEW soulbound module instance for token ${tokenAddress}`);
    
    // Extract parameters - UPDATED for ERC721 fix
    const allowOneTimeTransfer = config.allowOneTimeTransfer ?? false;
    const burnableByOwner = config.burnableByOwner ?? true; // Default true
    const burnableByIssuer = config.burnableByIssuer ?? false;
    const expirationEnabled = config.expirationEnabled ?? false;
    const expirationPeriod = config.expirationPeriod || 0; // Default no expiration
    
    const tx = await factory.deploySoulbound(
      tokenAddress,
      allowOneTimeTransfer,
      burnableByOwner,
      burnableByIssuer,
      expirationEnabled,
      expirationPeriod
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'SoulboundModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW soulbound module deployed at: ${newModuleAddress}`);
    await token.setSoulboundModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'soulbound',
      configuration: config
    };
  }

  /**
   * Deploy fractionalization module instance (ERC721)
   */
  private static async deployFractionModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'fraction_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Fraction module master not found');
    }

    console.log(`Deploying NEW fractionalization module instance for token ${tokenAddress}`);
    
    // UPDATED: New numeric parameters (not address!)
    const minFractions = config.minFractions || 100; // Default 100 fractions min
    const maxFractions = config.maxFractions || 10000; // Default 10k fractions max
    const buyoutMultiplierBps = config.buyoutMultiplierBps || 11000; // Default 110% (10% premium)
    const redemptionEnabled = config.redemptionEnabled ?? true; // Default true
    const fractionPrice = config.fractionPrice || ethers.parseEther('0.01'); // Default 0.01 ETH
    const tradingEnabled = config.tradingEnabled ?? true; // Default true
    
    const tx = await factory.deployFractionalization(
      tokenAddress,
      minFractions,
      maxFractions,
      buyoutMultiplierBps,
      redemptionEnabled,
      fractionPrice,
      tradingEnabled
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'FractionalizationModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW fractionalization module deployed at: ${newModuleAddress}`);
    await token.setFractionModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'fraction',
      configuration: config
    };
  }

  /**
   * Deploy consecutive module instance (ERC721)
   */
  private static async deployConsecutiveModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'consecutive_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Consecutive module master not found');
    }

    console.log(`Deploying NEW consecutive module instance for token ${tokenAddress}`);
    
    // UPDATED: Add startTokenId and maxBatchSize parameters
    const startTokenId = config.startTokenId || 0; // Default start at 0
    const maxBatchSize = config.maxBatchSize || 100; // Default 100 tokens per batch
    
    const tx = await factory.deployConsecutive(
      tokenAddress,
      startTokenId,
      maxBatchSize
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'ConsecutiveModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW consecutive module deployed at: ${newModuleAddress}`);
    await token.setConsecutiveModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'consecutive',
      configuration: config
    };
  }

  /**
   * Deploy metadata events module instance (ERC721)
   */
  private static async deployMetadataEventsModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'metadata_events_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Metadata events module master not found');
    }

    console.log(`Deploying NEW metadata events module instance for token ${tokenAddress}`);
    
    // UPDATED: Add batchUpdatesEnabled and emitOnTransfer parameters
    const batchUpdatesEnabled = config.batchUpdatesEnabled ?? true; // Default true
    const emitOnTransfer = config.emitOnTransfer ?? false; // Default false
    
    const tx = await factory.deployMetadata(
      tokenAddress,
      batchUpdatesEnabled,
      emitOnTransfer
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'MetadataModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW metadata events module deployed at: ${newModuleAddress}`);
    await token.setMetadataEventsModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'metadata_events',
      configuration: config
    };
  }

  /**
   * Deploy granular approval module instance (ERC721)
   */
  private static async deployGranularApprovalModule(
    factory: ethers.Contract,
    token: ethers.Contract,
    tokenAddress: string,
    tokenId: string,
    config: any,
    network: string,
    environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata(
      'granular_approval_module',
      network,
      environment
    );

    if (!masterModule) {
      throw new Error('Granular approval module master not found');
    }

    console.log(`Deploying NEW granular approval module instance for token ${tokenAddress}`);
    
    // Factory signature: deployGranularApproval(address token)
    // Module expects: initialize(address tokenContract, address admin)
    // NOTE: Factory handles parameter order correctly (no config needed)
    
    const tx = await factory.deployGranularApproval(tokenAddress);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (log: any) => log.eventName === 'GranularApprovalModuleDeployed'
    );
    const newModuleAddress = event?.args?.moduleAddress;

    if (!newModuleAddress) {
      throw new Error('Failed to get deployed module address');
    }

    console.log(`NEW granular approval module deployed at: ${newModuleAddress}`);
    await token.setGranularApprovalModule(newModuleAddress);

    return {
      moduleAddress: newModuleAddress,
      masterAddress: masterModule.contractAddress,
      deploymentTxHash: receipt.hash,
      moduleType: 'granular_approval',
      configuration: config
    };
  }

  // ============ ERC1155 MODULES ============

  private static async deploySupplyCapModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('supply_cap_module', network, environment);
    if (!masterModule) throw new Error('Supply cap module master not found');
    
    // UPDATED: Use globalCap instead of defaultCap to match factory signature
    const globalCap = config.globalCap || config.defaultCap || 0;
    
    const tx = await factory.deploySupplyCap(tokenAddress, globalCap);
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'SupplyCapExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setSupplyCapModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'supply_cap', configuration: config };
  }

  private static async deployUriManagementModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('uri_management_module', network, environment);
    if (!masterModule) throw new Error('URI management module master not found');
    
    // UPDATED: Add ipfsGateway parameter to match factory signature
    const baseURI = config.baseURI || '';
    const ipfsGateway = config.ipfsGateway || 'https://ipfs.io/ipfs/';
    
    // FIXED: Use correct factory method name (deployURIManagement not attachURIManagement)
    const tx = await factory.deployURIManagement(tokenAddress, baseURI, ipfsGateway);
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'URIManagementExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setUriManagementModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'uri_management', configuration: config };
  }

  // ============ ERC3525 MODULES ============

  private static async deploySlotApprovableModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('slot_approvable_module', network, environment);
    if (!masterModule) throw new Error('Slot approvable module master not found');
    
    const tx = await factory.deploySlotApprovableModule(tokenAddress);
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'SlotApprovableModuleDeployed')?.args?.moduleAddress;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setSlotApprovableModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'slot_approvable', configuration: config };
  }

  private static async deploySlotManagerModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('slot_manager_module', network, environment);
    if (!masterModule) throw new Error('Slot manager module master not found');
    
    // Extract slot configuration from config (with defaults)
    const allowDynamicSlotCreation = config.allowDynamicSlotCreation ?? true;
    const restrictCrossSlot = config.restrictCrossSlot ?? false;
    const allowSlotMerging = config.allowSlotMerging ?? false;
    
    const tx = await factory.deploySlotManagerModule(
      tokenAddress,
      allowDynamicSlotCreation,
      restrictCrossSlot,
      allowSlotMerging
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'SlotManagerModuleDeployed')?.args?.moduleAddress;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setSlotManagerModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'slot_manager', configuration: config };
  }

  private static async deployValueExchangeModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('value_exchange_module', network, environment);
    if (!masterModule) throw new Error('Value exchange module master not found');
    
    // Exchange rates configured post-deployment via setExchangeRate(fromSlot, toSlot, rate)
    const tx = await factory.deployValueExchangeModule(tokenAddress);
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'ValueExchangeModuleDeployed')?.args?.moduleAddress;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setValueExchangeModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'value_exchange', configuration: config };
  }

  // ============ ERC4626 MODULES ============

  private static async deployFeeStrategyModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('fee_strategy_module', network, environment);
    if (!masterModule) throw new Error('Fee strategy module master not found');
    
    // UPDATED: Match new factory signature (managementFeeBps, performanceFeeBps, withdrawalFeeBps, feeRecipient)
    const managementFeeBps = config.managementFeeBps || config.managementFee || 100; // Default 1% annual
    const performanceFeeBps = config.performanceFeeBps || config.performanceFee || 2000; // Default 20%
    const withdrawalFeeBps = config.withdrawalFeeBps || config.withdrawalFee || 50; // Default 0.5%
    const feeRecipient = config.feeRecipient || config.recipient || ethers.ZeroAddress; // Will be set later
    
    const tx = await factory.deployFeeStrategy(
      tokenAddress, 
      managementFeeBps, 
      performanceFeeBps,
      withdrawalFeeBps,
      feeRecipient
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'FeeStrategyExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setFeeStrategyModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'fee_strategy', configuration: config };
  }

  private static async deployWithdrawalQueueModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('withdrawal_queue_module', network, environment);
    if (!masterModule) throw new Error('Withdrawal queue module master not found');
    
    // UPDATED: Add 6 missing parameters
    const liquidityBuffer = config.liquidityBuffer || ethers.parseEther('1000'); // Default 1000 asset units
    const maxQueueSize = config.maxQueueSize || 1000; // Default 1000 requests
    const minWithdrawalDelay = config.minWithdrawalDelay || 3600; // Default 1 hour
    const minWithdrawalAmount = config.minWithdrawalAmount || 0; // Default no minimum
    const maxWithdrawalAmount = config.maxWithdrawalAmount || 0; // Default no maximum
    const priorityFeeBps = config.priorityFeeBps || 100; // Default 1% priority fee
    
    const tx = await factory.deployWithdrawalQueue(
      tokenAddress,
      liquidityBuffer,
      maxQueueSize,
      minWithdrawalDelay,
      minWithdrawalAmount,
      maxWithdrawalAmount,
      priorityFeeBps
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'WithdrawalQueueExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setWithdrawalQueueModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'withdrawal_queue', configuration: config };
  }

  private static async deployYieldStrategyModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('yield_strategy_module', network, environment);
    if (!masterModule) throw new Error('Yield strategy module master not found');
    
    // UPDATED: Change from (strategyType, strategyParams) to (harvestFrequency, rebalanceThreshold)
    const harvestFrequency = config.harvestFrequency || 86400; // Default 24 hours
    const rebalanceThreshold = config.rebalanceThreshold || 500; // Default 5% drift threshold
    
    const tx = await factory.deployYieldStrategy(
      tokenAddress,
      harvestFrequency,
      rebalanceThreshold
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'YieldStrategyExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setYieldStrategyModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'yield_strategy', configuration: config };
  }

  private static async deployAsyncVaultModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('async_vault_module', network, environment);
    if (!masterModule) throw new Error('Async vault module master not found');
    
    // UPDATED: Add 5 missing async operation parameters
    const minimumFulfillmentDelay = config.minimumFulfillmentDelay || config.settlementDelay || 86400; // Default 24 hours
    const maxPendingRequestsPerUser = config.maxPendingRequestsPerUser || 10; // Default 10 requests
    const requestExpiry = config.requestExpiry || 2592000; // Default 30 days (0 = no expiry)
    const minimumRequestAmount = config.minimumRequestAmount || 0; // Default no minimum
    const partialFulfillmentEnabled = config.partialFulfillmentEnabled ?? true; // Default true
    
    const tx = await factory.deployAsyncVault(
      tokenAddress,
      minimumFulfillmentDelay,
      maxPendingRequestsPerUser,
      requestExpiry,
      minimumRequestAmount,
      partialFulfillmentEnabled
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'AsyncVaultExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setAsyncVaultModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'async_vault', configuration: config };
  }

  private static async deployNativeVaultModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('native_vault_module', network, environment);
    if (!masterModule) throw new Error('Native vault module master not found');
    
    // UPDATED: Add 3 missing ETH wrapping parameters
    // Get WETH address for current network (must be configured in config or use standard addresses)
    const weth = config.weth || ethers.ZeroAddress; // Must be provided for network
    const acceptNativeToken = config.acceptNativeToken ?? true; // Default enable native ETH deposits
    const unwrapOnWithdrawal = config.unwrapOnWithdrawal ?? true; // Default auto-unwrap to ETH
    
    const tx = await factory.deployNativeVault(
      tokenAddress,
      weth,
      acceptNativeToken,
      unwrapOnWithdrawal
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'NativeVaultExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setNativeVaultModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'native_vault', configuration: config };
  }

  private static async deployRouterModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('router_module', network, environment);
    if (!masterModule) throw new Error('Router module master not found');
    
    // UPDATED: Change from (vault) to (vault, allowMultiHop, maxHops, slippageTolerance)
    const allowMultiHop = config.allowMultiHop ?? true; // Default enable multi-hop routing
    const maxHops = config.maxHops || 3; // Default 3 hops (0 = unlimited)
    const slippageTolerance = config.slippageTolerance || 100; // Default 1% slippage (basis points)
    
    const tx = await factory.deployRouter(
      tokenAddress,
      allowMultiHop,
      maxHops,
      slippageTolerance
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'RouterExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setRouterModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'router', configuration: config };
  }

  private static async deployMultiAssetVaultModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('multi_asset_vault_module', network, environment);
    if (!masterModule) throw new Error('Multi-asset vault module master not found');
    
    // UPDATED: Change from (vault, supportedAssets[]) to (vault, priceOracle, baseAsset)
    // Assets are added post-deployment via addAsset() function
    const priceOracle = config.priceOracle || ethers.ZeroAddress; // Must be provided
    const baseAsset = config.baseAsset || ethers.ZeroAddress; // Must be provided (e.g., USDC, WETH)
    
    const tx = await factory.deployMultiAssetVault(
      tokenAddress,
      priceOracle,
      baseAsset
    );
    const receipt = await tx.wait();
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'MultiAssetVaultExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setMultiAssetVaultModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'multi_asset_vault', configuration: config };
  }

  // ============ ERC1400 MODULES ============

  private static async deployTransferRestrictionsModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('transfer_restrictions_module', network, environment);
    if (!masterModule) throw new Error('Transfer restrictions module master not found');
    
    // Fixed: deployTransferRestrictions now only takes tokenAddress (no defaultPartitions)
    const tx = await factory.deployTransferRestrictions(tokenAddress);
    const receipt = await tx.wait();
    // Fixed: Updated event name to match factory
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'TransferRestrictionsExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setTransferRestrictionsModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'transfer_restrictions', configuration: config };
  }

  private static async deployControllerModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('controller_module', network, environment);
    if (!masterModule) throw new Error('Controller module master not found');
    
    // Fixed: deployController now takes (tokenAddress, controllable) instead of (tokenAddress, controllers[])
    const controllable = config.controllable !== undefined ? config.controllable : true; // Default to controllable
    const tx = await factory.deployController(tokenAddress, controllable);
    const receipt = await tx.wait();
    // Fixed: Updated event name to match factory
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'ControllerExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setControllerModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'controller', configuration: config };
  }

  private static async deployERC1400DocumentModule(
    factory: ethers.Contract, token: ethers.Contract, tokenAddress: string,
    tokenId: string, config: any, network: string, environment: string
  ): Promise<ModuleDeploymentResult> {
    const masterModule = await ModuleRegistryService.getModuleMetadata('erc1400_document_module', network, environment);
    if (!masterModule) throw new Error('ERC1400 document module master not found');
    
    // Fixed: deployDocument now only takes tokenAddress (no extra params)
    const tx = await factory.deployDocument(tokenAddress);
    const receipt = await tx.wait();
    // Fixed: Updated event name to match factory
    const newModuleAddress = receipt.logs.find((log: any) => log.eventName === 'DocumentExtensionDeployed')?.args?.extension;
    if (!newModuleAddress) throw new Error('Failed to get deployed module address');
    
    await token.setERC1400DocumentModule(newModuleAddress);
    return { moduleAddress: newModuleAddress, masterAddress: masterModule.contractAddress, deploymentTxHash: receipt.hash, moduleType: 'erc1400_document', configuration: config };
  }

  // ============ HELPER METHODS ============

  private static async saveModuleDeployments(tokenId: string, modules: ModuleDeploymentResult[]): Promise<void> {
    const records = modules.map(module => ({
      token_id: tokenId,
      module_type: module.moduleType,
      module_address: module.moduleAddress,
      master_address: module.masterAddress,
      deployment_tx_hash: module.deploymentTxHash,
      configuration: module.configuration,
      is_active: true,
      deployed_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('token_modules').insert(records);
    if (error) {
      console.error('Failed to save module deployments:', error);
      throw new Error(`Failed to save module deployments: ${error.message}`);
    }
    console.log(`Saved ${modules.length} module deployments to database`);
  }

  private static async getFactoryABI(factoryAddress: string, network: string, environment: string): Promise<any> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_address', factoryAddress.toLowerCase())
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Factory ABI lookup failed:', { factoryAddress, network, environment, error });
      throw new Error(`Factory ABI not found for address ${factoryAddress}`);
    }
    return data.abi;
  }

  private static async getTokenABI(tokenStandard: string, network: string, environment: string): Promise<any> {
    const contractType = `${tokenStandard}_master`;
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('contract_type', contractType)
      .eq('network', network)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new Error(`${tokenStandard} master ABI not found`);
    return data.abi;
  }
}
