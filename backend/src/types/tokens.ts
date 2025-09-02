/**
 * Token Domain Types
 * Types specific to token creation, deployment, and operations
 */

/**
 * Token creation data structure
 */
export interface TokenCreationData {
  name: string
  symbol: string
  standard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626'
  totalSupply?: string
  decimals?: number
  description?: string
  projectId?: string
  metadata?: Record<string, any>
  blocks?: Record<string, any>
}

/**
 * Token deployment data structure
 */
export interface TokenDeploymentData {
  tokenId: string
  network: string  // Removed blockchain field to match database schema
  contractParams?: Record<string, any>
  deployerAddress?: string
}

/**
 * Token operation data structure
 */
export interface TokenOperationData {
  tokenId: string
  operationType: 'mint' | 'burn' | 'transfer' | 'approve' | 'pause' | 'unpause'
  parameters: Record<string, any>
  executedBy: string
}
