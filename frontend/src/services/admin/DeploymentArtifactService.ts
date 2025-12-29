/**
 * Deployment Artifact Service
 * 
 * Handles reading and parsing Foundry deployment artifacts and compiled outputs.
 * Extracts ABIs, tracks deployment history, and manages verification status.
 * 
 * The blockchain is the single source of truth - this service syncs the database
 * to reflect on-chain deployments.
 */

import { supabase } from '@/infrastructure/database/client';
import { rpcManager } from '@/infrastructure/web3/rpc';
import type { SupportedChain, NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { CHAIN_IDS, getChainName } from '@/infrastructure/web3/utils/chainIds';

// ============================================
// Types
// ============================================

/** Structure of Foundry deployment JSON files */
export interface FoundryDeployment {
  [contractKey: string]: string; // contractKey -> address mapping
}

/** Structure of Foundry compiled artifact (from out/ folder) */
export interface CompiledArtifact {
  abi: unknown[];
  bytecode: {
    object: string;
    sourceMap: string;
    linkReferences: Record<string, unknown>;
  };
  deployedBytecode: {
    object: string;
    sourceMap: string;
    linkReferences: Record<string, unknown>;
  };
  methodIdentifiers: Record<string, string>;
  metadata: {
    compiler: {
      version: string;
    };
    language: string;
    output: unknown;
    settings: unknown;
    sources: Record<string, unknown>;
    version: number;
  };
}

/** Contract category configuration */
export interface ContractCategory {
  type: 'master' | 'beacon' | 'factory' | 'extensionFactory' | 'module' | 'infrastructure' | 'governance' | 'deployer' | 'other';
  standard?: string;
  description: string;
  isTemplate: boolean;
  sourcePath: string;
}

/** Contract metadata for import */
export interface ContractMetadata {
  contractKey: string;
  contractType: string;
  contractAddress: string;
  category: ContractCategory;
  abi?: unknown[];
  abiHash?: string;
  deploymentTxHash?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  verificationUrl?: string;
}

/** Deployment record for history tracking */
export interface DeploymentRecord {
  id?: string;
  network: string;
  environment: string;
  deploymentLabel: string;
  deploymentFile: string;
  deployedAt: Date;
  deployedBy?: string;
  contractCount: number;
  verified: boolean;
  metadata?: Record<string, unknown>;
}

/** Import options */
export interface ImportOptions {
  overwrite?: boolean;
  includeAbi?: boolean;
  verifyAfterImport?: boolean;
  deploymentLabel?: string;
}

/** Import result */
export interface ArtifactImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  contracts: ContractMetadata[];
  deploymentId?: string;
}

// ============================================
// Contract Type Mappings
// ============================================

/**
 * Complete mapping from deployment JSON keys to contract metadata.
 * Includes source paths for ABI extraction from out/ folder.
 */
export const CONTRACT_MAPPINGS: Record<string, ContractCategory> = {
  // Infrastructure
  policyEngine: { type: 'infrastructure', description: 'Policy Engine', isTemplate: false, sourcePath: 'PolicyEngine.sol/PolicyEngine.json' },
  policyRegistry: { type: 'infrastructure', description: 'Policy Registry', isTemplate: false, sourcePath: 'PolicyRegistry.sol/PolicyRegistry.json' },
  tokenRegistry: { type: 'infrastructure', description: 'Token Registry', isTemplate: false, sourcePath: 'TokenRegistry.sol/TokenRegistry.json' },
  extensionRegistry: { type: 'infrastructure', description: 'Extension Registry', isTemplate: false, sourcePath: 'ExtensionRegistry.sol/ExtensionRegistry.json' },
  factoryRegistry: { type: 'infrastructure', description: 'Factory Registry', isTemplate: false, sourcePath: 'FactoryRegistry.sol/FactoryRegistry.json' },
  haircutEngine: { type: 'infrastructure', description: 'Haircut Engine', isTemplate: false, sourcePath: 'HaircutEngine.sol/HaircutEngine.json' },
  
  // Masters
  erc20Master: { type: 'master', standard: 'ERC20', description: 'ERC-20 Master', isTemplate: true, sourcePath: 'ERC20Master.sol/ERC20Master.json' },
  erc721Master: { type: 'master', standard: 'ERC721', description: 'ERC-721 Master', isTemplate: true, sourcePath: 'ERC721Master.sol/ERC721Master.json' },
  erc1155Master: { type: 'master', standard: 'ERC1155', description: 'ERC-1155 Master', isTemplate: true, sourcePath: 'ERC1155Master.sol/ERC1155Master.json' },
  erc1400Master: { type: 'master', standard: 'ERC1400', description: 'ERC-1400 Master', isTemplate: true, sourcePath: 'ERC1400Master.sol/ERC1400Master.json' },
  erc3525Master: { type: 'master', standard: 'ERC3525', description: 'ERC-3525 Master', isTemplate: true, sourcePath: 'ERC3525Master.sol/ERC3525Master.json' },
  erc4626Master: { type: 'master', standard: 'ERC4626', description: 'ERC-4626 Master', isTemplate: true, sourcePath: 'ERC4626Master.sol/ERC4626Master.json' },
  erc20RebasingMaster: { type: 'master', standard: 'ERC20', description: 'ERC-20 Rebasing Master', isTemplate: true, sourcePath: 'ERC20RebasingMaster.sol/ERC20RebasingMaster.json' },
  erc20WrapperMaster: { type: 'master', standard: 'ERC20', description: 'ERC-20 Wrapper Master', isTemplate: true, sourcePath: 'ERC20WrapperMaster.sol/ERC20WrapperMaster.json' },
  erc721WrapperMaster: { type: 'master', standard: 'ERC721', description: 'ERC-721 Wrapper Master', isTemplate: true, sourcePath: 'ERC721WrapperMaster.sol/ERC721WrapperMaster.json' },

  // Beacons
  erc20Beacon: { type: 'beacon', standard: 'ERC20', description: 'ERC-20 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc721Beacon: { type: 'beacon', standard: 'ERC721', description: 'ERC-721 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc1155Beacon: { type: 'beacon', standard: 'ERC1155', description: 'ERC-1155 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc1400Beacon: { type: 'beacon', standard: 'ERC1400', description: 'ERC-1400 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc3525Beacon: { type: 'beacon', standard: 'ERC3525', description: 'ERC-3525 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc4626Beacon: { type: 'beacon', standard: 'ERC4626', description: 'ERC-4626 Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc20RebasingBeacon: { type: 'beacon', standard: 'ERC20', description: 'ERC-20 Rebasing Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc20WrapperBeacon: { type: 'beacon', standard: 'ERC20', description: 'ERC-20 Wrapper Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  erc721WrapperBeacon: { type: 'beacon', standard: 'ERC721', description: 'ERC-721 Wrapper Beacon', isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' },
  
  // Token Factories
  erc20Factory: { type: 'factory', standard: 'ERC20', description: 'ERC-20 Factory', isTemplate: false, sourcePath: 'ERC20Factory.sol/ERC20Factory.json' },
  erc721Factory: { type: 'factory', standard: 'ERC721', description: 'ERC-721 Factory', isTemplate: false, sourcePath: 'ERC721Factory.sol/ERC721Factory.json' },
  erc1155Factory: { type: 'factory', standard: 'ERC1155', description: 'ERC-1155 Factory', isTemplate: false, sourcePath: 'ERC1155Factory.sol/ERC1155Factory.json' },
  erc1400Factory: { type: 'factory', standard: 'ERC1400', description: 'ERC-1400 Factory', isTemplate: false, sourcePath: 'ERC1400Factory.sol/ERC1400Factory.json' },
  erc3525Factory: { type: 'factory', standard: 'ERC3525', description: 'ERC-3525 Factory', isTemplate: false, sourcePath: 'ERC3525Factory.sol/ERC3525Factory.json' },
  erc4626Factory: { type: 'factory', standard: 'ERC4626', description: 'ERC-4626 Factory', isTemplate: false, sourcePath: 'ERC4626Factory.sol/ERC4626Factory.json' },
  erc20WrapperFactory: { type: 'factory', standard: 'ERC20', description: 'ERC-20 Wrapper Factory', isTemplate: false, sourcePath: 'ERC20WrapperFactory.sol/ERC20WrapperFactory.json' },
  erc721WrapperFactory: { type: 'factory', standard: 'ERC721', description: 'ERC-721 Wrapper Factory', isTemplate: false, sourcePath: 'ERC721WrapperFactory.sol/ERC721WrapperFactory.json' },

  // Extension Factories
  erc20ExtensionFactory: { type: 'extensionFactory', standard: 'ERC20', description: 'ERC-20 Extension Factory', isTemplate: false, sourcePath: 'ERC20ExtensionFactory.sol/ERC20ExtensionFactory.json' },
  erc721ExtensionFactory: { type: 'extensionFactory', standard: 'ERC721', description: 'ERC-721 Extension Factory', isTemplate: false, sourcePath: 'ERC721ExtensionFactory.sol/ERC721ExtensionFactory.json' },
  erc1155ExtensionFactory: { type: 'extensionFactory', standard: 'ERC1155', description: 'ERC-1155 Extension Factory', isTemplate: false, sourcePath: 'ERC1155ExtensionFactory.sol/ERC1155ExtensionFactory.json' },
  erc1400ExtensionFactory: { type: 'extensionFactory', standard: 'ERC1400', description: 'ERC-1400 Extension Factory', isTemplate: false, sourcePath: 'ERC1400ExtensionFactory.sol/ERC1400ExtensionFactory.json' },
  erc3525ExtensionFactory: { type: 'extensionFactory', standard: 'ERC3525', description: 'ERC-3525 Extension Factory', isTemplate: false, sourcePath: 'ERC3525ExtensionFactory.sol/ERC3525ExtensionFactory.json' },
  erc4626ExtensionFactory: { type: 'extensionFactory', standard: 'ERC4626', description: 'ERC-4626 Extension Factory', isTemplate: false, sourcePath: 'ERC4626ExtensionFactory.sol/ERC4626ExtensionFactory.json' },
  universalExtensionFactory: { type: 'extensionFactory', description: 'Universal Extension Factory', isTemplate: false, sourcePath: 'UniversalExtensionFactory.sol/UniversalExtensionFactory.json' },
  
  // Deployers
  create2Deployer: { type: 'deployer', description: 'CREATE2 Deployer', isTemplate: false, sourcePath: 'CREATE2Deployer.sol/CREATE2Deployer.json' },
  universalDeployer: { type: 'deployer', description: 'Universal Deployer', isTemplate: false, sourcePath: 'UniversalDeployer.sol/UniversalDeployer.json' },
  beaconProxyFactory: { type: 'deployer', description: 'Beacon Proxy Factory', isTemplate: false, sourcePath: 'BeaconProxyFactory.sol/BeaconProxyFactory.json' },
  
  // Governance
  upgradeGovernor: { type: 'governance', description: 'Upgrade Governor', isTemplate: false, sourcePath: 'UpgradeGovernor.sol/UpgradeGovernor.json' },
  upgradeGovernance: { type: 'governance', description: 'Upgrade Governance', isTemplate: false, sourcePath: 'UpgradeGovernance.sol/UpgradeGovernance.json' },
  multiSigWallet: { type: 'governance', description: 'Multi-Sig Wallet', isTemplate: false, sourcePath: 'MultiSigWallet.sol/MultiSigWallet.json' },
  multiSigWalletFactory: { type: 'governance', description: 'Multi-Sig Factory', isTemplate: false, sourcePath: 'MultiSigWalletFactory.sol/MultiSigWalletFactory.json' },

  // Extension Modules
  complianceModule: { type: 'module', standard: 'ERC20', description: 'Compliance Module', isTemplate: true, sourcePath: 'ERC20ComplianceModule.sol/ERC20ComplianceModule.json' },
  consecutiveModule: { type: 'module', standard: 'ERC721', description: 'Consecutive Module', isTemplate: true, sourcePath: 'ERC721ConsecutiveModule.sol/ERC721ConsecutiveModule.json' },
  documentModule: { type: 'module', description: 'Document Module', isTemplate: true, sourcePath: 'UniversalDocumentModule.sol/UniversalDocumentModule.json' },
  erc1400ControllerModule: { type: 'module', standard: 'ERC1400', description: 'ERC-1400 Controller Module', isTemplate: true, sourcePath: 'ERC1400ControllerModule.sol/ERC1400ControllerModule.json' },
  erc1400DocumentModule: { type: 'module', standard: 'ERC1400', description: 'ERC-1400 Document Module', isTemplate: true, sourcePath: 'ERC1400DocumentModule.sol/ERC1400DocumentModule.json' },
  erc1400TransferRestrictionsModule: { type: 'module', standard: 'ERC1400', description: 'ERC-1400 Transfer Restrictions', isTemplate: true, sourcePath: 'ERC1400TransferRestrictionsModule.sol/ERC1400TransferRestrictionsModule.json' },
  erc3525SlotApprovableModule: { type: 'module', standard: 'ERC3525', description: 'ERC-3525 Slot Approvable', isTemplate: true, sourcePath: 'ERC3525SlotApprovableModule.sol/ERC3525SlotApprovableModule.json' },
  erc3525SlotManagerModule: { type: 'module', standard: 'ERC3525', description: 'ERC-3525 Slot Manager', isTemplate: true, sourcePath: 'ERC3525SlotManagerModule.sol/ERC3525SlotManagerModule.json' },
  erc3525ValueExchangeModule: { type: 'module', standard: 'ERC3525', description: 'ERC-3525 Value Exchange', isTemplate: true, sourcePath: 'ERC3525ValueExchangeModule.sol/ERC3525ValueExchangeModule.json' },
  erc4626FeeStrategyModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Fee Strategy', isTemplate: true, sourcePath: 'ERC4626FeeStrategyModule.sol/ERC4626FeeStrategyModule.json' },
  erc4626WithdrawalQueueModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Withdrawal Queue', isTemplate: true, sourcePath: 'ERC4626WithdrawalQueueModule.sol/ERC4626WithdrawalQueueModule.json' },
  erc4626YieldStrategyModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Yield Strategy', isTemplate: true, sourcePath: 'ERC4626YieldStrategyModule.sol/ERC4626YieldStrategyModule.json' },
  erc4626AsyncVaultModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Async Vault', isTemplate: true, sourcePath: 'ERC7540AsyncVaultModule.sol/ERC7540AsyncVaultModule.json' },
  erc4626NativeVaultModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Native Vault', isTemplate: true, sourcePath: 'ERC7535NativeVaultModule.sol/ERC7535NativeVaultModule.json' },
  erc4626RouterModule: { type: 'module', standard: 'ERC4626', description: 'ERC-4626 Router', isTemplate: true, sourcePath: 'ERC4626Router.sol/ERC4626Router.json' },
  feeModule: { type: 'module', standard: 'ERC20', description: 'Fee Module', isTemplate: true, sourcePath: 'ERC20FeeModule.sol/ERC20FeeModule.json' },
  flashMintModule: { type: 'module', standard: 'ERC20', description: 'Flash Mint Module', isTemplate: true, sourcePath: 'ERC20FlashMintModule.sol/ERC20FlashMintModule.json' },
  fractionModule: { type: 'module', standard: 'ERC721', description: 'Fractionalization Module', isTemplate: true, sourcePath: 'ERC721FractionModule.sol/ERC721FractionModule.json' },
  granularApprovalModule: { type: 'module', description: 'Granular Approval Module', isTemplate: true, sourcePath: 'ERC5216GranularApprovalModule.sol/ERC5216GranularApprovalModule.json' },
  metadataEventsModule: { type: 'module', description: 'Metadata Events Module', isTemplate: true, sourcePath: 'ERC4906MetadataModule.sol/ERC4906MetadataModule.json' },
  multiAssetVaultModule: { type: 'module', standard: 'ERC4626', description: 'Multi-Asset Vault Module', isTemplate: true, sourcePath: 'ERC7575MultiAssetVaultModule.sol/ERC7575MultiAssetVaultModule.json' },
  payableModule: { type: 'module', standard: 'ERC20', description: 'Payable Module', isTemplate: true, sourcePath: 'ERC1363PayableToken.sol/ERC1363PayableToken.json' },
  permitModule: { type: 'module', standard: 'ERC20', description: 'Permit Module', isTemplate: true, sourcePath: 'ERC20PermitModule.sol/ERC20PermitModule.json' },
  rentalModule: { type: 'module', standard: 'ERC721', description: 'Rental Module', isTemplate: true, sourcePath: 'ERC721RentalModule.sol/ERC721RentalModule.json' },
  erc1155RoyaltyModule: { type: 'module', standard: 'ERC1155', description: 'ERC-1155 Royalty Module', isTemplate: true, sourcePath: 'ERC1155RoyaltyModule.sol/ERC1155RoyaltyModule.json' },
  erc721RoyaltyModule: { type: 'module', standard: 'ERC721', description: 'ERC-721 Royalty Module', isTemplate: true, sourcePath: 'ERC721RoyaltyModule.sol/ERC721RoyaltyModule.json' },
  snapshotModule: { type: 'module', standard: 'ERC20', description: 'Snapshot Module', isTemplate: true, sourcePath: 'ERC20SnapshotModule.sol/ERC20SnapshotModule.json' },
  soulboundModule: { type: 'module', standard: 'ERC721', description: 'Soulbound Module', isTemplate: true, sourcePath: 'ERC721SoulboundModule.sol/ERC721SoulboundModule.json' },
  supplyCapModule: { type: 'module', standard: 'ERC1155', description: 'Supply Cap Module', isTemplate: true, sourcePath: 'ERC1155SupplyCapModule.sol/ERC1155SupplyCapModule.json' },
  temporaryApprovalModule: { type: 'module', standard: 'ERC20', description: 'Temporary Approval Module', isTemplate: true, sourcePath: 'ERC20TemporaryApprovalModule.sol/ERC20TemporaryApprovalModule.json' },
  timelockModule: { type: 'module', standard: 'ERC20', description: 'Timelock Module', isTemplate: true, sourcePath: 'ERC20TimelockModule.sol/ERC20TimelockModule.json' },
  uriManagementModule: { type: 'module', standard: 'ERC1155', description: 'URI Management Module', isTemplate: true, sourcePath: 'ERC1155URIModule.sol/ERC1155URIModule.json' },
  vestingModule: { type: 'module', standard: 'ERC20', description: 'Vesting Module', isTemplate: true, sourcePath: 'ERC20VestingModule.sol/ERC20VestingModule.json' },
  votesModule: { type: 'module', standard: 'ERC20', description: 'Votes Module', isTemplate: true, sourcePath: 'ERC20VotesModule.sol/ERC20VotesModule.json' },
};

// ============================================
// Network Configurations
// ============================================

export interface NetworkConfig {
  chainId: number;
  chainName: SupportedChain;
  networkType: NetworkType;
  explorerUrl: string;
  explorerApiUrl?: string;
  name: string;
  environment: 'mainnet' | 'testnet';
}

/**
 * Get RPC URL for a network configuration
 * Uses the centralized RPC manager instead of hardcoded URLs
 */
function getRpcUrlForNetwork(config: NetworkConfig): string | null {
  return rpcManager.getRPCUrl(config.chainName, config.networkType);
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  hoodi: {
    chainId: CHAIN_IDS.hoodi,
    chainName: 'hoodi' as SupportedChain,
    networkType: 'testnet',
    explorerUrl: 'https://hoodi.etherscan.io',
    explorerApiUrl: 'https://api-hoodi.etherscan.io/api',
    name: 'Hoodi Testnet',
    environment: 'testnet'
  },
  sepolia: {
    chainId: CHAIN_IDS.sepolia,
    chainName: 'sepolia' as SupportedChain,
    networkType: 'testnet',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    name: 'Sepolia Testnet',
    environment: 'testnet'
  },
  ethereum: {
    chainId: CHAIN_IDS.ethereum,
    chainName: 'ethereum' as SupportedChain,
    networkType: 'mainnet',
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    name: 'Ethereum Mainnet',
    environment: 'mainnet'
  },
  polygon: {
    chainId: CHAIN_IDS.polygon,
    chainName: 'polygon' as SupportedChain,
    networkType: 'mainnet',
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    name: 'Polygon',
    environment: 'mainnet'
  },
  arbitrum: {
    chainId: CHAIN_IDS.arbitrumOne,
    chainName: 'arbitrum' as SupportedChain,
    networkType: 'mainnet',
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    name: 'Arbitrum One',
    environment: 'mainnet'
  },
  injective: {
    chainId: CHAIN_IDS.injective,
    chainName: 'injective' as SupportedChain,
    networkType: 'mainnet',
    explorerUrl: 'https://explorer.injective.network',
    explorerApiUrl: 'https://api.injective.network/api',
    name: 'Injective',
    environment: 'mainnet'
  },
  injectiveTestnet: {
    chainId: CHAIN_IDS.injectiveTestnet,
    chainName: 'injective' as SupportedChain,
    networkType: 'testnet',
    explorerUrl: 'https://testnet.explorer.injective.network',
    explorerApiUrl: 'https://testnet-api.injective.network/api',
    name: 'Injective Testnet',
    environment: 'testnet'
  }
};

// ============================================
// Service Class
// ============================================

export class DeploymentArtifactService {
  /**
   * Parse deployment JSON content and extract contract metadata
   */
  static parseDeploymentJson(
    jsonContent: string,
    network: string
  ): ContractMetadata[] {
    const deployment: FoundryDeployment = JSON.parse(jsonContent);
    const contracts: ContractMetadata[] = [];

    for (const [key, address] of Object.entries(deployment)) {
      const category = CONTRACT_MAPPINGS[key] || this.inferCategory(key);
      const contractType = this.toSnakeCase(key);

      contracts.push({
        contractKey: key,
        contractType,
        contractAddress: address.toLowerCase(),
        category
      });
    }

    return contracts;
  }

  /**
   * Convert camelCase to snake_case
   */
  private static toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  /**
   * Infer category from contract key name
   */
  private static inferCategory(key: string): ContractCategory {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('master')) {
      const standard = this.extractStandard(key);
      return { type: 'master', standard, description: `${key} Master`, isTemplate: true, sourcePath: '' };
    }
    if (lowerKey.includes('beacon')) {
      const standard = this.extractStandard(key);
      return { type: 'beacon', standard, description: `${key} Beacon`, isTemplate: false, sourcePath: 'TokenBeacon.sol/TokenBeacon.json' };
    }
    if (lowerKey.includes('extensionfactory')) {
      const standard = this.extractStandard(key);
      return { type: 'extensionFactory', standard, description: `${key}`, isTemplate: false, sourcePath: '' };
    }
    if (lowerKey.includes('factory')) {
      const standard = this.extractStandard(key);
      return { type: 'factory', standard, description: `${key}`, isTemplate: false, sourcePath: '' };
    }
    if (lowerKey.includes('module')) {
      const standard = this.extractStandard(key);
      return { type: 'module', standard, description: `${key}`, isTemplate: true, sourcePath: '' };
    }
    if (lowerKey.includes('registry') || lowerKey.includes('engine')) {
      return { type: 'infrastructure', description: key, isTemplate: false, sourcePath: '' };
    }
    if (lowerKey.includes('governor') || lowerKey.includes('multisig') || lowerKey.includes('governance')) {
      return { type: 'governance', description: key, isTemplate: false, sourcePath: '' };
    }
    if (lowerKey.includes('deployer')) {
      return { type: 'deployer', description: key, isTemplate: false, sourcePath: '' };
    }
    
    return { type: 'other', description: key, isTemplate: false, sourcePath: '' };
  }

  /**
   * Extract ERC standard from key name
   */
  private static extractStandard(key: string): string | undefined {
    const match = key.match(/erc\d+/i);
    return match ? match[0].toUpperCase() : undefined;
  }

  /**
   * Parse ABI from compiled artifact JSON
   */
  static parseArtifactAbi(artifactJson: string): unknown[] {
    const artifact: CompiledArtifact = JSON.parse(artifactJson);
    return artifact.abi;
  }

  /**
   * Generate ABI hash for comparison
   */
  static generateAbiHash(abi: unknown[]): string {
    const abiString = JSON.stringify(abi);
    let hash = 0;
    for (let i = 0; i < abiString.length; i++) {
      const char = abiString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if contract exists in database
   */
  static async contractExists(
    contractAddress: string,
    network: string
  ): Promise<{ exists: boolean; id?: string }> {
    const { data } = await supabase
      .from('contract_masters')
      .select('id')
      .eq('contract_address', contractAddress.toLowerCase())
      .eq('network', network)
      .single();
    
    return { exists: !!data, id: data?.id };
  }

  /**
   * Import deployment with full metadata to database
   * This is the main entry point for syncing blockchain deployments to the database
   */
  static async importDeployment(
    deploymentJson: string,
    network: string,
    options: ImportOptions = {}
  ): Promise<ArtifactImportResult> {
    const {
      overwrite = false,
      includeAbi = false,
      deploymentLabel = `deployment-${Date.now()}`
    } = options;

    const networkConfig = NETWORK_CONFIGS[network];
    if (!networkConfig) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [`Unknown network: ${network}`],
        contracts: []
      };
    }

    const result: ArtifactImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      contracts: []
    };

    try {
      const contracts = this.parseDeploymentJson(deploymentJson, network);
      result.contracts = contracts;

      for (const contract of contracts) {
        try {
          const { exists, id } = await this.contractExists(contract.contractAddress, network);

          if (exists && !overwrite) {
            result.skipped++;
            continue;
          }

          const contractData = {
            network,
            environment: networkConfig.environment,
            contract_type: contract.contractType,
            contract_address: contract.contractAddress,
            version: '1.0.0',
            abi_version: '1.0.0',
            is_active: true,
            is_template: contract.category.isTemplate,
            abi: contract.abi || null,
            abi_hash: contract.abiHash || null,
            contract_details: {
              name: contract.category.description,
              category: contract.category.type,
              standard: contract.category.standard,
              deploymentKey: contract.contractKey,
              sourcePath: contract.category.sourcePath
            },
            deployment_data: {
              source: 'foundry_import',
              deploymentLabel,
              importedAt: new Date().toISOString(),
              network: networkConfig.name,
              chainId: networkConfig.chainId,
              explorerUrl: `${networkConfig.explorerUrl}/address/${contract.contractAddress}`
            }
          };

          if (exists && overwrite && id) {
            const { error } = await supabase
              .from('contract_masters')
              .update(contractData)
              .eq('id', id);

            if (error) throw error;
            result.updated++;
          } else {
            const { error } = await supabase
              .from('contract_masters')
              .insert(contractData);

            if (error) throw error;
            result.imported++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`${contract.contractType}: ${message}`);
          result.success = false;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse deployment';
      result.errors.push(message);
      result.success = false;
    }

    return result;
  }

  /**
   * Update verification status for a contract
   */
  static async updateVerificationStatus(
    contractAddress: string,
    network: string,
    status: 'pending' | 'verified' | 'failed',
    verificationUrl?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('contract_masters')
      .update({
        deployment_data: supabase.rpc('jsonb_set', {
          target: 'deployment_data',
          path: '{verificationStatus}',
          new_value: JSON.stringify(status)
        })
      })
      .eq('contract_address', contractAddress.toLowerCase())
      .eq('network', network);

    if (error) throw error;
  }

  /**
   * Get all contracts for a network
   */
  static async getNetworkContracts(network: string): Promise<ContractMetadata[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .order('contract_type');

    if (error) throw error;

    return (data || []).map(row => {
      const details = row.contract_details as Record<string, unknown> || {};
      return {
        contractKey: (details.deploymentKey as string) || row.contract_type,
        contractType: row.contract_type,
        contractAddress: row.contract_address,
        category: {
          type: (details.category as ContractCategory['type']) || 'other',
          standard: details.standard as string | undefined,
          description: (details.name as string) || row.contract_type,
          isTemplate: row.is_template || false,
          sourcePath: (details.sourcePath as string) || ''
        },
        abi: row.abi as unknown[] | undefined,
        abiHash: row.abi_hash || undefined,
        verificationStatus: (row.deployment_data as Record<string, unknown>)?.verificationStatus as ContractMetadata['verificationStatus']
      };
    });
  }

  /**
   * Get deployment statistics for a network
   */
  static async getDeploymentStats(network: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStandard: Record<string, number>;
    verified: number;
    pending: number;
  }> {
    const contracts = await this.getNetworkContracts(network);
    
    const stats = {
      total: contracts.length,
      byCategory: {} as Record<string, number>,
      byStandard: {} as Record<string, number>,
      verified: 0,
      pending: 0
    };

    for (const contract of contracts) {
      stats.byCategory[contract.category.type] = (stats.byCategory[contract.category.type] || 0) + 1;
      if (contract.category.standard) {
        stats.byStandard[contract.category.standard] = (stats.byStandard[contract.category.standard] || 0) + 1;
      }
      if (contract.verificationStatus === 'verified') stats.verified++;
      if (contract.verificationStatus === 'pending') stats.pending++;
    }

    return stats;
  }

  /**
   * Generate verification command for a contract
   */
  static generateVerificationCommand(
    contractAddress: string,
    contractKey: string,
    network: string
  ): string {
    const mapping = CONTRACT_MAPPINGS[contractKey];
    const config = NETWORK_CONFIGS[network];
    
    if (!mapping || !config) return '';

    const rpcUrl = getRpcUrlForNetwork(config);
    if (!rpcUrl) {
      console.warn(`No RPC URL available for network: ${network}`);
      return '';
    }

    const sourcePath = mapping.sourcePath.replace('.json', '').replace('/', ':');
    
    return `forge verify-contract ${contractAddress} ${sourcePath} --chain-id ${config.chainId} --rpc-url ${rpcUrl} --etherscan-api-key $ETHERSCAN_API_KEY --watch`;
  }

  /**
   * Get network configuration
   */
  static getNetworkConfig(network: string): NetworkConfig | undefined {
    return NETWORK_CONFIGS[network];
  }

  /**
   * Get RPC URL for a network
   * Uses the centralized RPC manager to retrieve URLs from environment or fallbacks
   */
  static getRpcUrl(network: string): string | null {
    const config = NETWORK_CONFIGS[network];
    if (!config) {
      console.warn(`Unknown network: ${network}`);
      return null;
    }
    return getRpcUrlForNetwork(config);
  }

  /**
   * List available networks
   */
  static listNetworks(): string[] {
    return Object.keys(NETWORK_CONFIGS);
  }
}

export default DeploymentArtifactService;
