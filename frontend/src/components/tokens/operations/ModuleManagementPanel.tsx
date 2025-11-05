/**
 * Module Management Panel - Enhanced with Configuration, Upgrades, and Marketplace
 * 
 * Features:
 * 1. Module Configuration Panels - Update module settings post-deployment
 * 2. Module Upgrade Functionality - Swap module instances for newer versions
 * 3. Module Version Tracking - Display versions and upgrade availability
 * 4. Module Marketplace - Browse and discover available modules
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, Shield, Check, X, ChevronRight, Loader2, 
  Plug, PlugZap, Unplug, Settings, RefreshCw, Store, 
  ArrowUpCircle, Package, Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { ModuleRegistryService } from '@/services/modules/ModuleRegistryService';
import { ethers } from 'ethers';

interface ModuleManagementPanelProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

type ModuleType = 
  // Universal (All Standards)
  | 'compliance' | 'vesting' | 'document' | 'policyEngine'
  // ERC20 Specific
  | 'fees' | 'flashMint' | 'permit' | 'snapshot' | 'timelock' 
  | 'votes' | 'payableToken' | 'temporaryApproval'
  // ERC721 Specific
  | 'royalty' | 'rental' | 'soulbound' | 'fractionalization' 
  | 'consecutive' | 'metadataEvents'
  // ERC1155 Specific
  | 'supplyCap' | 'uriManagement'
  // ERC3525 Specific
  | 'slotApprovable' | 'slotManager' | 'valueExchange'
  // ERC4626 Specific
  | 'feeStrategy' | 'withdrawalQueue' | 'yieldStrategy' 
  | 'asyncVault' | 'nativeVault' | 'router' | 'multiAssetVault'
  // ERC1400 Specific
  | 'transferRestrictions' | 'controller' | 'erc1400Document';

interface ModuleInfo {
  type: ModuleType;
  label: string;
  description: string;
  setterFunction: string;
  getterFunction: string;
  dbColumn: string;
  standards: string[];
  category?: string;
  configurable?: boolean; // NEW: Whether module has configuration options
  configurableFields?: ConfigField[]; // NEW: Configuration fields
}

interface ConfigField {
  name: string;
  label: string;
  type: 'number' | 'text' | 'boolean' | 'address';
  description?: string;
  min?: number;
  max?: number;
  default?: any;
  required?: boolean;
}

interface ModuleInstance {
  id: string;
  address: string;
  masterAddress: string;
  version: string;
  configuration: any;
  attachedAt: string;
  isActive: boolean;
}

interface ModuleVersion {
  version: string;
  address: string;
  deployedAt: string;
  isActive: boolean;
  abiVersion: string;
  details: any;
}

const MODULE_INFO: Record<ModuleType, ModuleInfo> = {
  // ═══════════════════════════════════════════════════════════
  // UNIVERSAL MODULES
  // ═══════════════════════════════════════════════════════════
  compliance: {
    type: 'compliance',
    label: 'Compliance Module',
    description: 'KYC/AML checks and whitelist management',
    setterFunction: 'setComplianceModule',
    getterFunction: 'complianceModule',
    dbColumn: 'compliance_module_address',
    standards: ['erc20', 'erc721', 'erc1155', 'erc3525', 'erc4626', 'erc1400'],
    category: 'Universal',
    configurable: true,
    configurableFields: [
      {
        name: 'kycRequired',
        label: 'KYC Required',
        type: 'boolean',
        description: 'Require KYC verification for transfers',
        default: false
      },
      {
        name: 'whitelistRequired',
        label: 'Whitelist Required',
        type: 'boolean',
        description: 'Require address whitelisting',
        default: false
      }
    ]
  },
  vesting: {
    type: 'vesting',
    label: 'Vesting Module',
    description: 'Token lock schedules and cliff periods',
    setterFunction: 'setVestingModule',
    getterFunction: 'vestingModule',
    dbColumn: 'vesting_module_address',
    standards: ['erc20', 'erc721', 'erc1155', 'erc3525', 'erc1400'],
    category: 'Universal',
    configurable: false // Configured via PolicyAwareLockOperation
  },
  document: {
    type: 'document',
    label: 'Document Module',
    description: 'Attach legal documents and disclosures on-chain',
    setterFunction: 'setDocumentModule',
    getterFunction: 'documentModule',
    dbColumn: 'document_module_address',
    standards: ['erc721', 'erc1155', 'erc3525', 'erc4626', 'erc1400'],
    category: 'Universal',
    configurable: false // Documents uploaded post-deployment
  },
  policyEngine: {
    type: 'policyEngine',
    label: 'Policy Engine',
    description: 'On-chain policy enforcement for operations',
    setterFunction: 'setPolicyEngine',
    getterFunction: 'policyEngine',
    dbColumn: 'policy_engine_address',
    standards: ['erc20', 'erc721', 'erc1155', 'erc3525', 'erc4626', 'erc1400'],
    category: 'Universal',
    configurable: true,
    configurableFields: [
      {
        name: 'rulesEnabled',
        label: 'Enabled Rules',
        type: 'text',
        description: 'Comma-separated list of rule IDs'
      },
      {
        name: 'validatorsEnabled',
        label: 'Enabled Validators',
        type: 'text',
        description: 'Comma-separated list of validator IDs'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ERC20 MODULES
  // ═══════════════════════════════════════════════════════════
  fees: {
    type: 'fees',
    label: 'Fees Module',
    description: 'Charge fees on token transfers',
    setterFunction: 'setFeesModule',
    getterFunction: 'feesModule',
    dbColumn: 'fees_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: true,
    configurableFields: [
      {
        name: 'transferFeeBps',
        label: 'Transfer Fee (%)',
        type: 'number',
        description: 'Fee percentage (e.g., 0.5 for 0.5%)',
        min: 0,
        max: 10,
        default: 0
      },
      {
        name: 'feeRecipient',
        label: 'Fee Recipient',
        type: 'address',
        description: 'Address receiving fees',
        required: true
      }
    ]
  },
  flashMint: {
    type: 'flashMint',
    label: 'Flash Mint Module',
    description: 'Enable flash loans with instant mint and burn',
    setterFunction: 'setFlashMintModule',
    getterFunction: 'flashMintModule',
    dbColumn: 'flash_mint_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: false
  },
  permit: {
    type: 'permit',
    label: 'Permit Module',
    description: 'Enable gasless approvals via EIP-2612',
    setterFunction: 'setPermitModule',
    getterFunction: 'permitModule',
    dbColumn: 'permit_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: false
  },
  snapshot: {
    type: 'snapshot',
    label: 'Snapshot Module',
    description: 'Capture token balances at specific block heights',
    setterFunction: 'setSnapshotModule',
    getterFunction: 'snapshotModule',
    dbColumn: 'snapshot_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: false
  },
  timelock: {
    type: 'timelock',
    label: 'Timelock Module',
    description: 'Delay administrative actions with timelock',
    setterFunction: 'setTimelockModule',
    getterFunction: 'timelockModule',
    dbColumn: 'timelock_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: true,
    configurableFields: [
      {
        name: 'minDelay',
        label: 'Minimum Delay (seconds)',
        type: 'number',
        description: 'Minimum time delay before actions can execute',
        min: 0,
        default: 0
      }
    ]
  },
  votes: {
    type: 'votes',
    label: 'Votes Module',
    description: 'Add voting power for governance proposals',
    setterFunction: 'setVotesModule',
    getterFunction: 'votesModule',
    dbColumn: 'votes_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: false
  },
  payableToken: {
    type: 'payableToken',
    label: 'Payable Token Module',
    description: 'Allow ETH to be sent alongside token transfers',
    setterFunction: 'setPayableTokenModule',
    getterFunction: 'payableTokenModule',
    dbColumn: 'payable_token_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: false
  },
  temporaryApproval: {
    type: 'temporaryApproval',
    label: 'Temporary Approval Module',
    description: 'Approvals that expire after a set duration',
    setterFunction: 'setTemporaryApprovalModule',
    getterFunction: 'temporaryApprovalModule',
    dbColumn: 'temporary_approval_module_address',
    standards: ['erc20'],
    category: 'ERC20',
    configurable: true,
    configurableFields: [
      {
        name: 'defaultDuration',
        label: 'Default Duration (seconds)',
        type: 'number',
        description: 'Default approval expiration time',
        min: 60,
        max: 86400,
        default: 3600
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ERC721 MODULES
  // ═══════════════════════════════════════════════════════════
  royalty: {
    type: 'royalty',
    label: 'Royalty Module (EIP-2981)',
    description: 'Enforce creator royalties on secondary sales',
    setterFunction: 'setRoyaltyModule',
    getterFunction: 'royaltyModule',
    dbColumn: 'royalty_module_address',
    standards: ['erc721', 'erc1155'],
    category: 'NFT',
    configurable: true,
    configurableFields: [
      {
        name: 'defaultRoyaltyBps',
        label: 'Royalty Percentage (%)',
        type: 'number',
        description: 'Default royalty percentage (e.g., 2.5 for 2.5%)',
        min: 0,
        max: 10,
        default: 2.5
      },
      {
        name: 'royaltyRecipient',
        label: 'Royalty Recipient',
        type: 'address',
        description: 'Address receiving royalties',
        required: true
      }
    ]
  },
  rental: {
    type: 'rental',
    label: 'Rental Module',
    description: 'Enable NFT rental/lending functionality',
    setterFunction: 'setRentalModule',
    getterFunction: 'rentalModule',
    dbColumn: 'rental_module_address',
    standards: ['erc721'],
    category: 'ERC721',
    configurable: true,
    configurableFields: [
      {
        name: 'maxRentalDuration',
        label: 'Max Rental Duration (seconds)',
        type: 'number',
        description: 'Maximum rental period',
        min: 3600,
        default: 86400
      }
    ]
  },
  soulbound: {
    type: 'soulbound',
    label: 'Soulbound Module',
    description: 'Make NFTs non-transferable',
    setterFunction: 'setSoulboundModule',
    getterFunction: 'soulboundModule',
    dbColumn: 'soulbound_module_address',
    standards: ['erc721'],
    category: 'ERC721',
    configurable: false
  },
  fractionalization: {
    type: 'fractionalization',
    label: 'Fractionalization Module',
    description: 'Split NFTs into fungible fractions',
    setterFunction: 'setFractionModule',
    getterFunction: 'fractionModule',
    dbColumn: 'fractionalization_module_address',
    standards: ['erc721'],
    category: 'ERC721',
    configurable: true,
    configurableFields: [
      {
        name: 'minFractions',
        label: 'Minimum Fractions',
        type: 'number',
        description: 'Minimum fractional shares per NFT',
        min: 2,
        default: 100
      }
    ]
  },
  consecutive: {
    type: 'consecutive',
    label: 'Consecutive Module',
    description: 'Enable batch minting with sequential IDs',
    setterFunction: 'setConsecutiveModule',
    getterFunction: 'consecutiveModule',
    dbColumn: 'consecutive_module_address',
    standards: ['erc721'],
    category: 'ERC721',
    configurable: false
  },
  metadataEvents: {
    type: 'metadataEvents',
    label: 'Metadata Events Module',
    description: 'Emit events when metadata changes',
    setterFunction: 'setMetadataEventsModule',
    getterFunction: 'metadataEventsModule',
    dbColumn: 'metadata_events_module_address',
    standards: ['erc721'],
    category: 'ERC721',
    configurable: false
  },

  // ═══════════════════════════════════════════════════════════
  // ERC1155 MODULES
  // ═══════════════════════════════════════════════════════════
  supplyCap: {
    type: 'supplyCap',
    label: 'Supply Cap Module',
    description: 'Set per-token-ID supply caps',
    setterFunction: 'setSupplyCapModule',
    getterFunction: 'supplyCapModule',
    dbColumn: 'supply_cap_module_address',
    standards: ['erc1155'],
    category: 'ERC1155',
    configurable: true,
    configurableFields: [
      {
        name: 'defaultCap',
        label: 'Default Supply Cap',
        type: 'number',
        description: 'Default cap for new token IDs (0 = unlimited)',
        min: 0,
        default: 0
      }
    ]
  },
  uriManagement: {
    type: 'uriManagement',
    label: 'URI Management Module',
    description: 'Advanced metadata URI management',
    setterFunction: 'setUriManagementModule',
    getterFunction: 'uriManagementModule',
    dbColumn: 'uri_management_module_address',
    standards: ['erc1155'],
    category: 'ERC1155',
    configurable: true,
    configurableFields: [
      {
        name: 'baseURI',
        label: 'Base URI',
        type: 'text',
        description: 'Base URI for metadata'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ERC3525 MODULES
  // ═══════════════════════════════════════════════════════════
  slotApprovable: {
    type: 'slotApprovable',
    label: 'Slot Approvable Module',
    description: 'Enable slot-level approvals',
    setterFunction: 'setSlotApprovableModule',
    getterFunction: 'slotApprovableModule',
    dbColumn: 'slot_approvable_module_address',
    standards: ['erc3525'],
    category: 'ERC3525',
    configurable: false
  },
  slotManager: {
    type: 'slotManager',
    label: 'Slot Manager Module',
    description: 'Advanced slot creation and management',
    setterFunction: 'setSlotManagerModule',
    getterFunction: 'slotManagerModule',
    dbColumn: 'slot_manager_module_address',
    standards: ['erc3525'],
    category: 'ERC3525',
    configurable: false
  },
  valueExchange: {
    type: 'valueExchange',
    label: 'Value Exchange Module',
    description: 'Enable value transfers between slots',
    setterFunction: 'setValueExchangeModule',
    getterFunction: 'valueExchangeModule',
    dbColumn: 'value_exchange_module_address',
    standards: ['erc3525'],
    category: 'ERC3525',
    configurable: true,
    configurableFields: [
      {
        name: 'exchangeFeeBps',
        label: 'Exchange Fee (%)',
        type: 'number',
        description: 'Fee for value exchanges',
        min: 0,
        max: 10,
        default: 0
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ERC4626 MODULES
  // ═══════════════════════════════════════════════════════════
  feeStrategy: {
    type: 'feeStrategy',
    label: 'Fee Strategy Module',
    description: 'Implement vault management and performance fees',
    setterFunction: 'setFeeStrategyModule',
    getterFunction: 'feeStrategyModule',
    dbColumn: 'fee_strategy_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: true,
    configurableFields: [
      {
        name: 'managementFeeBps',
        label: 'Management Fee (%)',
        type: 'number',
        description: 'Annual management fee',
        min: 0,
        max: 5,
        default: 1
      },
      {
        name: 'performanceFeeBps',
        label: 'Performance Fee (%)',
        type: 'number',
        description: 'Performance fee on gains',
        min: 0,
        max: 30,
        default: 10
      }
    ]
  },
  withdrawalQueue: {
    type: 'withdrawalQueue',
    label: 'Withdrawal Queue Module',
    description: 'Implement queued withdrawal system',
    setterFunction: 'setWithdrawalQueueModule',
    getterFunction: 'withdrawalQueueModule',
    dbColumn: 'withdrawal_queue_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: true,
    configurableFields: [
      {
        name: 'maxQueueSize',
        label: 'Max Queue Size',
        type: 'number',
        description: 'Maximum pending withdrawals',
        min: 10,
        default: 100
      }
    ]
  },
  yieldStrategy: {
    type: 'yieldStrategy',
    label: 'Yield Strategy Module',
    description: 'Implement automated yield farming strategies',
    setterFunction: 'setYieldStrategyModule',
    getterFunction: 'yieldStrategyModule',
    dbColumn: 'yield_strategy_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: true,
    configurableFields: [
      {
        name: 'targetYieldBps',
        label: 'Target Yield (%)',
        type: 'number',
        description: 'Target annual yield',
        min: 0,
        default: 5
      }
    ]
  },
  asyncVault: {
    type: 'asyncVault',
    label: 'Async Vault Module',
    description: 'Handle deposits/withdrawals with settlement delays',
    setterFunction: 'setAsyncVaultModule',
    getterFunction: 'asyncVaultModule',
    dbColumn: 'async_vault_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: true,
    configurableFields: [
      {
        name: 'settlementDelay',
        label: 'Settlement Delay (seconds)',
        type: 'number',
        description: 'Delay before settlement',
        min: 0,
        default: 86400
      }
    ]
  },
  nativeVault: {
    type: 'nativeVault',
    label: 'Native Vault Module',
    description: 'Vault for ETH (native token)',
    setterFunction: 'setNativeVaultModule',
    getterFunction: 'nativeVaultModule',
    dbColumn: 'native_vault_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: false
  },
  router: {
    type: 'router',
    label: 'Router Module',
    description: 'Route deposits across multiple vaults',
    setterFunction: 'setRouterModule',
    getterFunction: 'routerModule',
    dbColumn: 'router_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: false
  },
  multiAssetVault: {
    type: 'multiAssetVault',
    label: 'Multi-Asset Vault Module',
    description: 'Support multiple underlying assets in one vault',
    setterFunction: 'setMultiAssetVaultModule',
    getterFunction: 'multiAssetVaultModule',
    dbColumn: 'multi_asset_vault_module_address',
    standards: ['erc4626'],
    category: 'ERC4626',
    configurable: true,
    configurableFields: [
      {
        name: 'maxAssets',
        label: 'Max Assets',
        type: 'number',
        description: 'Maximum number of asset types',
        min: 2,
        default: 10
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ERC1400 MODULES
  // ═══════════════════════════════════════════════════════════
  transferRestrictions: {
    type: 'transferRestrictions',
    label: 'Transfer Restrictions Module',
    description: 'Enforce complex transfer restrictions by partition',
    setterFunction: 'setTransferRestrictionsModule',
    getterFunction: 'transferRestrictionsModule',
    dbColumn: 'transfer_restrictions_module_address',
    standards: ['erc1400'],
    category: 'ERC1400',
    configurable: false
  },
  controller: {
    type: 'controller',
    label: 'Controller Module',
    description: 'Allow designated controllers to force transfers',
    setterFunction: 'setControllerModule',
    getterFunction: 'controllerModule',
    dbColumn: 'controller_module_address',
    standards: ['erc1400'],
    category: 'ERC1400',
    configurable: true,
    configurableFields: [
      {
        name: 'controllers',
        label: 'Controller Addresses',
        type: 'text',
        description: 'Comma-separated list of controller addresses'
      }
    ]
  },
  erc1400Document: {
    type: 'erc1400Document',
    label: 'ERC1400 Document Module',
    description: 'ERC1400-specific document management',
    setterFunction: 'setERC1400DocumentModule',
    getterFunction: 'erc1400DocumentModule',
    dbColumn: 'erc1400_document_module_address',
    standards: ['erc1400'],
    category: 'ERC1400',
    configurable: false
  }
};

export const ModuleManagementPanel: React.FC<ModuleManagementPanelProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  chain,
  isDeployed,
  onSuccess
}) => {
  // Services
  const { supabase } = useSupabase();
  
  // State
  const [activeTab, setActiveTab] = useState<'manage' | 'marketplace'>('manage');
  const [selectedModuleType, setSelectedModuleType] = useState<ModuleType>('compliance');
  const [action, setAction] = useState<'attach' | 'detach' | 'upgrade' | 'configure'>('attach');
  const [moduleAddress, setModuleAddress] = useState('');
  const [currentModules, setCurrentModules] = useState<Record<ModuleType, ModuleInstance | null>>(() => {
    const initial: Record<string, ModuleInstance | null> = {};
    (Object.keys(MODULE_INFO) as ModuleType[]).forEach(key => {
      initial[key] = null;
    });
    return initial as Record<ModuleType, ModuleInstance | null>;
  });
  const [availableVersions, setAvailableVersions] = useState<ModuleVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [moduleConfig, setModuleConfig] = useState<Record<string, any>>({});
  const [marketplaceModules, setMarketplaceModules] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState<Record<ModuleType, boolean>>({} as Record<ModuleType, boolean>);
  
  // UI state
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      setExecutionStep('complete');
      onSuccess?.();
      loadCurrentModules();
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();

  // Helper: Get modules available for current token standard
  const getAvailableModulesForStandard = (): ModuleType[] => {
    const standard = tokenStandard.toLowerCase();
    return (Object.keys(MODULE_INFO) as ModuleType[]).filter(type => {
      const info = MODULE_INFO[type];
      return info.standards.includes(standard);
    });
  };

  // Helper: Group modules by category
  const getModulesByCategory = (): Record<string, ModuleType[]> => {
    const availableTypes = getAvailableModulesForStandard();
    const grouped: Record<string, ModuleType[]> = {};
    
    availableTypes.forEach(type => {
      const info = MODULE_INFO[type];
      const category = info.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(type);
    });
    
    return grouped;
  };

  // Load current modules on mount
  useEffect(() => {
    if (isDeployed && tokenAddress) {
      loadCurrentModules();
    }
  }, [isDeployed, tokenAddress]);

  // Load available versions when module type changes
  useEffect(() => {
    if (action === 'upgrade' || action === 'attach') {
      loadAvailableVersions();
    }
  }, [selectedModuleType, action]);

  // Load marketplace on tab change
  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplace();
    }
  }, [activeTab]);

  const loadCurrentModules = async () => {
    try {
      const tableMap: Record<string, string> = {
        'erc20': 'token_erc20_properties',
        'erc721': 'token_erc721_properties',
        'erc1155': 'token_erc1155_properties',
        'erc3525': 'token_erc3525_properties',
        'erc4626': 'token_erc4626_properties',
        'erc1400': 'token_erc1400_properties'
      };
      
      const propertiesTable = tableMap[tokenStandard.toLowerCase()];
      if (!propertiesTable) {
        console.error('Unknown token standard:', tokenStandard);
        return;
      }
      
      // Get module addresses from properties table
      const { data: propertiesData, error: propertiesError } = await supabase
        .from(propertiesTable)
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (propertiesError) throw propertiesError;

      // Get module instances from token_modules table
      const { data: modulesData, error: modulesError } = await supabase
        .from('token_modules')
        .select('*')
        .eq('token_id', tokenId)
        .eq('is_active', true);

      if (modulesError) throw modulesError;

      if (propertiesData) {
        const modules: Record<string, ModuleInstance | null> = {};
        const availableForStandard = getAvailableModulesForStandard();
        
        availableForStandard.forEach(type => {
          const info = MODULE_INFO[type];
          const address = propertiesData[info.dbColumn];
          
          if (address && address !== ethers.ZeroAddress) {
            // Find module instance details
            const moduleInstance = modulesData?.find(
              m => m.module_type === type && m.is_active
            );

            modules[type] = {
              id: moduleInstance?.id || '',
              address,
              masterAddress: moduleInstance?.master_address || '',
              version: '', // Will be populated from contract_masters
              configuration: moduleInstance?.configuration || {},
              attachedAt: moduleInstance?.attached_at || new Date().toISOString(),
              isActive: true
            };

            // Load version info
            if (moduleInstance?.master_address) {
              loadModuleVersion(type, moduleInstance.master_address);
            }
          } else {
            modules[type] = null;
          }
        });
        
        setCurrentModules(modules as Record<ModuleType, ModuleInstance | null>);
      }
    } catch (error) {
      console.error('Failed to load current modules:', error);
    }
  };

  const loadModuleVersion = async (moduleType: ModuleType, masterAddress: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('version, abi_version, contract_details')
        .eq('contract_address', masterAddress)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentModules(prev => ({
          ...prev,
          [moduleType]: prev[moduleType] ? {
            ...prev[moduleType]!,
            version: data.version
          } : null
        }));
      }
    } catch (error) {
      console.error('Failed to load module version:', error);
    }
  };

  const loadAvailableVersions = async () => {
    setLoadingVersions(true);
    try {
      const info = MODULE_INFO[selectedModuleType];
      const moduleType = `${info.type}_module`;

      const { data, error } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('contract_type', moduleType)
        .eq('network', chain)
        .eq('environment', 'testnet')
        .order('version', { ascending: false });

      if (error) throw error;

      const versions: ModuleVersion[] = (data || []).map(m => ({
        version: m.version,
        address: m.contract_address,
        deployedAt: m.deployed_at,
        isActive: m.is_active,
        abiVersion: m.abi_version,
        details: m.contract_details
      }));

      setAvailableVersions(versions);

      // Auto-select latest active version
      const latestActive = versions.find(v => v.isActive);
      if (latestActive) {
        setSelectedVersion(latestActive.version);
        setModuleAddress(latestActive.address);
      }
    } catch (error) {
      console.error('Failed to load available versions:', error);
      setAvailableVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const loadMarketplace = async () => {
    setLoadingMarketplace(true);
    try {
      const { data, error } = await supabase
        .from('contract_masters')
        .select('*')
        .eq('network', chain)
        .eq('environment', 'testnet')
        .eq('is_active', true)
        .like('contract_type', '%_module')
        .order('contract_type');

      if (error) throw error;

      setMarketplaceModules(data || []);
    } catch (error) {
      console.error('Failed to load marketplace:', error);
      setMarketplaceModules([]);
    } finally {
      setLoadingMarketplace(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    setModuleConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    
    if (action === 'attach' || action === 'upgrade') {
      return !!moduleAddress && ethers.isAddress(moduleAddress);
    } else if (action === 'detach') {
      return !!currentModules[selectedModuleType];
    } else if (action === 'configure') {
      return !!currentModules[selectedModuleType];
    }
    
    return false;
  };

  const handleValidate = async () => {
    setExecutionStep('validation');
    
    let addressToUse = moduleAddress;
    if (action === 'detach') {
      addressToUse = ethers.ZeroAddress;
    }
    
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: window.ethereum?.selectedAddress || '',
      data: '0x',
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: action === 'configure' ? 'updateModuleConfig' : 'setModule',
          moduleType: selectedModuleType,
          moduleAddress: addressToUse,
          configuration: moduleConfig
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
  };

  const handleExecute = async () => {
    if (!validationResult?.valid) return;

    setExecutionStep('execution');
    
    try {
      const moduleInfo = MODULE_INFO[selectedModuleType];
      
      if (action === 'configure') {
        // Update configuration only (no on-chain tx needed)
        await updateModuleConfiguration();
      } else {
        // Attach, detach, or upgrade
        const addressToUse = action === 'detach' ? ethers.ZeroAddress : moduleAddress;
        
        await operations.setModule(
          tokenAddress,
          moduleInfo.setterFunction,
          addressToUse,
          chain
        );
        
        // Update database
        const propertiesTable = `token_${tokenStandard.toLowerCase().replace('-', '')}_properties`;
        
        await supabase
          .from(propertiesTable)
          .update({
            [moduleInfo.dbColumn]: action === 'detach' ? null : addressToUse,
            updated_at: new Date().toISOString()
          })
          .eq('token_id', tokenId);

        // Log to token_modules
        if (action === 'attach' || action === 'upgrade') {
          // Mark old module as inactive if upgrading
          if (action === 'upgrade' && currentModules[selectedModuleType]) {
            await supabase
              .from('token_modules')
              .update({ 
                is_active: false,
                detached_at: new Date().toISOString()
              })
              .eq('token_id', tokenId)
              .eq('module_type', selectedModuleType)
              .eq('is_active', true);
          }

          // Insert new module
          await supabase.from('token_modules').insert({
            token_id: tokenId,
            module_type: selectedModuleType,
            module_address: addressToUse,
            master_address: selectedVersion ? availableVersions.find(v => v.version === selectedVersion)?.address : null,
            configuration: moduleConfig,
            is_active: true,
            attached_at: new Date().toISOString()
          });
        } else if (action === 'detach') {
          await supabase
            .from('token_modules')
            .update({ 
              is_active: false,
              detached_at: new Date().toISOString()
            })
            .eq('token_id', tokenId)
            .eq('module_type', selectedModuleType)
            .eq('is_active', true);
        }
      }
    } catch (error) {
      console.error('Module operation failed:', error);
      setExecutionStep('validation');
    }
  };

  const updateModuleConfiguration = async () => {
    try {
      await supabase
        .from('token_modules')
        .update({
          configuration: moduleConfig,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId)
        .eq('module_type', selectedModuleType)
        .eq('is_active', true);

      setExecutionStep('complete');
      loadCurrentModules();
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  };

  const handleReset = () => {
    setModuleAddress('');
    setAction('attach');
    setExecutionStep('input');
    setModuleConfig({});
    setSelectedVersion('');
  };

  const getModuleStatusBadge = (moduleType: ModuleType) => {
    const module = currentModules[moduleType];
    if (!module || !module.address || module.address === ethers.ZeroAddress) {
      return <Badge variant="outline" className="bg-gray-100">Not Attached</Badge>;
    }
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
        {module.version && (
          <Badge variant="outline" className="text-xs">v{module.version}</Badge>
        )}
      </div>
    );
  };

  const hasUpgradeAvailable = (moduleType: ModuleType): boolean => {
    const module = currentModules[moduleType];
    if (!module || !module.version) return false;

    // Check if there's a newer version available
    const currentVersionNum = parseFloat(module.version);
    return availableVersions.some(v => {
      const versionNum = parseFloat(v.version);
      return v.isActive && versionNum > currentVersionNum;
    });
  };

  const toggleConfigPanel = (moduleType: ModuleType) => {
    setConfigPanelOpen(prev => ({
      ...prev,
      [moduleType]: !prev[moduleType]
    }));
  };

  const renderConfigPanel = (moduleType: ModuleType) => {
    const info = MODULE_INFO[moduleType];
    if (!info.configurable || !info.configurableFields) return null;

    const module = currentModules[moduleType];
    const currentConfig = module?.configuration || {};

    return (
      <Collapsible
        open={configPanelOpen[moduleType]}
        onOpenChange={() => toggleConfigPanel(moduleType)}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
          <span>Configure Settings</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${configPanelOpen[moduleType] ? 'rotate-90' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4 border-t mt-2">
          {info.configurableFields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              {field.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={moduleConfig[field.name] ?? currentConfig[field.name] ?? field.default ?? false}
                    onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
                  />
                  {field.description && (
                    <span className="text-sm text-muted-foreground">{field.description}</span>
                  )}
                </div>
              ) : field.type === 'number' ? (
                <Input
                  type="number"
                  value={moduleConfig[field.name] ?? currentConfig[field.name] ?? field.default ?? ''}
                  onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                  min={field.min}
                  max={field.max}
                  placeholder={field.description}
                />
              ) : (
                <Input
                  type="text"
                  value={moduleConfig[field.name] ?? currentConfig[field.name] ?? field.default ?? ''}
                  onChange={(e) => handleConfigChange(field.name, e.target.value)}
                  placeholder={field.description}
                  className={field.type === 'address' ? 'font-mono' : ''}
                />
              )}
              {field.description && field.type !== 'boolean' && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          ))}
          <Button 
            onClick={() => {
              setAction('configure');
              setSelectedModuleType(moduleType);
              handleValidate();
            }}
            size="sm"
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Update Configuration
          </Button>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Extension Module Management
          </CardTitle>
          <CardDescription>
            Manage, configure, and upgrade extension modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manage' | 'marketplace')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="manage">
                <Settings className="mr-2 h-4 w-4" />
                Manage Modules
              </TabsTrigger>
              <TabsTrigger value="marketplace">
                <Store className="mr-2 h-4 w-4" />
                Module Marketplace
              </TabsTrigger>
            </TabsList>

            {/* MANAGE TAB */}
            <TabsContent value="manage" className="space-y-4">
              <Tabs value={executionStep} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="validation" disabled={executionStep === 'input'}>
                    Validation
                  </TabsTrigger>
                  <TabsTrigger value="execution" disabled={executionStep !== 'execution'}>
                    Execution
                  </TabsTrigger>
                  <TabsTrigger value="complete" disabled={executionStep !== 'complete'}>
                    Complete
                  </TabsTrigger>
                </TabsList>

                {/* INPUT STEP */}
                <TabsContent value="input" className="space-y-4 mt-4">
                  {/* Current Modules Overview */}
                  <div className="space-y-2">
                    <Label>Currently Attached Modules</Label>
                    <div className="space-y-4">
                      {Object.entries(getModulesByCategory()).map(([category, moduleTypes]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">{category}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {moduleTypes.map(type => {
                              const info = MODULE_INFO[type];
                              const module = currentModules[type];
                              const upgradeAvailable = hasUpgradeAvailable(type);
                              
                              return (
                                <div key={type} className="p-3 border rounded-lg space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{info.label}</span>
                                    <div className="flex items-center gap-2">
                                      {getModuleStatusBadge(type)}
                                      {upgradeAvailable && (
                                        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                          <ArrowUpCircle className="h-3 w-3 mr-1" />
                                          Upgrade
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {module && module.address && module.address !== ethers.ZeroAddress && (
                                    <>
                                      <p className="text-xs font-mono text-muted-foreground">
                                        {module.address.slice(0, 10)}...{module.address.slice(-8)}
                                      </p>
                                      {renderConfigPanel(type)}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Selection */}
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select value={action} onValueChange={(v) => setAction(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attach">
                          <div className="flex items-center gap-2">
                            <Plug className="h-4 w-4" />
                            Attach Module
                          </div>
                        </SelectItem>
                        <SelectItem value="detach">
                          <div className="flex items-center gap-2">
                            <Unplug className="h-4 w-4" />
                            Detach Module
                          </div>
                        </SelectItem>
                        <SelectItem value="upgrade">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Upgrade Module
                          </div>
                        </SelectItem>
                        <SelectItem value="configure">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Update Configuration
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Module Type Selection */}
                  <div className="space-y-2">
                    <Label>Module Type</Label>
                    <Select 
                      value={selectedModuleType} 
                      onValueChange={(v) => setSelectedModuleType(v as ModuleType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(getModulesByCategory()).map(([category, moduleTypes]) => (
                          <React.Fragment key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {moduleTypes.map(type => {
                              const info = MODULE_INFO[type];
                              return (
                                <SelectItem key={type} value={type}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{info.label}</span>
                                    <span className="text-xs text-muted-foreground">{info.description}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Version Selection (for attach/upgrade) */}
                  {(action === 'attach' || action === 'upgrade') && (
                    <div className="space-y-2">
                      <Label>Module Version</Label>
                      {loadingVersions ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading versions...
                        </div>
                      ) : availableVersions.length > 0 ? (
                        <Select
                          value={selectedVersion}
                          onValueChange={(v) => {
                            setSelectedVersion(v);
                            const version = availableVersions.find(av => av.version === v);
                            if (version) setModuleAddress(version.address);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVersions.map((version) => (
                              <SelectItem key={version.version} value={version.version}>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">v{version.version}</span>
                                    {version.isActive && (
                                      <Badge variant="outline" className="text-xs">Latest</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono">{version.address}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No versions available for this module type
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Configuration Fields (for configure action) */}
                  {action === 'configure' && MODULE_INFO[selectedModuleType].configurable && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Module Configuration</h4>
                      {MODULE_INFO[selectedModuleType].configurableFields?.map(field => (
                        <div key={field.name} className="space-y-2">
                          <Label>{field.label}</Label>
                          {field.type === 'boolean' ? (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={moduleConfig[field.name] ?? currentModules[selectedModuleType]?.configuration?.[field.name] ?? field.default ?? false}
                                onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
                              />
                              {field.description && (
                                <span className="text-sm text-muted-foreground">{field.description}</span>
                              )}
                            </div>
                          ) : field.type === 'number' ? (
                            <Input
                              type="number"
                              value={moduleConfig[field.name] ?? currentModules[selectedModuleType]?.configuration?.[field.name] ?? field.default ?? ''}
                              onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                              min={field.min}
                              max={field.max}
                              placeholder={field.description}
                            />
                          ) : (
                            <Input
                              type="text"
                              value={moduleConfig[field.name] ?? currentModules[selectedModuleType]?.configuration?.[field.name] ?? field.default ?? ''}
                              onChange={(e) => handleConfigChange(field.name, e.target.value)}
                              placeholder={field.description}
                              className={field.type === 'address' ? 'font-mono' : ''}
                            />
                          )}
                          {field.description && field.type !== 'boolean' && (
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={handleValidate}
                    disabled={!validateInput() || validating}
                    className="w-full"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Validate with Policy Engine
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* VALIDATION STEP */}
                <TabsContent value="validation" className="space-y-4 mt-4">
                  {validationResult && (
                    <>
                      {validationResult.valid ? (
                        <Alert>
                          <Check className="h-4 w-4" />
                          <AlertTitle>Validation Passed</AlertTitle>
                          <AlertDescription>
                            Module {action} operation has been validated successfully.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <X className="h-4 w-4" />
                          <AlertTitle>Validation Failed</AlertTitle>
                          <AlertDescription>
                            {validationResult.errors?.join(', ') || 'Operation cannot proceed'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {validationResult.valid && (
                        <Button onClick={handleExecute} className="w-full" disabled={gatewayLoading}>
                          {gatewayLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Executing...
                            </>
                          ) : (
                            <>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Execute {action.charAt(0).toUpperCase() + action.slice(1)}
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}

                  <Button onClick={handleReset} variant="outline" className="w-full">
                    Reset
                  </Button>
                </TabsContent>

                {/* EXECUTION STEP */}
                <TabsContent value="execution" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing {action}...</span>
                  </div>
                </TabsContent>

                {/* COMPLETE STEP */}
                <TabsContent value="complete" className="space-y-4 mt-4">
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Operation Complete</AlertTitle>
                    <AlertDescription>
                      Successfully {action}ed {MODULE_INFO[selectedModuleType].label}
                    </AlertDescription>
                  </Alert>

                  <Button onClick={handleReset} className="w-full">
                    Manage Another Module
                  </Button>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* MARKETPLACE TAB */}
            <TabsContent value="marketplace" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Available Modules</Label>
                  <Button 
                    onClick={loadMarketplace} 
                    variant="outline" 
                    size="sm"
                    disabled={loadingMarketplace}
                  >
                    {loadingMarketplace ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {loadingMarketplace ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketplaceModules.map((module) => {
                      const moduleTypeKey = module.contract_type.replace('_module', '') as ModuleType;
                      const info = MODULE_INFO[moduleTypeKey];
                      
                      return (
                        <Card key={module.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Package className="h-5 w-5" />
                                  {info?.label || module.contract_type}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {info?.description || 'No description available'}
                                </CardDescription>
                              </div>
                              <Badge variant="outline">v{module.version}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="text-xs font-mono">
                                {module.contract_address.slice(0, 10)}...{module.contract_address.slice(-8)}
                              </p>
                            </div>
                            
                            {module.contract_details && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Details</p>
                                <p className="text-xs">
                                  {JSON.stringify(module.contract_details, null, 2).slice(0, 100)}...
                                </p>
                              </div>
                            )}

                            <Button 
                              onClick={() => {
                                setSelectedModuleType(moduleTypeKey);
                                setModuleAddress(module.contract_address);
                                setSelectedVersion(module.version);
                                setAction('attach');
                                setActiveTab('manage');
                              }}
                              className="w-full"
                              size="sm"
                            >
                              <Plug className="mr-2 h-4 w-4" />
                              Quick Attach
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {!loadingMarketplace && marketplaceModules.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Modules Available</AlertTitle>
                    <AlertDescription>
                      No modules are currently available in the marketplace for this network.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleManagementPanel;