/**
 * Token Backend Service Types
 * 
 * Comprehensive type definitions for the token management system
 * supporting all 6 ERC standards with database schema alignment
 */

// Base Service imports
import { ServiceResult, PaginatedResponse, QueryOptions } from '../../types/index'

// Core Token Types
export interface Token {
  id: string
  project_id: string
  name: string
  symbol: string
  decimals: number
  standard: TokenStandard
  blocks: Record<string, any>
  metadata?: Record<string, any>
  status: TokenStatus
  reviewers?: string[]
  approvals?: string[]
  contract_preview?: string
  created_at: Date
  updated_at: Date
  total_supply?: string
  config_mode?: TokenConfigMode
  address?: string
  blockchain?: string
  deployment_status?: string
  deployment_timestamp?: Date
  deployment_transaction?: string
  deployment_error?: string
  deployed_by?: string
  deployment_environment?: string
  description?: string
}

// Token Standards Enum - Database uses hyphens
export enum TokenStandard {
  ERC_20 = 'ERC-20',
  ERC_721 = 'ERC-721',
  ERC_1155 = 'ERC-1155',
  ERC_1400 = 'ERC-1400',
  ERC_3525 = 'ERC-3525',
  ERC_4626 = 'ERC-4626'
}

// Token Status Enum - Database uses spaces
export enum TokenStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  READY_TO_MINT = 'READY TO MINT',
  MINTED = 'MINTED',
  DEPLOYED = 'DEPLOYED',
  PAUSED = 'PAUSED',
  DISTRIBUTED = 'DISTRIBUTED'
}

// Token Configuration Mode
export enum TokenConfigMode {
  MIN = 'min',
  BASIC = 'basic',
  ADVANCED = 'advanced',
  MAX = 'max'
}

// Token Creation Data
export interface TokenCreationData {
  name: string
  symbol: string
  decimals?: number
  standard: TokenStandard
  blocks: Record<string, any>
  metadata?: Record<string, any>
  projectId: string
  totalSupply?: string
  configMode?: TokenConfigMode
  description?: string
  // Standard-specific properties
  standardProperties?: Record<string, any>
}

// Token Update Data
export interface TokenUpdateData {
  name?: string
  symbol?: string
  description?: string
  blocks?: Record<string, any>
  metadata?: Record<string, any>
  status?: TokenStatus
  config_mode?: TokenConfigMode
  total_supply?: string
  reviewers?: string[]
  approvals?: string[]
  contract_preview?: string
}

// Token Deployment Types
export interface TokenDeployment {
  id: string
  token_id: string
  network: string
  deployed_by: string
  status: string
  contract_address: string
  transaction_hash: string
  deployed_at?: Date
  deployment_data?: Record<string, any>
  deployment_strategy?: string
}

export interface TokenDeploymentData {
  tokenId: string
  network: string
  deployerAddress?: string
  deploymentStrategy?: string
}

// Token Operations
export interface TokenOperation {
  id: string
  token_id: string
  operation_type: string
  operator: string
  status: string
  timestamp: Date
  blocks: Record<string, any>
}

export interface TokenOperationData {
  tokenId: string
  operationType: string
  executedBy: string
  parameters?: Record<string, any>
}

// Token Analytics Types
export interface TokenAnalytics {
  totalSupply: string
  holders: number
  transactions: number
  deployments: number
  lastActivity: string | null
}

export interface TokenStatistics {
  totalTokens: number
  tokensByStandard: Record<string, number>
  tokensByStatus: Record<string, number>
  tokensByConfigMode: Record<string, number>
  deploymentStatistics: {
    totalDeployments: number
    successfulDeployments: number
    failedDeployments: number
    deploymentsByNetwork: Record<string, number>
  }
}

// Service Result Types
export type TokenServiceResult<T> = ServiceResult<T>
export type TokenPaginatedResponse<T> = PaginatedResponse<T>
export type TokenQueryOptions = QueryOptions

// Export interfaces for external use
export interface TokenCreationRequest extends TokenCreationData {}
export interface TokenUpdateRequest extends TokenUpdateData {}
export interface TokenDeploymentRequest extends TokenDeploymentData {}
export interface TokenOperationRequest extends TokenOperationData {}
