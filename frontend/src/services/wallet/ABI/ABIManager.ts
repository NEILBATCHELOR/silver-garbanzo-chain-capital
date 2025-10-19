/**
 * Centralized ABI Manager
 * 
 * Single source of truth for all Foundry contract ABIs
 * Follows the same pattern as the centralized RPC manager
 * 
 * @module ABIManager
 */

// ============================================================================
// CONTRACT TYPE DEFINITIONS
// ============================================================================

/**
 * All supported contract types in the Foundry ecosystem
 * Organized by category for maintainability
 */
export type ContractType =
  // Core Factory
  | 'TokenFactory'
  
  // Token Masters (9 types)
  | 'ERC20Master'
  | 'ERC721Master'
  | 'ERC1155Master'
  | 'ERC3525Master'
  | 'ERC4626Master'
  | 'ERC1400Master'
  | 'ERC20RebasingMaster'
  | 'ERC20WrapperMaster'
  | 'ERC721WrapperMaster'
  
  // Policy & Governance (5 types)
  | 'PolicyEngine'
  | 'PolicyRegistry'
  | 'TokenRegistry'
  | 'UpgradeGovernance'
  | 'UpgradeGovernor'
  
  // Multi-Sig Wallets (2 types)
  | 'MultiSigWallet'
  | 'MultiSigWalletFactory'
  
  // Factories & Utilities (7 types)
  | 'BeaconProxyFactory'
  | 'ExtensionModuleFactory'
  | 'ERC4626Router'
  | 'UniversalDeployer'
  | 'UniversalDocumentModule'
  | 'TokenBeacon'
  | 'CREATE2Deployer'
  
  // ERC20 Extension Modules (9 types)
  | 'ERC20ComplianceModule'
  | 'ERC20FeeModule'
  | 'ERC20FlashMintModule'
  | 'ERC20PermitModule'
  | 'ERC20SnapshotModule'
  | 'ERC20TemporaryApprovalModule'
  | 'ERC20TimelockModule'
  | 'ERC20VestingModule'
  | 'ERC20VotesModule'
  
  // ERC721 Extension Modules (5 types)
  | 'ERC721ConsecutiveModule'
  | 'ERC721FractionModule'
  | 'ERC721RentalModule'
  | 'ERC721RoyaltyModule'
  | 'ERC721SoulboundModule'
  
  // ERC1155 Extension Modules (4 types)
  | 'ERC1155RoyaltyModule'
  | 'ERC1155SupplyCapModule'
  | 'ERC1155URIModule'
  | 'ERC5216GranularApprovalModule'
  
  // ERC3525 Extension Modules (3 types)
  | 'ERC3525SlotApprovableModule'
  | 'ERC3525SlotManagerModule'
  | 'ERC3525ValueExchangeModule'
  
  // ERC4626 Extension Modules (6 types)
  | 'ERC4626FeeStrategyModule'
  | 'ERC4626WithdrawalQueueModule'
  | 'ERC4626YieldStrategyModule'
  | 'ERC7535NativeVaultModule'
  | 'ERC7540AsyncVaultModule'
  | 'ERC7575MultiAssetVaultModule'
  
  // ERC1400 Extension Modules (3 types)
  | 'ERC1400ControllerModule'
  | 'ERC1400DocumentModule'
  | 'ERC1400TransferRestrictionsModule'
  
  // Other Modules (2 types)
  | 'ERC1363PayableToken'
  | 'ERC4906MetadataModule';

// ============================================================================
// ABI MAPPING CONFIGURATION
// ============================================================================

/**
 * Map of contract types to their ABI file paths
 * All paths are relative to the foundry-contracts output directory
 */
const ABI_PATH_MAP: Record<ContractType, string> = {
  // ============================================================================
  // CORE FACTORY
  // ============================================================================
  'TokenFactory': '/foundry-contracts/out/TokenFactory.sol/TokenFactory.json',
  
  // ============================================================================
  // TOKEN MASTERS
  // ============================================================================
  'ERC20Master': '/foundry-contracts/out/ERC20Master.sol/ERC20Master.json',
  'ERC721Master': '/foundry-contracts/out/ERC721Master.sol/ERC721Master.json',
  'ERC1155Master': '/foundry-contracts/out/ERC1155Master.sol/ERC1155Master.json',
  'ERC3525Master': '/foundry-contracts/out/ERC3525Master.sol/ERC3525Master.json',
  'ERC4626Master': '/foundry-contracts/out/ERC4626Master.sol/ERC4626Master.json',
  'ERC1400Master': '/foundry-contracts/out/ERC1400Master.sol/ERC1400Master.json',
  'ERC20RebasingMaster': '/foundry-contracts/out/ERC20RebasingMaster.sol/ERC20RebasingMaster.json',
  'ERC20WrapperMaster': '/foundry-contracts/out/ERC20WrapperMaster.sol/ERC20WrapperMaster.json',
  'ERC721WrapperMaster': '/foundry-contracts/out/ERC721WrapperMaster.sol/ERC721WrapperMaster.json',
  
  // ============================================================================
  // POLICY & GOVERNANCE
  // ============================================================================
  'PolicyEngine': '/foundry-contracts/out/PolicyEngine.sol/PolicyEngine.json',
  'PolicyRegistry': '/foundry-contracts/out/PolicyRegistry.sol/PolicyRegistry.json',
  'TokenRegistry': '/foundry-contracts/out/TokenRegistry.sol/TokenRegistry.json',
  'UpgradeGovernance': '/foundry-contracts/out/UpgradeGovernance.sol/UpgradeGovernance.json',
  'UpgradeGovernor': '/foundry-contracts/out/UpgradeGovernor.sol/UpgradeGovernor.json',
  
  // ============================================================================
  // MULTI-SIG WALLETS
  // ============================================================================
  'MultiSigWallet': '/foundry-contracts/out/MultiSigWallet.sol/MultiSigWallet.json',
  'MultiSigWalletFactory': '/foundry-contracts/out/MultiSigWalletFactory.sol/MultiSigWalletFactory.json',
  
  // ============================================================================
  // FACTORIES & UTILITIES
  // ============================================================================
  'BeaconProxyFactory': '/foundry-contracts/out/BeaconProxyFactory.sol/BeaconProxyFactory.json',
  'ExtensionModuleFactory': '/foundry-contracts/out/ExtensionModuleFactory.sol/ExtensionModuleFactory.json',
  'ERC4626Router': '/foundry-contracts/out/ERC4626Router.sol/ERC4626Router.json',
  'UniversalDeployer': '/foundry-contracts/out/UniversalDeployer.sol/UniversalDeployer.json',
  'UniversalDocumentModule': '/foundry-contracts/out/UniversalDocumentModule.sol/UniversalDocumentModule.json',
  'TokenBeacon': '/foundry-contracts/out/TokenBeacon.sol/TokenBeacon.json',
  'CREATE2Deployer': '/foundry-contracts/out/CREATE2Deployer.sol/CREATE2Deployer.json',
  
  // ============================================================================
  // ERC20 EXTENSION MODULES
  // ============================================================================
  'ERC20ComplianceModule': '/foundry-contracts/out/ERC20ComplianceModule.sol/ERC20ComplianceModule.json',
  'ERC20FeeModule': '/foundry-contracts/out/ERC20FeeModule.sol/ERC20FeeModule.json',
  'ERC20FlashMintModule': '/foundry-contracts/out/ERC20FlashMintModule.sol/ERC20FlashMintModule.json',
  'ERC20PermitModule': '/foundry-contracts/out/ERC20PermitModule.sol/ERC20PermitModule.json',
  'ERC20SnapshotModule': '/foundry-contracts/out/ERC20SnapshotModule.sol/ERC20SnapshotModule.json',
  'ERC20TemporaryApprovalModule': '/foundry-contracts/out/ERC20TemporaryApprovalModule.sol/ERC20TemporaryApprovalModule.json',
  'ERC20TimelockModule': '/foundry-contracts/out/ERC20TimelockModule.sol/ERC20TimelockModule.json',
  'ERC20VestingModule': '/foundry-contracts/out/ERC20VestingModule.sol/ERC20VestingModule.json',
  'ERC20VotesModule': '/foundry-contracts/out/ERC20VotesModule.sol/ERC20VotesModule.json',
  
  // ============================================================================
  // ERC721 EXTENSION MODULES
  // ============================================================================
  'ERC721ConsecutiveModule': '/foundry-contracts/out/ERC721ConsecutiveModule.sol/ERC721ConsecutiveModule.json',
  'ERC721FractionModule': '/foundry-contracts/out/ERC721FractionModule.sol/ERC721FractionModule.json',
  'ERC721RentalModule': '/foundry-contracts/out/ERC721RentalModule.sol/ERC721RentalModule.json',
  'ERC721RoyaltyModule': '/foundry-contracts/out/ERC721RoyaltyModule.sol/ERC721RoyaltyModule.json',
  'ERC721SoulboundModule': '/foundry-contracts/out/ERC721SoulboundModule.sol/ERC721SoulboundModule.json',
  
  // ============================================================================
  // ERC1155 EXTENSION MODULES
  // ============================================================================
  'ERC1155RoyaltyModule': '/foundry-contracts/out/ERC1155RoyaltyModule.sol/ERC1155RoyaltyModule.json',
  'ERC1155SupplyCapModule': '/foundry-contracts/out/ERC1155SupplyCapModule.sol/ERC1155SupplyCapModule.json',
  'ERC1155URIModule': '/foundry-contracts/out/ERC1155URIModule.sol/ERC1155URIModule.json',
  'ERC5216GranularApprovalModule': '/foundry-contracts/out/ERC5216GranularApprovalModule.sol/ERC5216GranularApprovalModule.json',
  
  // ============================================================================
  // ERC3525 EXTENSION MODULES
  // ============================================================================
  'ERC3525SlotApprovableModule': '/foundry-contracts/out/ERC3525SlotApprovableModule.sol/ERC3525SlotApprovableModule.json',
  'ERC3525SlotManagerModule': '/foundry-contracts/out/ERC3525SlotManagerModule.sol/ERC3525SlotManagerModule.json',
  'ERC3525ValueExchangeModule': '/foundry-contracts/out/ERC3525ValueExchangeModule.sol/ERC3525ValueExchangeModule.json',
  
  // ============================================================================
  // ERC4626 EXTENSION MODULES
  // ============================================================================
  'ERC4626FeeStrategyModule': '/foundry-contracts/out/ERC4626FeeStrategyModule.sol/ERC4626FeeStrategyModule.json',
  'ERC4626WithdrawalQueueModule': '/foundry-contracts/out/ERC4626WithdrawalQueueModule.sol/ERC4626WithdrawalQueueModule.json',
  'ERC4626YieldStrategyModule': '/foundry-contracts/out/ERC4626YieldStrategyModule.sol/ERC4626YieldStrategyModule.json',
  'ERC7535NativeVaultModule': '/foundry-contracts/out/ERC7535NativeVaultModule.sol/ERC7535NativeVaultModule.json',
  'ERC7540AsyncVaultModule': '/foundry-contracts/out/ERC7540AsyncVaultModule.sol/ERC7540AsyncVaultModule.json',
  'ERC7575MultiAssetVaultModule': '/foundry-contracts/out/ERC7575MultiAssetVaultModule.sol/ERC7575MultiAssetVaultModule.json',
  
  // ============================================================================
  // ERC1400 EXTENSION MODULES
  // ============================================================================
  'ERC1400ControllerModule': '/foundry-contracts/out/ERC1400ControllerModule.sol/ERC1400ControllerModule.json',
  'ERC1400DocumentModule': '/foundry-contracts/out/ERC1400DocumentModule.sol/ERC1400DocumentModule.json',
  'ERC1400TransferRestrictionsModule': '/foundry-contracts/out/ERC1400TransferRestrictionsModule.sol/ERC1400TransferRestrictionsModule.json',
  
  // ============================================================================
  // OTHER MODULES
  // ============================================================================
  'ERC1363PayableToken': '/foundry-contracts/out/ERC1363PayableToken.sol/ERC1363PayableToken.json',
  'ERC4906MetadataModule': '/foundry-contracts/out/ERC4906MetadataModule.sol/ERC4906MetadataModule.json'
};

// ============================================================================
// ABI MANAGER CLASS
// ============================================================================

/**
 * Centralized ABI Manager
 * Handles loading and caching of contract ABIs
 */
class ABIManager {
  private abiCache: Map<ContractType, any> = new Map();
  private loadingPromises: Map<ContractType, Promise<any>> = new Map();

  /**
   * Get ABI for a specific contract type
   * 
   * @param contractType - The type of contract
   * @returns Promise<any> - The ABI array
   * @throws Error if contract type is invalid or ABI cannot be loaded
   */
  async getABI(contractType: ContractType): Promise<any> {
    // Check cache first
    if (this.abiCache.has(contractType)) {
      return this.abiCache.get(contractType);
    }

    // Check if already loading
    if (this.loadingPromises.has(contractType)) {
      return this.loadingPromises.get(contractType);
    }

    // Load ABI
    const loadPromise = this.loadABI(contractType);
    this.loadingPromises.set(contractType, loadPromise);

    try {
      const abi = await loadPromise;
      this.abiCache.set(contractType, abi);
      return abi;
    } finally {
      this.loadingPromises.delete(contractType);
    }
  }

  /**
   * Get ABI path for a contract type
   * 
   * @param contractType - The type of contract
   * @returns string - The path to the ABI file
   */
  getABIPath(contractType: ContractType): string {
    return ABI_PATH_MAP[contractType];
  }

  /**
   * Check if a contract type is valid
   * 
   * @param contractType - The type to check
   * @returns boolean - True if valid
   */
  isValidContractType(contractType: string): contractType is ContractType {
    return contractType in ABI_PATH_MAP;
  }

  /**
   * Get all supported contract types
   * 
   * @returns ContractType[] - Array of all contract types
   */
  getSupportedContractTypes(): ContractType[] {
    return Object.keys(ABI_PATH_MAP) as ContractType[];
  }

  /**
   * Clear ABI cache
   * Useful for testing or when ABIs are updated
   */
  clearCache(): void {
    this.abiCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Preload ABIs for commonly used contracts
   * 
   * @param contractTypes - Array of contract types to preload
   */
  async preloadABIs(contractTypes: ContractType[]): Promise<void> {
    await Promise.all(
      contractTypes.map(type => this.getABI(type))
    );
  }

  /**
   * Load ABI from file
   * 
   * @param contractType - The type of contract
   * @returns Promise<any> - The loaded ABI
   * @private
   */
  private async loadABI(contractType: ContractType): Promise<any> {
    const abiPath = ABI_PATH_MAP[contractType];
    
    if (!abiPath) {
      throw new Error(`Unknown contract type: ${contractType}`);
    }

    try {
      // Dynamic import of JSON file
      const abiModule = await import(/* @vite-ignore */ abiPath);
      
      // Handle different export formats
      if (abiModule.abi) {
        return abiModule.abi;
      } else if (Array.isArray(abiModule.default)) {
        return abiModule.default;
      } else if (abiModule.default?.abi) {
        return abiModule.default.abi;
      }
      
      throw new Error(`Invalid ABI format for ${contractType}`);
      
    } catch (error) {
      throw new Error(
        `Failed to load ABI for ${contractType}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Singleton instance of ABIManager
 * Use this throughout the application
 */
export const abiManager = new ABIManager();

// ============================================================================
// EXPORTS
// ============================================================================

export { ABIManager };
// ContractType is already exported at its definition (line 17)
