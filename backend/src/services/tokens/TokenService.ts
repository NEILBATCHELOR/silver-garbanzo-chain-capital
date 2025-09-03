import { BaseService } from '../BaseService'
import { PrismaClient } from '@prisma/client'
import {
  Token,
  TokenStandard,
  TokenStatus,
  TokenConfigMode,
  TokenCreationData,
  TokenUpdateData,
  TokenDeploymentData,
  TokenOperationData,
  TokenAnalytics,
  TokenStatistics,
  TokenServiceResult,
  TokenPaginatedResponse,
  TokenQueryOptions
} from './types'

/**
 * Enhanced Token Service
 * 
 * Comprehensive token management service supporting all 6 ERC standards
 * with full CRUD operations, validation, analytics, and deployment management
 */
export class TokenService extends BaseService {
  constructor() {
    super('Token')
  }

  /**
   * Map API token standard to database enum
   */
  private mapTokenStandard(standard: string): TokenStandard {
    const mapping: Record<string, TokenStandard> = {
      'ERC-20': TokenStandard.ERC_20,
      'ERC-721': TokenStandard.ERC_721,
      'ERC-1155': TokenStandard.ERC_1155,
      'ERC-1400': TokenStandard.ERC_1400,
      'ERC-3525': TokenStandard.ERC_3525,
      'ERC-4626': TokenStandard.ERC_4626,
      'ERC_20': TokenStandard.ERC_20,
      'ERC_721': TokenStandard.ERC_721,
      'ERC_1155': TokenStandard.ERC_1155,
      'ERC_1400': TokenStandard.ERC_1400,
      'ERC_3525': TokenStandard.ERC_3525,
      'ERC_4626': TokenStandard.ERC_4626
    }
    return mapping[standard] || TokenStandard.ERC_20
  }

  /**
   * Get all tokens with comprehensive filtering and pagination
   */
  async getTokens(options: TokenQueryOptions = {}): Promise<TokenServiceResult<TokenPaginatedResponse<Token>>> {
    try {
      const searchFields = ['name', 'symbol', 'description']
      
      const result = await this.executePaginatedQuery<Token>(
        this.db.tokens,
        {
          ...options,
          searchFields,
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      )

      this.logInfo('Tokens retrieved successfully', { count: result.data.length })
      return this.success(result)
    } catch (error) {
      this.logError('Failed to retrieve tokens', { error })
      return this.error('Failed to retrieve tokens', 'DATABASE_ERROR')
    }
  }

  /**
   * Get tokens by project ID with comprehensive details
   */
  async getTokensByProject(projectId: string, options: TokenQueryOptions = {}): Promise<TokenServiceResult<TokenPaginatedResponse<Token>>> {
    const validation = this.validateRequiredFields({ projectId }, ['projectId'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid project ID', 'VALIDATION_ERROR', 400)
    }

    try {
      const searchFields = ['name', 'symbol', 'description']
      
      const result = await this.executePaginatedQuery<Token>(
        this.db.tokens,
        {
          ...options,
          searchFields,
          where: {
            ...options.where,
            project_id: projectId
          },
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            token_versions: {
              select: {
                version: true,
                created_at: true
              },
              orderBy: {
                version: 'desc'
              },
              take: 1
            },
            token_deployments: {
              select: {
                blockchain: true,
                network: true,
                contract_address: true,
                status: true,
                deployed_at: true
              },
              where: {
                status: 'completed'
              }
            }
          }
        }
      )

      this.logInfo('Project tokens retrieved successfully', { projectId, count: result.data.length })
      return this.success(result)
    } catch (error) {
      this.logError('Failed to retrieve project tokens', { error, projectId })
      return this.error('Failed to retrieve project tokens', 'DATABASE_ERROR')
    }
  }

  /**
   * Get comprehensive token details by ID
   */
  async getTokenById(id: string): Promise<TokenServiceResult<Token>> {
    const validation = this.validateRequiredFields({ id }, ['id'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid token ID', 'VALIDATION_ERROR', 400)
    }

    try {
      const token = await this.db.tokens.findUnique({
        where: { id },
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true
            }
          },
          token_versions: {
            orderBy: {
              version: 'desc'
            }
          },
          token_deployments: {
            orderBy: {
              deployed_at: 'desc'
            }
          },
          token_operations: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 10
          },
          token_allocations: true,
          // Standard-specific properties
          token_erc20_properties: true,
          token_erc721_properties: true,
          token_erc1155_properties: true,
          token_erc1400_properties: true,
          token_erc3525_properties: true,
          token_erc4626_properties: true
        }
      })

      if (!token) {
        return this.error('Token not found', 'NOT_FOUND', 404)
      }

      this.logInfo('Token retrieved successfully', { tokenId: id })
      return this.success(token as Token)
    } catch (error) {
      this.logError('Failed to retrieve token', { error, id })
      return this.error('Failed to retrieve token', 'DATABASE_ERROR')
    }
  }

  /**
   * Create comprehensive token with standard-specific properties
   */
  async createToken(data: TokenCreationData): Promise<TokenServiceResult<Token>> {
    const validation = this.validateRequiredFields(data, ['name', 'symbol', 'standard', 'projectId'])
    if (!validation.success) {
      return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
    }

    try {
      // Check for existing token with same symbol in project
      const existingToken = await this.db.tokens.findFirst({
        where: {
          symbol: data.symbol,
          project_id: data.projectId
        }
      })

      if (existingToken) {
        return this.error('Token with this symbol already exists in the project', 'CONFLICT', 409)
      }

      const result = await this.withTransaction(async (tx) => {
        // Create main token record
        const token = await tx.tokens.create({
          data: {
            name: data.name,
            symbol: data.symbol,
            standard: this.mapTokenStandard(data.standard) as any,
            decimals: data.decimals || 18,
            total_supply: data.totalSupply,
            description: data.description,
            project_id: data.projectId,
            metadata: data.metadata || {},
            blocks: data.blocks || {},
            status: TokenStatus.DRAFT as any,
            config_mode: data.configMode as any || TokenConfigMode.MIN as any,
            created_at: new Date(),
            updated_at: new Date()
          },
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        })

        // Create initial version record
        await tx.token_versions.create({
          data: {
            token_id: token.id,
            version: 1,
            data: token as any,
            blocks: data.blocks || {},
            decimals: data.decimals || 18,
            metadata: data.metadata || {},
            name: data.name,
            standard: this.mapTokenStandard(data.standard) as any,
            symbol: data.symbol,
            created_at: new Date()
          }
        })

        // Create standard-specific properties
        await this.createStandardProperties(tx, token.id, data.standard, data.standardProperties || {})

        return token
      })

      if (result.success && result.data) {
        this.logInfo('Token created successfully', { 
          tokenId: result.data.id, 
          name: data.name, 
          standard: data.standard 
        })
        return this.success(result.data as Token)
      }

      return this.error('Failed to create token', 'DATABASE_ERROR')
    } catch (error) {
      this.logError('Failed to create token', { error, data })
      return this.error('Failed to create token', 'DATABASE_ERROR')
    }
  }

  /**
   * Create standard-specific properties based on token standard
   */
  private async createStandardProperties(
    tx: PrismaClient, 
    tokenId: string, 
    standard: string,
    properties: Record<string, any>
  ): Promise<void> {
    try {
      const mappedStandard = this.mapTokenStandard(standard)
      
      switch (mappedStandard) {
        case TokenStandard.ERC_20:
          await tx.token_erc20_properties.create({
            data: {
              token_id: tokenId,
              initial_supply: properties.initialSupply || null,
              is_mintable: properties.isMintable || false,
              is_burnable: properties.isBurnable || false,
              is_pausable: properties.isPausable || false,
              cap: properties.cap || null,
              token_type: properties.tokenType || null
            }
          })
          break

        case TokenStandard.ERC_721:
          await tx.token_erc721_properties.create({
            data: {
              token_id: tokenId,
              base_uri: properties.baseUri || '',
              max_supply: properties.maxSupply || null,
              is_mintable: properties.isMintable || true,
              is_burnable: properties.isBurnable || false,
              is_pausable: properties.isPausable || false,
              has_royalty: properties.hasRoyalty || false,
              royalty_percentage: properties.royaltyPercentage || null,
              royalty_receiver: properties.royaltyReceiver || null
            }
          })
          break

        case TokenStandard.ERC_1155:
          await tx.token_erc1155_properties.create({
            data: {
              token_id: tokenId,
              base_uri: properties.baseUri || '',
              is_burnable: properties.isBurnable || false,
              is_pausable: properties.isPausable || false,
              has_royalty: properties.hasRoyalty || false,
              royalty_percentage: properties.royaltyPercentage || null,
              royalty_receiver: properties.royaltyReceiver || null,
              enable_approval_for_all: properties.enableApprovalForAll || true
            }
          })
          break

        case TokenStandard.ERC_1400:
          await tx.token_erc1400_properties.create({
            data: {
              token_id: tokenId,
              initial_supply: properties.initialSupply || null,
              is_issuable: properties.isIssuable || true,
              is_multi_class: properties.isMultiClass || false,
              enforce_kyc: properties.enforceKyc || true,
              transfer_restrictions: properties.transferRestrictions || false,
              forced_transfers_enabled: properties.forcedTransfersEnabled || false
            }
          })
          break

        case TokenStandard.ERC_3525:
          await tx.token_erc3525_properties.create({
            data: {
              token_id: tokenId,
              base_uri: properties.baseUri || '',
              value_decimals: properties.valueDecimals || 18,
              slot_type: properties.slotType || 'default',
              slot_approvals: properties.slotApprovals || false,
              value_approvals: properties.valueApprovals || false
            }
          })
          break

        case TokenStandard.ERC_4626:
          await tx.token_erc4626_properties.create({
            data: {
              token_id: tokenId,
              asset_address: properties.assetAddress || '',
              asset_name: properties.assetName || '',
              asset_symbol: properties.assetSymbol || '',
              asset_decimals: properties.assetDecimals || 18,
              vault_type: properties.vaultType || 'yield',
              pausable: properties.isPausable || false
            }
          })
          break

        default:
          this.logWarn('Unknown token standard for properties creation', { tokenId, standard })
      }
    } catch (error) {
      this.logError('Failed to create standard properties', { error, tokenId, standard })
      throw error
    }
  }

  /**
   * Update token with version history
   */
  async updateToken(id: string, data: TokenUpdateData): Promise<TokenServiceResult<Token>> {
    const validation = this.validateRequiredFields({ id }, ['id'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid token ID', 'VALIDATION_ERROR', 400)
    }

    try {
      const result = await this.withTransaction(async (tx) => {
        // Get current token for version history
        const currentToken = await tx.tokens.findUnique({
          where: { id },
          include: { token_versions: { orderBy: { version: 'desc' }, take: 1 } }
        })

        if (!currentToken) {
          throw new Error('Token not found')
        }

        // Update token
        const updatedToken = await tx.tokens.update({
          where: { id },
          data: {
            ...data,
            updated_at: new Date()
          },
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        })

        // Create new version record
        const latestVersion = currentToken.token_versions[0]?.version || 1
        await tx.token_versions.create({
          data: {
            token_id: id,
            version: latestVersion + 1,
            data: updatedToken as any,
            blocks: data.blocks || currentToken.blocks,
            decimals: currentToken.decimals,
            metadata: data.metadata || currentToken.metadata,
            name: data.name || currentToken.name,
            standard: currentToken.standard as any,
            symbol: data.symbol || currentToken.symbol,
            created_at: new Date()
          }
        })

        return updatedToken
      })

      if (result.success && result.data) {
        this.logInfo('Token updated successfully', { tokenId: id })
        return this.success(result.data as Token)
      }

      return this.error('Failed to update token', 'DATABASE_ERROR')
    } catch (error) {
      this.logError('Failed to update token', { error, id, data })
      return this.error('Failed to update token', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete token (soft delete with validation)
   */
  async deleteToken(id: string): Promise<TokenServiceResult<boolean>> {
    const validation = this.validateRequiredFields({ id }, ['id'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid token ID', 'VALIDATION_ERROR', 400)
    }

    try {
      // Check for active deployments
      const deployments = await this.db.token_deployments.findMany({
        where: { 
          token_id: id,
          status: 'completed'
        }
      })

      if (deployments.length > 0) {
        return this.error('Cannot delete token that has been deployed', 'CONFLICT', 409)
      }

      // Check for allocations
      const allocations = await this.db.token_allocations.findMany({
        where: { token_id: id }
      })

      if (allocations.length > 0) {
        return this.error('Cannot delete token that has allocations', 'CONFLICT', 409)
      }

      // Soft delete by updating status
      const result = await this.updateEntity<Token>(
        this.db.tokens,
        id,
        { status: TokenStatus.REJECTED as any }
      )

      if (result.success) {
        this.logInfo('Token deleted successfully', { tokenId: id })
        return this.success(true)
      }

      return this.error('Failed to delete token', 'DATABASE_ERROR')
    } catch (error) {
      this.logError('Failed to delete token', { error, id })
      return this.error('Failed to delete token', 'DATABASE_ERROR')
    }
  }

  /**
   * Get comprehensive token analytics
   */
  async getTokenAnalytics(tokenId: string): Promise<TokenServiceResult<TokenAnalytics>> {
    const validation = this.validateRequiredFields({ tokenId }, ['tokenId'])
    if (!validation.success) {
      return this.error(validation.error || 'Invalid token ID', 'VALIDATION_ERROR', 400)
    }

    try {
      const token = await this.db.tokens.findUnique({
        where: { id: tokenId },
        include: {
          token_deployments: true,
          token_operations: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          token_allocations: true
        }
      })

      if (!token) {
        return this.error('Token not found', 'NOT_FOUND', 404)
      }

      const analytics: TokenAnalytics = {
        totalSupply: token.total_supply || '0',
        holders: token.token_allocations?.length || 0,
        transactions: token.token_operations?.length || 0,
        deployments: token.token_deployments?.filter(d => d.status === 'completed').length || 0,
        lastActivity: token.token_operations?.[0]?.timestamp?.toISOString() || null
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get token analytics', { error, tokenId })
      return this.error('Failed to get token analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get comprehensive token statistics
   */
  async getTokenStatistics(): Promise<TokenServiceResult<TokenStatistics>> {
    try {
      const [
        totalTokens,
        tokensByStandard,
        tokensByStatus,
        tokensByConfigMode,
        deploymentStats
      ] = await Promise.all([
        this.db.tokens.count(),
        this.db.tokens.groupBy({
          by: ['standard'],
          _count: true
        }),
        this.db.tokens.groupBy({
          by: ['status'],
          _count: true
        }),
        this.db.tokens.groupBy({
          by: ['config_mode'],
          _count: true
        }),
        this.db.token_deployments.aggregate({
          _count: {
            id: true
          }
        })
      ])

      const statistics: TokenStatistics = {
        totalTokens,
        tokensByStandard: tokensByStandard.reduce((acc, item) => {
          acc[item.standard] = item._count
          return acc
        }, {} as Record<string, number>),
        tokensByStatus: tokensByStatus.reduce((acc, item) => {
          acc[item.status] = item._count
          return acc
        }, {} as Record<string, number>),
        tokensByConfigMode: tokensByConfigMode.reduce((acc, item) => {
          acc[item.config_mode || 'unknown'] = item._count
          return acc
        }, {} as Record<string, number>),
        deploymentStatistics: {
          totalDeployments: deploymentStats._count.id,
          successfulDeployments: 0, // Will be calculated separately
          failedDeployments: 0,     // Will be calculated separately
          deploymentsByNetwork: {}  // Will be calculated separately
        }
      }

      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get token statistics', { error })
      return this.error('Failed to get token statistics', 'DATABASE_ERROR')
    }
  }
}
