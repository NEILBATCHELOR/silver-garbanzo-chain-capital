/**
 * Token Templates
 * 
 * Provides template data for different token standards in both basic and advanced modes
 */
import { TokenStandard } from '@/types/core/centralModels';

// Configuration modes
type ConfigMode = 'min' | 'max';

/**
 * Get a template for the specified token standard and configuration mode
 */
export function getTemplateForStandard(standard: TokenStandard, mode: ConfigMode = 'min') {
  switch (standard) {
    case TokenStandard.ERC20:
      return mode === 'min' ? erc20BasicTemplate : erc20AdvancedTemplate;
    case TokenStandard.ERC721:
      return mode === 'min' ? erc721BasicTemplate : erc721AdvancedTemplate;
    case TokenStandard.ERC1155:
      return mode === 'min' ? erc1155BasicTemplate : erc1155AdvancedTemplate;
    case TokenStandard.ERC1400:
      return mode === 'min' ? erc1400BasicTemplate : erc1400AdvancedTemplate;
    case TokenStandard.ERC3525:
      return mode === 'min' ? erc3525BasicTemplate : erc3525AdvancedTemplate;
    case TokenStandard.ERC4626:
      return mode === 'min' ? erc4626BasicTemplate : erc4626AdvancedTemplate;
    default:
      return erc20BasicTemplate;
  }
}

// ERC-20 Templates
const erc20BasicTemplate = {
  name: "My ERC-20 Token",
  symbol: "MET",
  standard: TokenStandard.ERC20,
  decimals: 18,
  description: "A basic ERC-20 fungible token",
  initialSupply: "1000000",
  config_mode: "min",
  blocks: {
    name: "My ERC-20 Token",
    symbol: "MET",
    initial_supply: "1000000"
  }
};

const erc20AdvancedTemplate = {
  name: "Advanced ERC-20 Token",
  symbol: "AET",
  standard: TokenStandard.ERC20,
  decimals: 18,
  description: "An advanced ERC-20 fungible token with additional features",
  initialSupply: "1000000",
  cap: "10000000",
  isMintable: true,
  isBurnable: true,
  isPausable: true,
  tokenType: "utility",
  accessControl: "roles",
  allowanceManagement: true,
  permit: true,
  snapshot: true,
  feeOnTransfer: {
    enabled: true,
    fee: "2.5",
    recipient: "0x0000000000000000000000000000000000000000",
    feeType: "percentage"
  },
  rebasing: {
    enabled: false,
    mode: "automatic",
    targetSupply: "2000000"
  },
  governanceFeatures: {
    enabled: false,
    votingPeriod: 7,
    proposalThreshold: "1000",
    quorumPercentage: "4"
  },
  metadata: {
    website: "https://example.com",
    whitepaper: "https://example.com/whitepaper",
    social: {
      twitter: "https://twitter.com/example",
      telegram: "https://t.me/example"
    }
  },
  config_mode: "max",
  blocks: {
    name: "Advanced ERC-20 Token",
    symbol: "AET",
    initial_supply: "1000000",
    cap: "10000000",
    is_mintable: true,
    is_burnable: true,
    is_pausable: true,
    token_type: "utility",
    access_control: "roles",
    allow_management: true,
    permit: true,
    snapshot: true,
    fee_on_transfer: {
      enabled: true,
      fee: "2.5",
      recipient: "0x0000000000000000000000000000000000000000",
      feeType: "percentage"
    },
    rebasing: {
      enabled: false,
      mode: "automatic",
      targetSupply: "2000000"
    },
    governance_features: {
      enabled: false,
      votingPeriod: 7,
      proposalThreshold: "1000",
      quorumPercentage: "4"
    }
  }
};

// ERC-721 Templates
const erc721BasicTemplate = {
  name: "My NFT Collection",
  symbol: "MNFT",
  standard: TokenStandard.ERC721,
  decimals: 0, // NFTs always have 0 decimals
  description: "A basic NFT collection",
  baseUri: "https://api.example.com/metadata/",
  config_mode: "min",
  metadataStorage: "ipfs",
  blocks: {
    name: "My NFT Collection",
    symbol: "MNFT",
    base_uri: "https://api.example.com/metadata/"
  }
};

const erc721AdvancedTemplate = {
  name: "Advanced NFT Collection",
  symbol: "ANFT",
  standard: TokenStandard.ERC721,
  decimals: 0, // NFTs always have 0 decimals
  description: "An advanced NFT collection with additional features",
  baseUri: "https://api.example.com/metadata/",
  metadataStorage: "ipfs",
  maxSupply: "10000",
  hasRoyalty: true,
  royaltyPercentage: "2.5",
  royaltyReceiver: "0x0000000000000000000000000000000000000000",
  isBurnable: true,
  isPausable: true,
  assetType: "unique_asset",
  mintingMethod: "whitelist",
  autoIncrementIds: true,
  enumerable: true,
  uriStorage: "tokenId",
  accessControl: "roles",
  updatableUris: true,
  contractUri: "https://api.example.com/collection-metadata.json",
  dynamicMetadata: false,
  revealable: true,
  preRevealUri: "https://api.example.com/pre-reveal/hidden.json",
  reservedTokens: "100",
  maxMintsPerTx: "5",
  maxMintsPerWallet: "10",
  mintingPrice: "0.08",
  useSafeTransfer: true,
  enableFractionalOwnership: false,
  provenanceTracking: true,
  standardArrays: {
    tokenAttributes: [
      {
        trait_type: "Color",
        values: ["Red", "Blue", "Green"]
      },
      {
        trait_type: "Size",
        values: ["Small", "Medium", "Large"]
      }
    ]
  },
  metadata: {
    website: "https://example.com",
    collection: "My Collection",
    creator: "Example Artist"
  },
  config_mode: "max",
  blocks: {
    name: "Advanced NFT Collection",
    symbol: "ANFT",
    base_uri: "https://api.example.com/metadata/",
    metadata_storage: "ipfs",
    max_supply: "10000",
    has_royalty: true,
    royalty_percentage: "2.5",
    royalty_receiver: "0x0000000000000000000000000000000000000000",
    is_burnable: true,
    is_pausable: true
  }
};

// ERC-1155 Templates
const erc1155BasicTemplate = {
  name: "My Multi-Token",
  symbol: "MMT",
  standard: TokenStandard.ERC1155,
  decimals: 0, // Semi-fungible tokens typically have 0 decimals
  description: "A basic ERC-1155 multi-token",
  uri: "https://api.example.com/metadata/{id}",
  config_mode: "min",
  blocks: {
    name: "My Multi-Token",
    symbol: "MMT",
    base_uri: "https://api.example.com/metadata/{id}"
  },
  // Add basic auxiliary arrays for testing
  tokenTypes: [
    {
      id: "1",
      name: "Basic Token",
      description: "A basic multi-token",
      maxSupply: "1000",
      isTransferable: true,
      isTradeable: true
    }
  ],
  uriMappings: [
    {
      tokenTypeId: "1",
      uri: "https://api.example.com/metadata/1.json"
    }
  ]
};

const erc1155AdvancedTemplate = {
  name: "Advanced Multi-Token",
  symbol: "AMT",
  standard: TokenStandard.ERC1155,
  decimals: 0, // Semi-fungible tokens typically have 0 decimals
  description: "An advanced ERC-1155 multi-token with additional features",
  baseUri: "https://api.example.com/metadata/{id}",
  metadataStorage: "ipfs",
  hasRoyalty: true,
  royaltyPercentage: "2.5",
  royaltyReceiver: "0x0000000000000000000000000000000000000000",
  isBurnable: true,
  isPausable: true,
  accessControl: "roles",
  updatableUris: true,
  supplyTracking: true,
  enableApprovalForAll: true,
  dynamicUris: false,
  batchMinting: true,
  batchTransfers: true,
  transferRestrictions: false,
  whitelist: false,
  blacklist: false,
  mintingRoles: false,
  containerEnabled: false,
  standardArrays: {
    types: [
      {
        type_id: "1",
        name: "Gold Coin",
        supply: "1000",
        description: "A rare gold coin",
        fungible: true,
        maxSupply: "5000",
        metadataUri: ""
      },
      {
        type_id: "2",
        name: "Silver Coin",
        supply: "5000",
        description: "A common silver coin",
        fungible: true,
        maxSupply: "20000",
        metadataUri: ""
      },
      {
        type_id: "3",
        name: "Bronze Coin",
        supply: "10000",
        description: "A very common bronze coin",
        fungible: true,
        maxSupply: "50000",
        metadataUri: ""
      }
    ],
    craftingRecipes: [
      {
        name: "Forge Silver Coin",
        inputs: [
          { tokenTypeId: "3", amount: 5 },
          { tokenTypeId: "material_copper", amount: 2 }
        ],
        outputTokenTypeId: "2",
        outputQuantity: 1,
        successRate: 85,
        cooldown: 3600,
        requiredLevel: 5,
        isEnabled: true
      },
      {
        name: "Forge Gold Coin",
        inputs: [
          { tokenTypeId: "2", amount: 3 },
          { tokenTypeId: "material_gold", amount: 1 }
        ],
        outputTokenTypeId: "1",
        outputQuantity: 1,
        successRate: 65,
        cooldown: 7200,
        requiredLevel: 10,
        isEnabled: true
      }
    ],
    discountTiers: [
      {
        tier: "Bronze",
        minimumQuantity: 100,
        maximumQuantity: 499,
        discountPercentage: "5",
        description: "5% discount for bronze tier purchases"
      },
      {
        tier: "Silver", 
        minimumQuantity: 500,
        maximumQuantity: 999,
        discountPercentage: "10",
        description: "10% discount for silver tier purchases"
      },
      {
        tier: "Gold",
        minimumQuantity: 1000,
        discountPercentage: "15",
        description: "15% discount for gold tier purchases"
      }
    ],
    uriMappings: [
      {
        tokenTypeId: "1",
        uri: "https://api.example.com/metadata/gold-coin.json"
      },
      {
        tokenTypeId: "2",
        uri: "https://api.example.com/metadata/silver-coin.json"
      },
      {
        tokenTypeId: "3",
        uri: "https://api.example.com/metadata/bronze-coin.json"
      }
    ],
    typeConfigs: [
      {
        tokenTypeId: "1",
        supplyCap: "5000",
        mintPrice: "0.1",
        isTradeable: true,
        isTransferable: true,
        utilityType: "currency",
        rarityTier: "legendary",
        experienceValue: 100,
        craftingMaterials: { "gold_ore": 3, "energy": 50 },
        burnRewards: { "gold_dust": 1, "experience": 25 }
      },
      {
        tokenTypeId: "2",
        supplyCap: "20000",
        mintPrice: "0.05",
        isTradeable: true,
        isTransferable: true,
        utilityType: "currency",
        rarityTier: "rare",
        experienceValue: 50,
        craftingMaterials: { "silver_ore": 2, "energy": 25 },
        burnRewards: { "silver_dust": 1, "experience": 10 }
      },
      {
        tokenTypeId: "3",
        supplyCap: "50000",
        mintPrice: "0.01",
        isTradeable: true,
        isTransferable: true,
        utilityType: "currency",
        rarityTier: "common",
        experienceValue: 10,
        craftingMaterials: { "copper_ore": 1, "energy": 10 },
        burnRewards: { "copper_dust": 1, "experience": 2 }
      }
    ],
    balances: [
      {
        tokenTypeId: "1",
        address: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        amount: "100"
      },
      {
        tokenTypeId: "2", 
        address: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        amount: "500"
      },
      {
        tokenTypeId: "3",
        address: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        amount: "1000"
      }
    ]
  },
  metadata: {
    website: "https://example.com",
    collection: "My Game Assets"
  },
  config_mode: "max",
  blocks: {
    name: "Advanced Multi-Token",
    symbol: "AMT",
    base_uri: "https://api.example.com/metadata/{id}",
    metadata_storage: "ipfs",
    has_royalty: true,
    royalty_percentage: "2.5",
    royalty_receiver: "0x0000000000000000000000000000000000000000",
    is_burnable: true,
    is_pausable: true
  }
};

// ERC-1400 Templates
const erc1400BasicTemplate = {
  name: "My Security Token",
  symbol: "MST",
  standard: TokenStandard.ERC1400,
  description: "A basic ERC-1400 security token",
  decimals: 18,
  initialSupply: "1000000",
  securityType: "equity", // must be one of: 'equity', 'debt', 'preferred', 'bond', 'option'
  isIssuable: true,
  config_mode: "min",
  // Add default partitions required by ERC-1400 validation
  partitions: [
    {
      name: "Common Shares",
      partitionId: "COMMON",
      amount: "1000000",
      transferable: true
    }
  ],
  // Basic array data for testing
  standardArrays: {
    partitions: [
      {
        name: "Common Shares",
        partitionId: "COMMON",
        amount: "1000000",
        transferable: true
      }
    ],
    controllers: [
      "0x0000000000000000000000000000000000000001"
    ],
    documents: [
      {
        name: "Basic Legal Document",
        documentUri: "https://example.com/basic-doc.pdf",
        documentType: "legal-agreement"
      }
    ],
    corporateActions: [
      {
        actionType: "dividend",
        announcementDate: "2024-06-15",
        actionDetails: { description: "Basic dividend payment" }
      }
    ]
  },
  blocks: {
    name: "My Security Token",
    symbol: "MST",
    initial_supply: "1000000",
    security_type: "equity",
    is_issuable: true,
    decimals: 18
  }
};

const erc1400AdvancedTemplate = {
  name: "Advanced Security Token",
  symbol: "AST",
  standard: TokenStandard.ERC1400,
  description: "An advanced ERC-1400 security token with additional features",
  decimals: 18,
  initialSupply: "1000000",
  cap: "10000000",
  isMintable: true,
  isBurnable: true,
  isPausable: true,
  documentUri: "https://example.com/legal",
  documentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  controllerAddress: "0x0000000000000000000000000000000000000000",
  requireKyc: true,
  securityType: "equity", // must be one of: 'equity', 'debt', 'preferred', 'bond', 'option'
  isIssuable: true,
  issuingJurisdiction: "US",
  issuingEntityName: "Example Inc.",
  issuingEntityLei: "123456789ABCDEFGHIJK",
  transferRestrictions: {
    maxBalance: "100000",
    maxTransfer: "10000"
  },
  forcedTransfers: true,
  issuanceModules: true,
  documentManagement: true,
  recoveryMechanism: false,
  // Add partitions at top level for validation compatibility
  partitions: [
    {
      name: "Class A",
      partitionId: "PARTITION-A",
      amount: "500000",
      transferable: true
    },
    {
      name: "Class B",
      partitionId: "PARTITION-B",
      amount: "500000",
      transferable: true
    }
  ],
  // Keep controllers at top level for validation compatibility
  controllers: [
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002"
  ],
  standardArrays: {
    partitions: [
      {
        name: "Class A",
        partitionId: "PARTITION-A",
        amount: "500000",
        transferable: true
      },
      {
        name: "Class B",
        partitionId: "PARTITION-B",
        amount: "500000",
        transferable: true
      }
    ],
    controllers: [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002"
    ],
    documents: [
      {
        name: "Private Placement Memorandum",
        documentUri: "https://example.com/ppm.pdf",
        documentType: "prospectus",
        documentHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
      },
      {
        name: "Subscription Agreement",
        documentUri: "https://example.com/subscription.pdf",
        documentType: "legal-agreement",
        documentHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
      }
    ],
    corporateActions: [
      {
        actionType: "dividend",
        announcementDate: "2024-06-15",
        recordDate: "2024-06-30",
        paymentDate: "2024-07-15",
        actionDetails: { 
          description: "Quarterly dividend payment",
          amount: "0.50",
          currency: "USD"
        },
        status: "announced"
      },
      {
        actionType: "stock_split",
        announcementDate: "2024-09-01",
        effectiveDate: "2024-09-15",
        actionDetails: {
          description: "2-for-1 stock split",
          ratio: "2:1"
        },
        status: "pending"
      }
    ],
    custodyProviders: [
      {
        providerName: "Prime Trust Custody",
        providerType: "institutional",
        providerAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        providerLei: "549300QVFGP2T1A7T23",
        jurisdiction: "US",
        certificationLevel: "tier1",
        isActive: true,
        integrationStatus: "active"
      },
      {
        providerName: "Digital Asset Custody Co",
        providerType: "digital_native",
        providerAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        jurisdiction: "UK",
        certificationLevel: "standard",
        isActive: true,
        integrationStatus: "pending"
      }
    ],
    regulatoryFilings: [
      {
        filingType: "form-d",
        filingDate: "2024-01-15",
        filingJurisdiction: "US",
        filingReference: "021-123456",
        regulatoryBody: "SEC",
        complianceStatus: "filed",
        documentUri: "https://example.com/form-d.pdf",
        documentHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d"
      },
      {
        filingType: "annual-report",
        filingDate: "2024-03-31",
        filingJurisdiction: "US",
        filingReference: "10-K-2024",
        regulatoryBody: "SEC",
        complianceStatus: "pending",
        dueDate: "2024-04-15",
        autoGenerated: false
      }
    ],
    partitionBalances: [
      {
        partitionId: "PARTITION-A",
        holderAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        balance: "250000",
        metadata: {
          lastUpdated: "2024-06-01",
          source: "initial_allocation"
        }
      },
      {
        partitionId: "PARTITION-A",
        holderAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        balance: "150000",
        metadata: {
          lastUpdated: "2024-06-01",
          source: "initial_allocation"
        }
      },
      {
        partitionId: "PARTITION-B",
        holderAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        balance: "300000",
        metadata: {
          lastUpdated: "2024-06-01",
          source: "initial_allocation"
        }
      }
    ],
    partitionOperators: [
      {
        partitionId: "PARTITION-A",
        holderAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        authorized: true,
        metadata: {
          role: "fund_manager",
          permissions: ["transfer", "mint", "burn"]
        }
      },
      {
        partitionId: "PARTITION-B",
        holderAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        operatorAddress: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        authorized: true,
        metadata: {
          role: "compliance_officer",
          permissions: ["force_transfer", "freeze"]
        }
      }
    ],
    partitionTransfers: [
      {
        partitionId: "PARTITION-A",
        fromAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        toAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        amount: "50000",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        transactionHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
        metadata: {
          transferType: "secondary_market",
          timestamp: "2024-06-15T10:30:00Z",
          fees: "250"
        }
      },
      {
        partitionId: "PARTITION-B",
        fromAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        toAddress: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        amount: "25000",
        transactionHash: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
        metadata: {
          transferType: "private_transfer",
          timestamp: "2024-06-20T14:45:00Z"
        }
      }
    ]
  },
  metadata: {
    website: "https://example.com",
    legalDocuments: "https://example.com/legal"
  },
  config_mode: "max",
  blocks: {
    name: "Advanced Security Token",
    symbol: "AST",
    initial_supply: "1000000",
    cap: "10000000",
    is_mintable: true,
    is_burnable: true,
    is_pausable: true,
    document_uri: "https://example.com/legal",
    document_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    controller_address: "0x0000000000000000000000000000000000000000",
    require_kyc: true,
    security_type: "equity"
  }
};

// ERC-3525 Templates
const erc3525BasicTemplate = {
  name: "My Semi-Fungible Token",
  symbol: "MSFT",
  standard: TokenStandard.ERC3525,
  description: "A basic ERC-3525 semi-fungible token",
  valueDecimals: 0,
  baseUri: "https://api.example.com/metadata/",
  metadataStorage: "ipfs",
  slotType: "generic",
  config_mode: "min",
  slots: [
    {
      id: "1",
      name: "Default Slot",
      description: "Default slot for basic token setup",
      valueUnits: "units",
      transferable: true,
      properties: {}
    }
  ],
  blocks: {
    name: "My Semi-Fungible Token",
    symbol: "MSFT",
    value_decimals: 0,
    base_uri: "https://api.example.com/metadata/",
    metadata_storage: "ipfs",
    slot_type: "generic"
  }
};

const erc3525AdvancedTemplate = {
  name: "Advanced Semi-Fungible Token",
  symbol: "ASFT",
  standard: TokenStandard.ERC3525,
  description: "An advanced ERC-3525 semi-fungible token with additional features",
  valueDecimals: 6,
  baseUri: "https://api.example.com/metadata/",
  metadataStorage: "ipfs",
  slotType: "property",
  isBurnable: true,
  isPausable: true,
  hasRoyalty: true,
  royaltyPercentage: "2.5",
  royaltyReceiver: "0x0000000000000000000000000000000000000000",
  slotApprovals: true,
  valueApprovals: true,
  accessControl: "roles",
  updatableUris: true,
  updatableSlots: true,
  valueTransfersEnabled: true,
  dynamicMetadata: false,
  allowsSlotEnumeration: true,
  
  // Financial Instrument Properties
  financialInstrumentType: "corporate_bond",
  principalAmount: "500000000000000000000000000",
  interestRate: "5.25",
  maturityDate: "2030-06-17T00:00:00Z",
  couponFrequency: "semi_annual",
  earlyRedemptionEnabled: true,
  redemptionPenaltyRate: "2.0",
  
  // Advanced Slot Management
  slotCreationEnabled: true,
  dynamicSlotCreation: true,
  slotFreezeEnabled: true,
  slotMergeEnabled: true,
  slotSplitEnabled: true,
  crossSlotTransfers: false,
  
  // Value Computation & Trading
  valueComputationMethod: "principal_plus_accrued_interest",
  accrualEnabled: true,
  accrualRate: "5.25",
  accrualFrequency: "daily",
  valueAdjustmentEnabled: true,
  
  // Marketplace & Trading Features
  slotMarketplaceEnabled: true,
  valueMarketplaceEnabled: true,
  partialValueTrading: true,
  tradingFeesEnabled: false,
  marketMakerEnabled: false,
  
  // Compliance & Security
  regulatoryComplianceEnabled: true,
  kycRequired: true,
  accreditedInvestorOnly: false,
  multiSignatureRequired: false,
  approvalWorkflowEnabled: true,
  institutionalCustodySupport: true,
  auditTrailEnhanced: true,
  batchOperationsEnabled: true,
  emergencyPauseEnabled: true,
  
  // Geographic & Whitelist Config
  useGeographicRestrictions: true,
  defaultRestrictionPolicy: "allow",
  
  slots: [
    {
      id: "1",
      name: "Land Plot A",
      description: "A premium land plot in district A",
      valueUnits: "square_meters",
      transferable: true,
      properties: {
        size: "large",
        location: "downtown",
        zoning: "commercial"
      }
    },
    {
      id: "2",
      name: "Land Plot B", 
      description: "A standard land plot in district B",
      valueUnits: "square_meters",
      transferable: true,
      properties: {
        size: "medium",
        location: "suburb",
        zoning: "residential"
      }
    },
    {
      id: "3",
      name: "Land Plot C",
      description: "An economy land plot in district C", 
      valueUnits: "square_meters",
      transferable: true,
      properties: {
        size: "small",
        location: "outskirts",
        zoning: "industrial"
      }
    }
  ],
  standardArrays: {
    slots: [
      {
        id: "1",
        name: "Land Plot A",
        description: "A premium land plot in district A",
        valueUnits: "square_meters",
        transferable: true,
        properties: {
          size: "large",
          location: "downtown",
          zoning: "commercial",
          estimated_value: "1000000",
          development_potential: "high"
        }
      },
      {
        id: "2",
        name: "Land Plot B",
        description: "A standard land plot in district B",
        valueUnits: "square_meters", 
        transferable: true,
        properties: {
          size: "medium",
          location: "suburb",
          zoning: "residential",
          estimated_value: "500000",
          development_potential: "medium"
        }
      },
      {
        id: "3",
        name: "Land Plot C",
        description: "An economy land plot in district C",
        valueUnits: "square_meters",
        transferable: true,
        properties: {
          size: "small",
          location: "outskirts", 
          zoning: "industrial",
          estimated_value: "200000",
          development_potential: "low"
        }
      }
    ],
    allocations: [
      {
        slotId: "1",
        holderAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        valueAmount: "100000000",
        allocationDate: "2024-06-01T00:00:00Z",
        vestingSchedule: "immediate"
      }
    ],
    paymentSchedules: [
      {
        scheduleId: "bond_2024_1",
        slotId: "1",
        paymentType: "interest",
        amount: "13125000000000000000000000",
        paymentDate: "2024-12-17T00:00:00Z",
        currency: "USD",
        status: "scheduled"
      }
    ],
    valueAdjustments: [
      {
        adjustmentId: "adj_2024_q2",
        slotId: "1", 
        adjustmentType: "accrual",
        adjustmentAmount: "6562500000000000000000000",
        adjustmentDate: "2024-06-30T00:00:00Z",
        reason: "quarterly_accrual"
      }
    ],
    slotConfigs: [
      {
        slotId: "1",
        configKey: "minimum_value_unit",
        configValue: "1000000000000000000",
        description: "Minimum transferable value unit"
      }
    ]
  },
  metadata: {
    website: "https://example.com",
    gameWorld: "Meta Universe",
    bondProspectus: "https://example.com/prospectus.pdf"
  },
  config_mode: "max",
  blocks: {
    name: "Advanced Semi-Fungible Token",
    symbol: "ASFT",
    value_decimals: 6,
    base_uri: "https://api.example.com/metadata/",
    metadata_storage: "ipfs",
    slot_type: "property",
    is_burnable: true,
    is_pausable: true,
    has_royalty: true,
    royalty_percentage: "2.5",
    royalty_receiver: "0x0000000000000000000000000000000000000000",
    financial_instrument_type: "corporate_bond",
    principal_amount: "500000000000000000000000000",
    interest_rate: "5.25",
    maturity_date: "2030-06-17T00:00:00Z"
  }
};

// ERC-4626 Templates
const erc4626BasicTemplate = {
  name: "My Vault Token",
  symbol: "MVT",
  standard: TokenStandard.ERC4626,
  decimals: 18,
  description: "A basic ERC-4626 tokenized vault",
  assetAddress: "0x0000000000000000000000000000000000000000",
  // Basic additional table arrays for comprehensive support
  vaultStrategies: [
    {
      strategyName: "Simple Yield Strategy",
      strategyType: "lending",
      protocolName: "Compound",
      allocationPercentage: "100.0",
      riskScore: 1,
      expectedApy: "3.5",
      isActive: true
    }
  ],
  assetAllocations: [
    {
      asset: "USDC",
      percentage: "100.0",
      description: "Single asset allocation"
    }
  ],
  feeTiers: [
    {
      tierName: "Standard",
      minBalance: "100",
      managementFeeRate: "1.0",
      performanceFeeRate: "10.0",
      isActive: true
    }
  ],
  strategyParams: [
    {
      name: "rebalanceFrequency",
      value: "weekly",
      description: "How often to rebalance",
      paramType: "string",
      isRequired: false
    }
  ],
  config_mode: "min",
  blocks: {
    name: "My Vault Token",
    symbol: "MVT",
    asset_address: "0x0000000000000000000000000000000000000000"
  }
};

const erc4626AdvancedTemplate = {
  name: "Advanced Vault Token",
  symbol: "AVT",
  standard: TokenStandard.ERC4626,
  decimals: 18,
  description: "An advanced ERC-4626 tokenized vault with additional features",
  assetAddress: "0x0000000000000000000000000000000000000000",
  assetName: "USD Coin",
  assetSymbol: "USDC",
  assetDecimals: 6,
  vaultType: "yield",
  isMintable: true,
  isBurnable: true,
  isPausable: true,
  vaultStrategy: "compound",
  customStrategy: false,
  strategyController: "0x0000000000000000000000000000000000000000",
  accessControl: "roles",
  permit: true,
  flashLoans: false,
  emergencyShutdown: true,
  yieldStrategy: "lending",
  strategyDetails: "Allocate funds to Compound and Aave protocols for optimal yield",
  expectedAPY: "5-8%",
  allowlist: false,
  customHooks: false,
  autoReporting: true,
  previewFunctions: true,
  limitFunctions: true,
  compoundIntegration: true,
  aaveIntegration: true,
  lidoIntegration: false,
  uniswapIntegration: false,
  curveIntegration: false,
  customIntegration: "",
  fee: {
    enabled: true,
    managementFee: "2.0",
    performanceFee: "20.0",
    depositFee: "0.1",
    withdrawalFee: "0.2"
  },
  limits: {
    minDeposit: "100",
    maxDeposit: "1000000",
    maxWithdraw: "500000",
    maxRedeem: "500000"
  },
  rebalancingRules: {
    minRebalanceInterval: 86400,
    slippageTolerance: "0.5"
  },
  // Comprehensive ERC-4626 additional tables support
  vaultStrategies: [
    {
      strategyName: "Conservative Lending Strategy",
      strategyType: "lending",
      protocolAddress: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
      protocolName: "Compound V3",
      allocationPercentage: "60.0",
      minAllocationPercentage: "40.0",
      maxAllocationPercentage: "80.0",
      riskScore: 2,
      expectedApy: "4.5",
      actualApy: "4.2",
      isActive: true,
      lastRebalance: new Date().toISOString()
    },
    {
      strategyName: "Moderate Yield Strategy",
      strategyType: "liquidity_provision",
      protocolAddress: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
      protocolName: "Aave V3",
      allocationPercentage: "40.0",
      minAllocationPercentage: "20.0",
      maxAllocationPercentage: "60.0",
      riskScore: 4,
      expectedApy: "6.8",
      actualApy: "6.5",
      isActive: true,
      lastRebalance: new Date().toISOString()
    }
  ],
  assetAllocations: [
    {
      asset: "USDC",
      percentage: "50.0",
      description: "Primary stablecoin allocation",
      protocol: "Compound V3",
      expectedApy: "4.5"
    },
    {
      asset: "DAI",
      percentage: "30.0",
      description: "Secondary stablecoin allocation",
      protocol: "Aave V3",
      expectedApy: "4.2"
    },
    {
      asset: "USDT",
      percentage: "20.0",
      description: "Tertiary stablecoin allocation",
      protocol: "Compound V3",
      expectedApy: "4.8"
    }
  ],
  feeTiers: [
    {
      tierName: "Standard",
      minBalance: "1000",
      maxBalance: "100000",
      managementFeeRate: "1.5",
      performanceFeeRate: "15.0",
      depositFeeRate: "0.1",
      withdrawalFeeRate: "0.2",
      tierBenefits: {
        priorityWithdrawal: false,
        customReports: false,
        dedicatedSupport: false
      },
      isActive: true
    },
    {
      tierName: "Premium",
      minBalance: "100000",
      maxBalance: "1000000",
      managementFeeRate: "1.0",
      performanceFeeRate: "12.0",
      depositFeeRate: "0.0",
      withdrawalFeeRate: "0.1",
      tierBenefits: {
        priorityWithdrawal: true,
        customReports: true,
        dedicatedSupport: false
      },
      isActive: true
    },
    {
      tierName: "Institutional",
      minBalance: "1000000",
      maxBalance: null,
      managementFeeRate: "0.5",
      performanceFeeRate: "8.0",
      depositFeeRate: "0.0",
      withdrawalFeeRate: "0.0",
      tierBenefits: {
        priorityWithdrawal: true,
        customReports: true,
        dedicatedSupport: true
      },
      isActive: true
    }
  ],
  performanceMetrics: [
    {
      metricDate: new Date().toISOString().split('T')[0],
      totalAssets: "2500000.00",
      sharePrice: "1.045",
      apy: "5.8",
      dailyYield: "0.016",
      benchmarkPerformance: "4.2",
      totalFeesCollected: "12500.00",
      newDeposits: "150000.00",
      withdrawals: "75000.00",
      netFlow: "75000.00",
      sharpeRatio: "1.25",
      volatility: "2.1",
      maxDrawdown: "1.8"
    }
  ],
  strategyParams: [
    {
      name: "rebalanceThreshold",
      value: "5.0",
      description: "Percentage threshold for triggering rebalancing",
      paramType: "percentage",
      isRequired: true,
      defaultValue: "5.0"
    },
    {
      name: "maxSlippage",
      value: "0.5",
      description: "Maximum acceptable slippage for trades",
      paramType: "percentage",
      isRequired: true,
      defaultValue: "0.5"
    },
    {
      name: "rebalanceFrequency",
      value: "weekly",
      description: "How often the vault should rebalance",
      paramType: "string",
      isRequired: false,
      defaultValue: "weekly"
    },
    {
      name: "riskTolerance",
      value: "moderate",
      description: "Risk tolerance level for strategy allocation",
      paramType: "string",
      isRequired: false,
      defaultValue: "moderate"
    }
  ],
  standardArrays: {
    strategyParams: [
      {
        name: "protocol",
        value: "compound",
        description: "Primary yield protocol"
      },
      {
        name: "protocol",
        value: "aave",
        description: "Secondary yield protocol"
      },
      {
        name: "rebalancingFrequency",
        value: "daily",
        description: "How often to rebalance"
      }
    ],
    assetAllocations: [
      {
        asset: "Compound cUSDC",
        percentage: 60
      },
      {
        asset: "Aave aUSDC",
        percentage: 40
      }
    ]
  },
  metadata: {
    website: "https://example.com",
    riskRating: "Medium",
    expectedAPY: "5-8%"
  },
  config_mode: "max",
  blocks: {
    name: "Advanced Vault Token",
    symbol: "AVT",
    asset_address: "0x0000000000000000000000000000000000000000",
    asset_name: "USD Coin",
    asset_symbol: "USDC",
    asset_decimals: 6,
    vault_type: "yield",
    is_mintable: true,
    is_burnable: true,
    is_pausable: true,
    vault_strategy: "compound",
    custom_strategy: false,
    strategy_controller: "0x0000000000000000000000000000000000000000"
  }
};