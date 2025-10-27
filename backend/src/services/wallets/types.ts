export type BlockchainNetwork = 
  | 'bitcoin' 
  | 'ethereum' 
  | 'polygon' 
  | 'arbitrum' 
  | 'optimism' 
  | 'avalanche'
  | 'solana' 
  | 'near'

// Wallet Types
export type WalletType = 
  | 'hd_wallet'
  | 'multi_sig'
  | 'custodial'
  | 'external'

export type WalletStatus = 
  | 'active'
  | 'pending'
  | 'suspended'
  | 'archived'

// HD Wallet Interfaces
export interface HDWalletData {
  mnemonic: string
  seed: Buffer
  encryptedSeed: string
  masterPublicKey: string
  derivationPaths: Record<string, string>
}

export interface WalletKeyData {
  walletId: string
  encryptedSeed: string
  masterPublicKey: string
  addresses: Record<string, string>
  derivationPaths: Record<string, string>
}

export interface StoredKeyData {
  encrypted_seed: string
  master_public_key: string
  addresses: Record<string, string>
  derivation_paths: Record<string, string>
  created_at: Date
}

// Request/Response Types
export interface CreateWalletRequest {
  investor_id: string
  project_id: string
  chain_id: string // Numeric chain ID as string (e.g., "1" for Ethereum mainnet)
  name?: string
}

export interface WalletResponse {
  id: string
  investor_id: string
  name: string
  primary_address: string
  addresses: Record<string, string>
  chain_id: string // Numeric chain ID as string
  chain_name: string // Derived from chain_id using getChainName()
  is_testnet: boolean // Derived from chain_id using isTestnet()
  explorer_url?: string // Derived from chain_id using getExplorerUrl()
  status: string
  is_multi_sig_enabled: boolean
  guardian_policy?: any
  created_at: string
  updated_at: string
}

export interface WalletBalance {
  wallet_id: string
  balances: Record<string, ChainBalance>
  total_usd_value: string
  last_updated: string
}

export interface ChainBalance {
  address: string
  native_balance: string
  tokens: TokenBalance[]
}

export interface TokenBalance {
  contract_address: string
  symbol: string
  name: string
  balance: string
  decimals: number
  usd_value?: string
}

// Transaction Types
export interface TransactionRequest {
  from: string
  to: string
  amount: string
  blockchain: BlockchainNetwork
  token_address?: string
  gas_limit?: string
  gas_price?: string
  nonce?: number
}

export interface SignTransactionRequest {
  wallet_id: string
  transaction: TransactionRequest
  passphrase?: string
}

export interface TransactionResponse {
  transaction_hash: string
  status: 'pending' | 'confirmed' | 'failed'
  blockchain: BlockchainNetwork
  from: string
  to: string
  amount: string
  gas_used?: string
  confirmations?: number
}

// Multi-Signature Types
export interface MultiSigWalletConfig {
  threshold: number
  signers: string[]
  wallet_type: 'gnosis_safe' | 'custom'
}

export interface TransactionProposal {
  id: string
  wallet_id: string
  transaction: TransactionRequest
  proposer: string
  signatures: MultiSigSignature[]
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  threshold: number
  created_at: string
}

export interface MultiSigSignature {
  signer: string
  signature: string
  signed_at: string
}

// Validation Types
export interface WalletValidationResult {
  isValid: boolean
  errors: WalletValidationError[]
  warnings: string[]
}

export interface WalletValidationError {
  field: string
  message: string
  code: string
}

// Analytics Types
export interface WalletStatistics {
  total_wallets: number
  active_wallets: number
  total_value_usd: string
  transaction_count: number
  multi_sig_wallets: number
  blockchain_distribution: Record<string, number>
}

// Coin Type Constants (BIP44)
export const COIN_TYPES: Record<BlockchainNetwork, number> = {
  bitcoin: 0,
  ethereum: 60,
  polygon: 60,    // Same as Ethereum
  arbitrum: 60,   // Same as Ethereum  
  optimism: 60,   // Same as Ethereum
  avalanche: 60,  // Same as Ethereum
  solana: 501,
  near: 397
}

// Default Derivation Paths
export const DEFAULT_DERIVATION_PATHS: Record<BlockchainNetwork, string> = {
  bitcoin: "m/44'/0'/0'/0/0",
  ethereum: "m/44'/60'/0'/0/0",
  polygon: "m/44'/60'/0'/0/0",
  arbitrum: "m/44'/60'/0'/0/0", 
  optimism: "m/44'/60'/0'/0/0",
  avalanche: "m/44'/60'/0'/0/0",
  solana: "m/44'/501'/0'/0'",
  near: "m/44'/397'/0'/0/0"
}

// Transaction Types (Extended for Phase 2)
export type TransactionStatus = 
  | 'pending'
  | 'confirmed' 
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'unknown'

export type TransactionPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'

export interface TransactionFeeEstimate {
  low: {
    fee: string
    time: number // estimated confirmation time in seconds
  }
  medium: {
    fee: string
    time: number
  }
  high: {
    fee: string
    time: number
  }
  baseFee?: string
  priorityFee?: string
  maxFee?: string
  gasPrice?: string
  gasLimit: string
}

export interface TransactionSimulationResult {
  success: boolean
  gasUsed: string
  error?: string
  logs?: any[]
  events?: any[]
  returnValue?: string
}

export interface TransactionReceipt {
  hash: string
  blockNumber: number
  blockHash: string
  status: boolean
  gasUsed: string
  logs: any[]
  events?: any[]
  from: string
  to: string
  contractAddress?: string
}

export interface TransactionBuilder {
  blockchain: BlockchainNetwork
  buildTransaction(params: TransactionRequest): Promise<TransactionResponse>
  estimateFee(params: TransactionRequest): Promise<TransactionFeeEstimate>
  simulateTransaction(params: TransactionRequest): Promise<TransactionSimulationResult>
  signTransaction(params: SignTransactionRequest): Promise<string>
  broadcastTransaction(signedTx: string): Promise<string>
  getTransactionStatus(hash: string): Promise<TransactionStatus>
  getTransactionReceipt(hash: string): Promise<TransactionReceipt>
  waitForConfirmation(hash: string, confirmations?: number): Promise<TransactionReceipt>
}

// Enhanced Transaction Types
export interface BuildTransactionRequest {
  wallet_id: string
  to: string
  amount: string
  blockchain: BlockchainNetwork
  token_address?: string
  priority?: TransactionPriority
  gas_limit?: string
  gas_price?: string
  nonce?: number
  data?: string
}

export interface BuildTransactionResponse {
  transaction_id: string
  raw_transaction: string
  fee_estimate: TransactionFeeEstimate
  simulation_result: TransactionSimulationResult
  expires_at: string
}

export interface BroadcastTransactionRequest {
  transaction_id: string
  signed_transaction: string
}

export interface BroadcastTransactionResponse {
  transaction_hash: string
  status: TransactionStatus
  broadcast_at: string
}

// Nonce Management Types
export interface NonceInfo {
  wallet_id: string
  blockchain: BlockchainNetwork
  current_nonce: number
  pending_nonce: number
  last_updated: string
}

// Signing Service Types
export interface SigningRequest {
  wallet_id: string
  message_hash: string
  blockchain: BlockchainNetwork
  derivation_path?: string
}

export interface SigningResponse {
  signature: string
  public_key: string
  recovery_id?: number
}

// Security Constants
export const SECURITY_CONFIG = {
  MNEMONIC_STRENGTH: 128, // 12 words
  MNEMONIC_STRENGTH_HIGH: 256, // 24 words
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_DERIVATION_ITERATIONS: 100000,
  MIN_PASSWORD_LENGTH: 8
}

// Transaction Configuration
export const TRANSACTION_CONFIG = {
  DEFAULT_CONFIRMATION_BLOCKS: {
    bitcoin: 6,
    ethereum: 12,
    polygon: 128,
    arbitrum: 1,
    optimism: 1,
    avalanche: 1,
    solana: 32,
    near: 1
  },
  MAX_TRANSACTION_AGE_SECONDS: 3600, // 1 hour
  DEFAULT_GAS_MULTIPLIER: 1.1,
  PRIORITY_GAS_MULTIPLIERS: {
    low: 1.0,
    medium: 1.2,
    high: 1.5,
    urgent: 2.0
  }
}

// Bitcoin-specific types
export interface BitcoinUTXO {
  txid: string
  vout: number
  value: number // satoshis
  scriptPubKey: string
  confirmations: number
}

export interface CoinSelectionResult {
  selectedUTXOs: BitcoinUTXO[]
  totalInput: number // satoshis
  totalFee: number // satoshis
  changeAmount: number // satoshis
  waste: number // satoshis (measure of efficiency)
}

// NEAR-specific types
export interface NearTransaction {
  signerId: string
  publicKey: string
  nonce: number
  receiverId: string  
  blockHash: string
  actions: NearAction[]
  gas?: string
  gasPrice?: string
}

export interface NearAction {
  type: 'Transfer' | 'FunctionCall' | 'Stake' | 'AddKey' | 'DeleteKey' | 'DeployContract'
  params: any
}

export interface NearAccountInfo {
  nonce: number
  blockHash: string
  gasPrice?: number
}
