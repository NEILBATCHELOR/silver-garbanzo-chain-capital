import { BaseService } from '../BaseService'
import {
  Token,
  TokenStandard,
  TokenStatus,
  TokenConfigMode,
  TokenCreationData,
  TokenUpdateData,
  TokenServiceResult
} from './types'

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean
  error?: string
  errors?: string[]
  warnings?: string[]
}

/**
 * Token Validation Service
 * 
 * Comprehensive validation service for token data, business rules,
 * and standard-specific requirements across all 6 ERC standards
 */
export class TokenValidationService extends BaseService {
  constructor() {
    super('TokenValidation')
  }

  /**
   * Validate token creation data
   */
  async validateTokenCreation(data: TokenCreationData): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic field validation
      const basicValidation = this.validateBasicFields(data)
      if (!basicValidation.success) {
        errors.push(...(basicValidation.errors || []))
      }

      // Token name validation
      const nameValidation = this.validateTokenName(data.name)
      if (!nameValidation.success) {
        errors.push(nameValidation.error || 'Invalid token name')
      }

      // Token symbol validation
      const symbolValidation = this.validateTokenSymbol(data.symbol)
      if (!symbolValidation.success) {
        errors.push(symbolValidation.error || 'Invalid token symbol')
      }

      // Decimals validation
      const decimalsValidation = this.validateDecimals(data.decimals, data.standard)
      if (!decimalsValidation.success) {
        errors.push(decimalsValidation.error || 'Invalid decimals')
      }

      // Standard-specific validation
      const standardValidation = await this.validateStandardSpecific(data)
      if (!standardValidation.success) {
        errors.push(...(standardValidation.errors || []))
      }
      if (standardValidation.warnings) {
        warnings.push(...standardValidation.warnings)
      }

      // Project validation
      const projectValidation = await this.validateProjectAssociation(data.projectId)
      if (!projectValidation.success) {
        errors.push(projectValidation.error || 'Invalid project association')
      }

      // Symbol uniqueness validation
      const uniquenessValidation = await this.validateSymbolUniqueness(data.symbol, data.projectId)
      if (!uniquenessValidation.success) {
        errors.push(uniquenessValidation.error || 'Symbol not unique')
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
    } catch (error) {
      this.logError('Error during token creation validation', { error })
      return { success: false, error: 'Validation failed due to internal error' }
    }
  }

  /**
   * Validate token update data
   */
  async validateTokenUpdate(tokenId: string, data: TokenUpdateData): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get existing token
      const existingToken = await this.db.tokens.findUnique({
        where: { id: tokenId },
        include: { token_deployments: true }
      })

      if (!existingToken) {
        return { success: false, error: 'Token not found' }
      }

      // Validate update restrictions for deployed tokens
      const deploymentValidation = this.validateUpdateRestrictionsForDeployedToken(existingToken, data)
      if (!deploymentValidation.success) {
        errors.push(...(deploymentValidation.errors || []))
      }

      // Validate status transitions
      if (data.status) {
        const statusValidation = this.validateStatusTransition(existingToken.status as TokenStatus, data.status)
        if (!statusValidation.success) {
          errors.push(statusValidation.error || 'Invalid status transition')
        }
      }

      // Validate updated fields
      if (data.name) {
        const nameValidation = this.validateTokenName(data.name)
        if (!nameValidation.success) {
          errors.push(nameValidation.error || 'Invalid token name')
        }
      }

      if (data.symbol) {
        const symbolValidation = this.validateTokenSymbol(data.symbol)
        if (!symbolValidation.success) {
          errors.push(symbolValidation.error || 'Invalid token symbol')
        }

        // Check symbol uniqueness if symbol is being changed
        if (data.symbol !== existingToken.symbol) {
          const uniquenessValidation = await this.validateSymbolUniqueness(data.symbol, existingToken.project_id)
          if (!uniquenessValidation.success) {
            errors.push(uniquenessValidation.error || 'Symbol not unique')
          }
        }
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
    } catch (error) {
      this.logError('Error during token update validation', { error, tokenId })
      return { success: false, error: 'Validation failed due to internal error' }
    }
  }

  /**
   * Validate basic required fields
   */
  private validateBasicFields(data: TokenCreationData): ValidationResult {
    const requiredFields = ['name', 'symbol', 'standard', 'projectId']
    const missingFields = requiredFields.filter(field => !data[field as keyof TokenCreationData])

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }
    }

    return { success: true }
  }

  /**
   * Validate token name
   */
  private validateTokenName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Token name is required and must be a string' }
    }

    if (name.length < 2) {
      return { success: false, error: 'Token name must be at least 2 characters long' }
    }

    if (name.length > 100) {
      return { success: false, error: 'Token name must be no more than 100 characters long' }
    }

    // Check for valid characters (alphanumeric, spaces, and common punctuation)
    const validNamePattern = /^[a-zA-Z0-9\s\-_.()&]+$/
    if (!validNamePattern.test(name)) {
      return { success: false, error: 'Token name contains invalid characters' }
    }

    return { success: true }
  }

  /**
   * Validate token symbol
   */
  private validateTokenSymbol(symbol: string): ValidationResult {
    if (!symbol || typeof symbol !== 'string') {
      return { success: false, error: 'Token symbol is required and must be a string' }
    }

    if (symbol.length < 2) {
      return { success: false, error: 'Token symbol must be at least 2 characters long' }
    }

    if (symbol.length > 10) {
      return { success: false, error: 'Token symbol must be no more than 10 characters long' }
    }

    // Check for valid characters (alphanumeric only, typically uppercase)
    const validSymbolPattern = /^[A-Z0-9]+$/
    if (!validSymbolPattern.test(symbol.toUpperCase())) {
      return { success: false, error: 'Token symbol must contain only alphanumeric characters' }
    }

    return { success: true }
  }

  /**
   * Validate decimals based on token standard
   */
  private validateDecimals(decimals: number | undefined, standard: TokenStandard): ValidationResult {
    const defaultDecimals = decimals ?? 18

    if (typeof defaultDecimals !== 'number' || defaultDecimals < 0 || defaultDecimals > 18) {
      return { success: false, error: 'Decimals must be a number between 0 and 18' }
    }

    // Standard-specific decimal validation
    switch (standard) {
      case TokenStandard.ERC_721:
        if (defaultDecimals !== 0) {
          return { success: false, error: 'ERC-721 tokens must have 0 decimals' }
        }
        break

      case TokenStandard.ERC_1155:
        if (defaultDecimals !== 0) {
          return { success: false, error: 'ERC-1155 tokens must have 0 decimals' }
        }
        break

      default:
        // ERC-20, ERC-1400, ERC-3525, ERC-4626 can have flexible decimals
        break
    }

    return { success: true }
  }

  /**
   * Validate standard-specific requirements
   */
  private async validateStandardSpecific(data: TokenCreationData): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      switch (data.standard) {
        case TokenStandard.ERC_20:
          const erc20Validation = this.validateERC20Specific(data)
          if (!erc20Validation.success) {
            errors.push(...(erc20Validation.errors || []))
          }
          break

        case TokenStandard.ERC_721:
          const erc721Validation = this.validateERC721Specific(data)
          if (!erc721Validation.success) {
            errors.push(...(erc721Validation.errors || []))
          }
          break

        case TokenStandard.ERC_1155:
          const erc1155Validation = this.validateERC1155Specific(data)
          if (!erc1155Validation.success) {
            errors.push(...(erc1155Validation.errors || []))
          }
          break

        case TokenStandard.ERC_1400:
          const erc1400Validation = this.validateERC1400Specific(data)
          if (!erc1400Validation.success) {
            errors.push(...(erc1400Validation.errors || []))
          }
          break

        case TokenStandard.ERC_3525:
          const erc3525Validation = this.validateERC3525Specific(data)
          if (!erc3525Validation.success) {
            errors.push(...(erc3525Validation.errors || []))
          }
          break

        case TokenStandard.ERC_4626:
          const erc4626Validation = this.validateERC4626Specific(data)
          if (!erc4626Validation.success) {
            errors.push(...(erc4626Validation.errors || []))
          }
          break

        default:
          errors.push(`Unsupported token standard: ${data.standard}`)
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
    } catch (error) {
      this.logError('Error during standard-specific validation', { error, standard: data.standard })
      return { success: false, error: 'Standard validation failed' }
    }
  }

  /**
   * Validate ERC-20 specific requirements
   */
  private validateERC20Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate total supply for non-mintable tokens
    if (!properties.isMintable && !data.totalSupply) {
      errors.push('Total supply is required for non-mintable ERC-20 tokens')
    }

    // Validate cap if provided
    if (properties.cap) {
      const cap = parseFloat(properties.cap)
      const totalSupply = parseFloat(data.totalSupply || '0')
      
      if (isNaN(cap) || cap <= 0) {
        errors.push('Cap must be a positive number')
      } else if (totalSupply > cap) {
        errors.push('Total supply cannot exceed cap')
      }
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate ERC-721 specific requirements
   */
  private validateERC721Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate base URI
    if (!properties.baseUri) {
      errors.push('Base URI is required for ERC-721 tokens')
    }

    // Validate max supply if provided
    if (properties.maxSupply) {
      const maxSupply = parseInt(properties.maxSupply)
      if (isNaN(maxSupply) || maxSupply <= 0) {
        errors.push('Max supply must be a positive integer')
      }
    }

    // Validate royalty settings
    if (properties.hasRoyalty) {
      if (!properties.royaltyPercentage || !properties.royaltyReceiver) {
        errors.push('Royalty percentage and receiver address are required when royalty is enabled')
      } else {
        const royaltyPercentage = parseFloat(properties.royaltyPercentage)
        if (isNaN(royaltyPercentage) || royaltyPercentage < 0 || royaltyPercentage > 10) {
          errors.push('Royalty percentage must be between 0 and 10')
        }
      }
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate ERC-1155 specific requirements
   */
  private validateERC1155Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate base URI
    if (!properties.baseUri) {
      errors.push('Base URI is required for ERC-1155 tokens')
    }

    // Validate royalty settings
    if (properties.hasRoyalty) {
      if (!properties.royaltyPercentage || !properties.royaltyReceiver) {
        errors.push('Royalty percentage and receiver address are required when royalty is enabled')
      }
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate ERC-1400 specific requirements
   */
  private validateERC1400Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate initial supply
    if (!properties.initialSupply) {
      errors.push('Initial supply is required for ERC-1400 tokens')
    }

    // Security tokens typically require KYC
    if (properties.enforceKyc === false) {
      // This is a warning rather than an error
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate ERC-3525 specific requirements
   */
  private validateERC3525Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate base URI
    if (!properties.baseUri) {
      errors.push('Base URI is required for ERC-3525 tokens')
    }

    // Validate value decimals
    if (properties.valueDecimals !== undefined) {
      const valueDecimals = properties.valueDecimals
      if (typeof valueDecimals !== 'number' || valueDecimals < 0 || valueDecimals > 18) {
        errors.push('Value decimals must be between 0 and 18')
      }
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate ERC-4626 specific requirements
   */
  private validateERC4626Specific(data: TokenCreationData): ValidationResult {
    const errors: string[] = []
    const properties = data.standardProperties || {}

    // Validate asset address
    if (!properties.assetAddress) {
      errors.push('Asset address is required for ERC-4626 tokens')
    }

    // Validate asset decimals
    if (properties.assetDecimals !== undefined) {
      const assetDecimals = properties.assetDecimals
      if (typeof assetDecimals !== 'number' || assetDecimals < 0 || assetDecimals > 18) {
        errors.push('Asset decimals must be between 0 and 18')
      }
    }

    return { success: errors.length === 0, errors }
  }

  /**
   * Validate project association
   */
  private async validateProjectAssociation(projectId: string): Promise<ValidationResult> {
    try {
      const project = await this.db.projects.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      if (project.status === 'REJECTED' || project.status === 'ARCHIVED') {
        return { success: false, error: 'Cannot create token for inactive project' }
      }

      return { success: true }
    } catch (error) {
      this.logError('Error validating project association', { error, projectId })
      return { success: false, error: 'Failed to validate project association' }
    }
  }

  /**
   * Validate symbol uniqueness within project
   */
  private async validateSymbolUniqueness(symbol: string, projectId: string): Promise<ValidationResult> {
    try {
      const existingToken = await this.db.tokens.findFirst({
        where: {
          symbol: symbol.toUpperCase(),
          project_id: projectId,
          status: { not: TokenStatus.REJECTED }
        }
      })

      if (existingToken) {
        return { success: false, error: 'A token with this symbol already exists in the project' }
      }

      return { success: true }
    } catch (error) {
      this.logError('Error validating symbol uniqueness', { error, symbol, projectId })
      return { success: false, error: 'Failed to validate symbol uniqueness' }
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: TokenStatus, newStatus: TokenStatus): ValidationResult {
    const allowedTransitions: Record<TokenStatus, TokenStatus[]> = {
      [TokenStatus.DRAFT]: [TokenStatus.UNDER_REVIEW, TokenStatus.REJECTED],
      [TokenStatus.UNDER_REVIEW]: [TokenStatus.APPROVED, TokenStatus.REJECTED, TokenStatus.DRAFT],
      [TokenStatus.APPROVED]: [TokenStatus.READY_TO_MINT, TokenStatus.DEPLOYED, TokenStatus.REJECTED],
      [TokenStatus.READY_TO_MINT]: [TokenStatus.DEPLOYED, TokenStatus.REJECTED],
      [TokenStatus.DEPLOYED]: [TokenStatus.REJECTED],
      [TokenStatus.REJECTED]: [TokenStatus.DRAFT]
    }

    const allowed = allowedTransitions[currentStatus] || []
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}`
      }
    }

    return { success: true }
  }

  /**
   * Validate update restrictions for deployed tokens
   */
  private validateUpdateRestrictionsForDeployedToken(token: any, updateData: TokenUpdateData): ValidationResult {
    const errors: string[] = []

    // Check if token has active deployments
    const hasActiveDeployments = token.token_deployments?.some((d: any) => d.status === 'completed')

    if (hasActiveDeployments) {
      // Restrict certain field updates for deployed tokens
      if (updateData.symbol && updateData.symbol !== token.symbol) {
        errors.push('Cannot change symbol of deployed token')
      }

      if (updateData.blocks && JSON.stringify(updateData.blocks) !== JSON.stringify(token.blocks)) {
        errors.push('Cannot change core configuration of deployed token')
      }
    }

    return { success: errors.length === 0, errors }
  }
}
