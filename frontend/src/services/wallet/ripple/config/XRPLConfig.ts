/**
 * XRPL (XRP Ledger) Configuration
 * Direct blockchain network configuration for XRPL nodes
 * This is separate from Ripple Payments API configuration
 */

export type XRPLNetwork = 'MAINNET' | 'TESTNET' | 'DEVNET'

export interface XRPLNetworkConfig {
  url: string
  clioUrl?: string // Optional Clio server for advanced queries (mpt_holders, nft_history, etc.)
  name: string
  explorerUrl: string
  isTestNetwork: boolean
}

/**
 * XRPL Network Configurations
 * WebSocket connections to XRP Ledger nodes
 * 
 * Note: Clio servers support advanced methods like:
 * - mpt_holders: Get all holders of an MPT issuance
 * - nft_history: NFT transaction history
 * - nft_info: NFT metadata
 * - nfts_by_issuer: List NFTs by issuer
 */
export const XRPL_NETWORKS: Record<XRPLNetwork, XRPLNetworkConfig> = {
  MAINNET: {
    url: 'wss://xrplcluster.com',
    clioUrl: 'wss://s2-clio.ripple.com', // Mainnet Clio server
    name: 'Mainnet',
    explorerUrl: 'https://livenet.xrpl.org',
    isTestNetwork: false
  },
  TESTNET: {
    url: 'wss://s.altnet.rippletest.net:51233',
    clioUrl: 'wss://clio.altnet.rippletest.net:51233', // Testnet Clio server
    name: 'Testnet',
    explorerUrl: 'https://testnet.xrpl.org',
    isTestNetwork: true
  },
  DEVNET: {
    url: 'wss://s.devnet.rippletest.net:51233',
    clioUrl: 'wss://clio.devnet.rippletest.net:51233', // Devnet Clio server
    name: 'Devnet',
    explorerUrl: 'https://devnet.xrpl.org',
    isTestNetwork: true
  }
}

/**
 * XRPL Configuration Constants
 */
export const XRPL_CONFIG = {
  // Default network from environment or fallback to TESTNET
  defaultNetwork: (import.meta.env.VITE_XRPL_NETWORK as XRPLNetwork) || 'TESTNET',
  
  // Connection settings
  connectionTimeout: 30000, // 30 seconds
  requestTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  
  // Transaction settings
  feeMultiplier: 1.2, // 20% buffer for fee estimation
  maxFeeXRP: '2', // Maximum fee in XRP
  
  // Reserve requirements (XRP amounts)
  baseReserve: 10, // Base reserve per account
  ownerReserve: 2, // Reserve per object owned
  
  // Transaction limits
  maxMemoDataSize: 1024, // bytes
  maxMetadataSize: 1024, // bytes
  
  // MPT (Multi-Purpose Token) specific settings
  mpt: {
    maxSupply: '9999999999999999',
    defaultAssetScale: 6,
    maxTransferFee: 50000 // 50% (in basis points)
  },
  
  // Feature flags from environment
  features: {
    mptEnabled: import.meta.env.VITE_XRPL_MPT_ENABLED === 'true',
    nftEnabled: import.meta.env.VITE_XRPL_NFT_ENABLED === 'true',
    oracleEnabled: import.meta.env.VITE_XRPL_ORACLE_ENABLED === 'true',
    paymentChannelsEnabled: import.meta.env.VITE_XRPL_PAYMENT_CHANNELS_ENABLED === 'true'
  }
} as const

/**
 * XRPL Transaction Types
 * Comprehensive list of all supported transaction types
 */
export const TRANSACTION_TYPES = {
  // Payment transactions
  PAYMENT: 'Payment',
  
  // MPT (Multi-Purpose Token) transactions
  MPT_ISSUANCE_CREATE: 'MPTokenIssuanceCreate',
  MPT_ISSUANCE_SET: 'MPTokenIssuanceSet',
  MPT_ISSUANCE_DESTROY: 'MPTokenIssuanceDestroy',
  MPT_AUTHORIZE: 'MPTokenAuthorize',
  
  // Trust line transactions
  TRUST_SET: 'TrustSet',
  
  // NFT transactions
  NFT_CREATE_OFFER: 'NFTokenCreateOffer',
  NFT_ACCEPT_OFFER: 'NFTokenAcceptOffer',
  NFT_CANCEL_OFFER: 'NFTokenCancelOffer',
  NFT_MINT: 'NFTokenMint',
  NFT_BURN: 'NFTokenBurn',
  
  // Escrow transactions
  ESCROW_CREATE: 'EscrowCreate',
  ESCROW_FINISH: 'EscrowFinish',
  ESCROW_CANCEL: 'EscrowCancel',
  
  // Check transactions
  CHECK_CREATE: 'CheckCreate',
  CHECK_CASH: 'CheckCash',
  CHECK_CANCEL: 'CheckCancel',
  
  // Payment channel transactions
  PAYMENT_CHANNEL_CREATE: 'PaymentChannelCreate',
  PAYMENT_CHANNEL_FUND: 'PaymentChannelFund',
  PAYMENT_CHANNEL_CLAIM: 'PaymentChannelClaim',
  
  // Compliance transactions
  CLAWBACK: 'Clawback',
  
  // Oracle transactions
  ORACLE_SET: 'OracleSet',
  ORACLE_DELETE: 'OracleDelete',
  
  // Credential transactions
  CREDENTIAL_CREATE: 'CredentialCreate',
  CREDENTIAL_ACCEPT: 'CredentialAccept',
  CREDENTIAL_DELETE: 'CredentialDelete',
  
  // Account management
  ACCOUNT_SET: 'AccountSet',
  ACCOUNT_DELETE: 'AccountDelete',
  SIGNER_LIST_SET: 'SignerListSet'
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

/**
 * Get network configuration
 */
export const getXRPLNetwork = (network?: XRPLNetwork): XRPLNetworkConfig => {
  const networkKey = network || XRPL_CONFIG.defaultNetwork
  return XRPL_NETWORKS[networkKey]
}

/**
 * Get explorer URL for a transaction
 */
export const getExplorerUrl = (
  txHash: string,
  network?: XRPLNetwork
): string => {
  const config = getXRPLNetwork(network)
  return `${config.explorerUrl}/transactions/${txHash}`
}

/**
 * Get explorer URL for an account
 */
export const getAccountExplorerUrl = (
  address: string,
  network?: XRPLNetwork
): string => {
  const config = getXRPLNetwork(network)
  return `${config.explorerUrl}/accounts/${address}`
}

/**
 * Get explorer URL for an NFT
 */
export const getNFTExplorerUrl = (
  nftId: string,
  network?: XRPLNetwork
): string => {
  const config = getXRPLNetwork(network)
  return `${config.explorerUrl}/nft/${nftId}`
}

/**
 * Get explorer URL for an MPT issuance
 */
export const getMPTExplorerUrl = (
  issuanceId: string,
  network?: XRPLNetwork
): string => {
  const config = getXRPLNetwork(network)
  return `${config.explorerUrl}/mpt/${issuanceId}`
}

/**
 * Validate XRPL address format
 */
export const isValidXRPLAddress = (address: string): boolean => {
  return /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)
}

/**
 * Validate X-Address format
 */
export const isValidXAddress = (xAddress: string): boolean => {
  return /^X[1-9A-HJ-NP-Za-km-z]{46}$/.test(xAddress)
}

/**
 * Check if feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof XRPL_CONFIG.features): boolean => {
  return XRPL_CONFIG.features[feature]
}
