/**
 * DFNS Core Types
 * 
 * Core type definitions matching the DFNS API and database schema
 */

// Base DFNS Status Types
export type DfnsStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended' | 'Archived';
export type DfnsTransactionStatus = 'Pending' | 'Broadcasted' | 'Confirmed' | 'Failed' | 'Cancelled' | 'Completed' | 'Executing';
export type DfnsCredentialKind = 'Fido2' | 'Key' | 'PasswordProtectedKey' | 'RecoveryKey' | 'Password' | 'Totp';
export type DfnsUserKind = 'EndUser' | 'Employee' | 'PatientUser' | 'CustomerEmployee';

// DFNS Organization
export interface DfnsOrganization {
  id: string;
  name: string;
  status: DfnsStatus;
  created_at: string;
  updated_at: string;
}

// DFNS Application
export interface DfnsApplication {
  id: string;
  app_id: string;
  name: string;
  description?: string;
  kind: 'ClientSide' | 'ServerSide';
  origin?: string;
  relying_party?: string;
  status: DfnsStatus;
  external_id?: string;
  logo_url?: string;
  terms_of_service_url?: string;
  privacy_policy_url?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// DFNS Signing Key
export interface DfnsSigningKey {
  id: string;
  key_id: string;
  public_key: string;
  network: string;
  curve: 'ed25519' | 'secp256k1' | 'secp256r1';
  scheme: 'EdDSA' | 'ECDSA';
  status: DfnsStatus;
  delegated: boolean;
  delegated_to?: string;
  external_id?: string;
  tags?: string[];
  imported: boolean;
  exported: boolean;
  date_exported?: string;
  organization_id?: string;
  dfns_key_id: string;
  created_at: string;
  updated_at: string;
}

// DFNS Policy
export interface DfnsPolicy {
  id: string;
  policy_id: string;
  name: string;
  description?: string;
  rule: Record<string, any>;
  activity_kind: string;
  status: DfnsStatus;
  external_id?: string;
  organization_id?: string;
  dfns_policy_id?: string;
  created_at: string;
  updated_at: string;
}

// DFNS Permission
export interface DfnsPermission {
  id: string;
  permission_id: string;
  name: string;
  resources: string[];
  operations: string[];
  effect: 'Allow' | 'Deny';
  condition?: Record<string, any>;
  status: DfnsStatus;
  description?: string;
  category?: string;
  organization_id?: string;
  dfns_permission_id?: string;
  created_at: string;
  updated_at: string;
}

// DFNS Webhook
export interface DfnsWebhook {
  id: string;
  webhook_id: string;
  name: string;
  url: string;
  description?: string;
  events: string[];
  status: DfnsStatus;
  secret?: string;
  headers?: Record<string, any>;
  external_id?: string;
  organization_id?: string;
  dfns_webhook_id?: string;
  created_at: string;
  updated_at: string;
}

// DFNS Service Account
export interface DfnsServiceAccount {
  id: string;
  name: string;
  status: DfnsStatus;
  external_id?: string;
  public_key?: string;
  permission_assignments?: Record<string, any>;
  organization_id?: string;
  dfns_service_account_id?: string;
  created_at: string;
  updated_at: string;
}

// Network Types - Comprehensive list matching DFNS SDK
export type DfnsNetwork = 
  | 'Ethereum' 
  | 'Polygon' 
  | 'Bitcoin' 
  | 'Arbitrum'
  | 'ArbitrumOne'  // DFNS SDK compatibility
  | 'Base'
  | 'Optimism'
  | 'Avalanche'
  | 'Solana'
  | 'Cosmos'
  | 'Near'
  | 'Binance'
  | 'BnbSmartChain' // Fix: Add missing network
  | 'Stellar'
  | 'Algorand'
  | 'Cardano'
  | 'Polkadot'
  | 'Kusama'
  | 'Osmosis'
  | 'Juno'
  | 'Stargaze'
  | 'Aptos'
  | 'Sui'
  | 'Tron'
  | 'XrpLedger'
  | 'Hedera'
  | 'Fantom' // Fix: Add missing network
  | 'Tezos' // Fix: Add missing network
  | 'Iota' // Fix: Add missing network
  | 'KeyECDSA'
  | 'KeyECDSAStark'
  | 'KeyEdDSA'
  // Testnet Networks
  | 'EthereumSepolia'
  | 'EthereumHolesky'
  | 'ArbitrumSepolia'
  | 'BaseSepolia'
  | 'BscTestnet'
  | 'OptimismSepolia'
  | 'PolygonAmoy'
  | 'AvalancheFuji'
  | 'SolanaDevnet'
  | 'StellarTestnet'
  | 'AlgorandTestnet'
  | 'CardanoTestnet'
  | 'TronTestnet'
  | 'XrpLedgerTestnet'
  | 'HederaTestnet'
  | 'Berachain'
  | 'BerachainBepolia'
  // Additional DFNS SDK Networks
  | 'AptosTestnet'
  | 'SuiTestnet'
  | 'TronShasta'
  | 'CosmosTestnet'
  | 'NearTestnet'
  | 'PolkadotTestnet'
  | 'KusamaTestnet'
  | 'Westend'
  | 'Rococo'
  | 'Moonbeam'
  | 'Moonriver'
  | 'Astar'
  | 'Shiden'
  | 'Acala'
  | 'Karura'
  | 'Parallel'
  | 'Basilisk'
  | 'Calamari'
  | 'Subsocial'
  | 'Zeitgeist'
  | 'Bifrost'
  | 'Centrifuge'
  | 'Composable'
  | 'Picasso'
  | 'HydraDX'
  | 'Interlay'
  | 'Kintsugi'
  | 'Litentry'
  | 'Manta'
  | 'Nodle'
  | 'Origintrail'
  | 'Pendulum'
  | 'Phala'
  | 'Robonomics'
  | 'Turing'
  | 'Unique'
  | 'Unknown'; // Fallback for unknown networks

// Network Name alias for backward compatibility
export type NetworkName = DfnsNetwork;

// Identity Kind for Permission Assignments
export type DfnsIdentityKind = 'User' | 'ServiceAccount' | 'PersonalAccessToken';

// Asset Types
export interface DfnsAsset {
  symbol: string;
  name?: string;
  contract_address?: string;
  decimals: number;
  verified: boolean;
  native_asset: boolean;
}

// Common DFNS Response Metadata
export interface DfnsMetadata {
  request_id?: string;
  correlation_id?: string;
  timestamp: string;
}

// DFNS API Response wrapper
export interface DfnsApiResponse<T> {
  data: T;
  metadata?: DfnsMetadata;
  errors?: DfnsError[];
}

// DFNS Error
export interface DfnsError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
