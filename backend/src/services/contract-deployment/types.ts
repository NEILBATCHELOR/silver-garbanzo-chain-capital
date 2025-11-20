/**
 * Contract Deployment Types
 * Defines types for deploying Foundry contracts and updating contract_masters
 */

export interface ContractArtifact {
  abi: any[];
  bytecode: {
    object: string;
    linkReferences?: any;
  };
  deployedBytecode?: {
    object: string;
  };
  metadata?: {
    compiler: {
      version: string;
    };
    settings: {
      evmVersion: string;
      optimizer: {
        enabled: boolean;
        runs: number;
      };
      compilationTarget: {
        [key: string]: string;
      };
    };
  };
}

export interface DeploymentRequest {
  walletId: string;
  network: string;
  environment: 'mainnet' | 'testnet' | 'devnet' | 'local';
  contracts: ContractDeploymentItem[];
  gasSettings?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasLimit?: string;
  };
}

export interface ContractDeploymentItem {
  contractType: ContractType;
  deployArgs?: any[];
  verifyOnEtherscan?: boolean;
}

export type ContractType =
  // Factories
  | 'erc20_factory'
  | 'erc721_factory'
  | 'erc1155_factory'
  | 'erc3525_factory'
  | 'erc4626_factory'
  | 'erc1400_factory'
  // Masters
  | 'erc20_master'
  | 'erc721_master'
  | 'erc1155_master'
  | 'erc3525_master'
  | 'erc4626_master'
  | 'erc1400_master'
  | 'erc20_rebasing_master'
  | 'erc721_wrapper_master'
  | 'erc20_wrapper_master'
  // Extension Factories
  | 'erc20_extension_factory'
  | 'erc721_extension_factory'
  | 'erc1155_extension_factory'
  | 'erc3525_extension_factory'
  | 'erc4626_extension_factory'
  | 'erc1400_extension_factory'
  // Infrastructure
  | 'extension_registry'
  | 'factory_registry'
  | 'token_registry'
  | 'policy_engine'
  | 'policy_registry'
  | 'upgrade_governor'
  | 'universal_extension_factory'
  | 'beacon_proxy_factory'
  | 'multisig_wallet_factory'
  // Modules (Extension Implementations)
  | 'compliance_module'
  | 'vesting_module'
  | 'royalty_module'
  | 'fee_module'
  | 'permit_module'
  | 'snapshot_module'
  | 'timelock_module'
  | 'flashmint_module'
  | 'votes_module'
  | 'soulbound_module'
  | 'rental_module'
  | 'fraction_module'
  | 'temporary_approval_module'
  | 'metadata_module'
  | 'granular_approval_module'
  | 'payable_module'
  | 'uri_management_module'
  | 'supply_cap_module'
  | 'consecutive_module'
  | 'document_module'
  | 'controller_module'
  | 'transfer_restrictions_module'
  | 'slot_manager_module'
  | 'value_exchange_module'
  | 'yield_strategy_module'
  | 'withdrawal_queue_module'
  | 'async_vault_module'
  | 'native_vault_module'
  | 'router_module'
  | 'multi_asset_vault_module'
  | 'slot_approvable_module';

export interface DeploymentResult {
  success: boolean;
  contractType: ContractType;
  address?: string;
  transactionHash?: string;
  gasUsed?: string;
  deploymentCost?: string;
  constructorArguments?: string; // ABI-encoded constructor arguments
  error?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed' | 'not_requested';
}

export interface DeploymentResponse {
  deploymentId: string;
  results: DeploymentResult[];
  totalGasUsed: string;
  totalCost: string;
  timestamp: string;
  deployer: string;
}

export interface ContractMasterRecord {
  id?: string;
  network: string;
  environment: string;
  contract_type: ContractType;
  contract_address: string;
  version: string;
  abi_version: string;
  abi: any;
  abi_hash?: string;
  deployed_at?: string;
  deployed_by?: string;
  deployment_tx_hash?: string;
  is_active: boolean;
  deprecated_at?: string | null;
  deployment_data?: any;
  contract_details?: {
    contractName: string;
    compilerVersion: string;
    optimizationUsed: boolean | string;
    runs: number | string;
    evmVersion?: string;
    licenseType?: string;
    sourceCode?: string;
    constructorArguments?: string;
    deployedBytecode?: string;
    deployedBytecodeSize?: number;
    creationCode?: string;
    creationCodeSize?: number;
    proxy?: boolean;
    implementation?: string;
  };
  initial_owner?: string;
  is_template: boolean;
}

export interface DeploymentProgress {
  deploymentId: string;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  currentContract?: ContractType;
  currentStep?: string;
  completedCount: number;
  totalCount: number;
  results: DeploymentResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// Contract file name mappings
export const CONTRACT_FILE_NAMES: Record<ContractType, string> = {
  // Factories
  erc20_factory: 'ERC20Factory',
  erc721_factory: 'ERC721Factory',
  erc1155_factory: 'ERC1155Factory',
  erc3525_factory: 'ERC3525Factory',
  erc4626_factory: 'ERC4626Factory',
  erc1400_factory: 'ERC1400Factory',

  // Masters
  erc20_master: 'ERC20Master',
  erc721_master: 'ERC721Master',
  erc1155_master: 'ERC1155Master',
  erc3525_master: 'ERC3525Master',
  erc4626_master: 'ERC4626Master',
  erc1400_master: 'ERC1400Master',
  erc20_rebasing_master: 'ERC20RebasingMaster',
  erc721_wrapper_master: 'ERC721WrapperMaster',
  erc20_wrapper_master: 'ERC20WrapperMaster',

  // Extension Factories
  erc20_extension_factory: 'ERC20ExtensionFactory',
  erc721_extension_factory: 'ERC721ExtensionFactory',
  erc1155_extension_factory: 'ERC1155ExtensionFactory',
  erc3525_extension_factory: 'ERC3525ExtensionFactory',
  erc4626_extension_factory: 'ERC4626ExtensionFactory',
  erc1400_extension_factory: 'ERC1400ExtensionFactory',

  // Infrastructure
  extension_registry: 'ExtensionRegistry',
  factory_registry: 'FactoryRegistry',
  token_registry: 'TokenRegistry',
  policy_engine: 'PolicyEngine',
  policy_registry: 'PolicyRegistry',
  upgrade_governor: 'UpgradeGovernor',
  universal_extension_factory: 'UniversalExtensionFactory',
  beacon_proxy_factory: 'BeaconProxyFactory',
  multisig_wallet_factory: 'MultiSigWalletFactory',

  // Modules
  compliance_module: 'ERC20ComplianceModule',
  vesting_module: 'ERC20VestingModule',
  royalty_module: 'ERC721RoyaltyModule',
  fee_module: 'ERC20FeeModule',
  permit_module: 'ERC20PermitModule',
  snapshot_module: 'ERC20SnapshotModule',
  timelock_module: 'ERC20TimelockModule',
  flashmint_module: 'ERC20FlashMintModule',
  votes_module: 'ERC20VotesModule',
  soulbound_module: 'ERC721SoulboundModule',
  rental_module: 'ERC721RentalModule',
  fraction_module: 'ERC721FractionModule',
  temporary_approval_module: 'ERC20TemporaryApprovalModule',
  metadata_module: 'ERC4906MetadataModule',
  granular_approval_module: 'ERC5216GranularApprovalModule',
  payable_module: 'ERC1363PayableToken',
  uri_management_module: 'ERC1155URIModule',
  supply_cap_module: 'ERC1155SupplyCapModule',
  consecutive_module: 'ERC721ConsecutiveModule',
  document_module: 'ERC1400DocumentModule',
  controller_module: 'ERC1400ControllerModule',
  transfer_restrictions_module: 'ERC1400TransferRestrictionsModule',
  slot_manager_module: 'ERC3525SlotManagerModule',
  value_exchange_module: 'ERC3525ValueExchangeModule',
  yield_strategy_module: 'ERC4626YieldStrategyModule',
  withdrawal_queue_module: 'ERC4626WithdrawalQueueModule',
  async_vault_module: 'ERC7540AsyncVaultModule',
  native_vault_module: 'ERC7535NativeVaultModule',
  router_module: 'ERC4626Router',
  multi_asset_vault_module: 'ERC7575MultiAssetVaultModule',
  slot_approvable_module: 'ERC3525SlotApprovableModule',
};

// Deployment order - contracts that depend on others
export const DEPLOYMENT_ORDER: ContractType[] = [
  // Phase 1: Infrastructure (no dependencies)
  'policy_registry',
  'token_registry',
  'factory_registry',
  'extension_registry',

  // Phase 2: Governance (depends on infrastructure)
  'upgrade_governor',
  'policy_engine',

  // Phase 3: Masters (no dependencies except infrastructure)
  'erc20_master',
  'erc721_master',
  'erc1155_master',
  'erc3525_master',
  'erc4626_master',
  'erc1400_master',
  'erc20_rebasing_master',
  'erc721_wrapper_master',
  'erc20_wrapper_master',

  // Phase 4: Token Factories (depend on masters and registries)
  'erc20_factory',
  'erc721_factory',
  'erc1155_factory',
  'erc3525_factory',
  'erc4626_factory',
  'erc1400_factory',

  // Phase 5: Extension Factories (depend on extension registry)
  'erc20_extension_factory',
  'erc721_extension_factory',
  'erc1155_extension_factory',
  'erc3525_extension_factory',
  'erc4626_extension_factory',
  'erc1400_extension_factory',
  'universal_extension_factory',

  // Phase 6: Modules (can be deployed anytime after extension factories)
  'compliance_module',
  'vesting_module',
  'fee_module',
  'permit_module',
  'snapshot_module',
  'timelock_module',
  'flashmint_module',
  'votes_module',
  'temporary_approval_module',
  'payable_module',
  'royalty_module',
  'soulbound_module',
  'rental_module',
  'fraction_module',
  'metadata_module',
  'granular_approval_module',
  'consecutive_module',
  'uri_management_module',
  'supply_cap_module',
  'document_module',
  'controller_module',
  'transfer_restrictions_module',
  'slot_manager_module',
  'slot_approvable_module',
  'value_exchange_module',
  'yield_strategy_module',
  'withdrawal_queue_module',
  'async_vault_module',
  'native_vault_module',
  'router_module',
  'multi_asset_vault_module',
];
