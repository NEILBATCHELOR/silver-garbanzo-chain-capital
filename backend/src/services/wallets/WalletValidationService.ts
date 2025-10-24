import { BaseService } from '../BaseService'
import { ServiceResult } from '../../types/index'
import { 
  WalletValidationResult, 
  WalletValidationError,
  CreateWalletRequest,
  BlockchainNetwork,
  WalletType,
  COIN_TYPES,
  SECURITY_CONFIG 
} from './types'
import * as bip39 from 'bip39'

export class WalletValidationService extends BaseService {

  constructor() {
    super('WalletValidation')
  }

  /**
   * Validate wallet data (general validation method for tests/compatibility)
   */
  async validateWalletData(walletData: any): Promise<WalletValidationResult> {
    const errors: WalletValidationError[] = []
    const warnings: string[] = []

    try {
      // General wallet data validation
      if (!walletData) {
        errors.push({
          field: 'walletData',
          message: 'Wallet data is required',
          code: 'REQUIRED_FIELD'
        })
        return { isValid: false, errors, warnings }
      }

      // Validate common fields
      if (walletData.investor_id && !this.isValidUUID(walletData.investor_id)) {
        errors.push({
          field: 'investor_id',
          message: 'Invalid investor ID format',
          code: 'INVALID_FORMAT'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      this.logError('Wallet data validation failed', { error, walletData })
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR'
        }],
        warnings
      }
    }
  }

  /**
   * Validate wallet creation request
   */
  async validateCreateWalletRequest(request: CreateWalletRequest): Promise<WalletValidationResult> {
    const errors: WalletValidationError[] = []
    const warnings: string[] = []

    try {
      // Validate investor_id
      if (!request.investor_id) {
        errors.push({
          field: 'investor_id',
          message: 'Investor ID is required',
          code: 'REQUIRED_FIELD'
        })
      } else if (!this.isValidUUID(request.investor_id)) {
        errors.push({
          field: 'investor_id',
          message: 'Investor ID must be a valid UUID',
          code: 'INVALID_FORMAT'
        })
      }

      // Validate chain_id
      if (!request.chain_id) {
        errors.push({
          field: 'chain_id',
          message: 'Chain ID is required',
          code: 'REQUIRED_FIELD'
        })
      }

      // Validate name (optional)
      if (request.name && request.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Wallet name must be 100 characters or less',
          code: 'INVALID_LENGTH'
        })
      }

      // Check if investor exists (business rule validation)
      if (request.investor_id && this.isValidUUID(request.investor_id)) {
        const investorExists = await this.checkInvestorExists(request.investor_id)
        if (!investorExists) {
          errors.push({
            field: 'investor_id',
            message: 'Investor not found',
            code: 'NOT_FOUND'
          })
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      this.logError('Validation failed', { error, request })
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR'
        }],
        warnings
      }
    }
  }

  /**
   * Validate mnemonic phrase
   */
  async validateMnemonic(mnemonic: string): Promise<WalletValidationResult> {
    const errors: WalletValidationError[] = []
    const warnings: string[] = []

    try {
      if (!mnemonic) {
        errors.push({
          field: 'mnemonic',
          message: 'Mnemonic phrase is required',
          code: 'REQUIRED_FIELD'
        })
        return { isValid: false, errors, warnings }
      }

      // Validate format
      const words = mnemonic.trim().split(/\s+/)
      
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        errors.push({
          field: 'mnemonic',
          message: 'Mnemonic must be 12, 15, 18, 21, or 24 words',
          code: 'INVALID_LENGTH'
        })
      }

      // Validate using BIP39
      const isValid = bip39.validateMnemonic(mnemonic)
      if (!isValid) {
        errors.push({
          field: 'mnemonic',
          message: 'Invalid mnemonic phrase',
          code: 'INVALID_MNEMONIC'
        })
      }

      // Security warnings
      if (words.length < 12) {
        warnings.push('Mnemonic with less than 12 words has low entropy and may be insecure')
      }

      // Check for common weak patterns
      if (this.hasWeakMnemonicPattern(words)) {
        warnings.push('Mnemonic may contain weak patterns')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      this.logError('Mnemonic validation failed', { error })
      return {
        isValid: false,
        errors: [{
          field: 'mnemonic',
          message: 'Mnemonic validation failed',
          code: 'VALIDATION_ERROR'
        }],
        warnings
      }
    }
  }

  /**
   * Validate blockchain address format
   */
  async validateAddress(address: string, blockchain: BlockchainNetwork): Promise<WalletValidationResult> {
    const errors: WalletValidationError[] = []
    const warnings: string[] = []

    try {
      if (!address) {
        errors.push({
          field: 'address',
          message: 'Address is required',
          code: 'REQUIRED_FIELD'
        })
        return { isValid: false, errors, warnings }
      }

      const isValid = this.validateAddressFormat(address, blockchain)
      if (!isValid) {
        errors.push({
          field: 'address',
          message: `Invalid ${blockchain} address format`,
          code: 'INVALID_FORMAT'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      this.logError('Address validation failed', { error, address, blockchain })
      return {
        isValid: false,
        errors: [{
          field: 'address',
          message: 'Address validation failed',
          code: 'VALIDATION_ERROR'
        }],
        warnings
      }
    }
  }

  /**
   * Validate wallet update data
   */
  async validateWalletUpdate(updates: any): Promise<WalletValidationResult> {
    const errors: WalletValidationError[] = []
    const warnings: string[] = []

    try {
      // Validate status if provided
      if (updates.status && !this.isValidWalletStatus(updates.status)) {
        errors.push({
          field: 'status',
          message: 'Invalid wallet status',
          code: 'INVALID_VALUE'
        })
      }

      // Validate guardian_policy if provided
      if (updates.guardian_policy && typeof updates.guardian_policy !== 'object') {
        errors.push({
          field: 'guardian_policy',
          message: 'Guardian policy must be an object',
          code: 'INVALID_TYPE'
        })
      }

      // Validate signatories if provided
      if (updates.signatories && !Array.isArray(updates.signatories)) {
        errors.push({
          field: 'signatories',
          message: 'Signatories must be an array',
          code: 'INVALID_TYPE'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      this.logError('Wallet update validation failed', { error, updates })
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        }],
        warnings
      }
    }
  }

  /**
   * Private helper methods
   */

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  private isValidWalletType(walletType: string): boolean {
    const validTypes: WalletType[] = ['hd_wallet', 'multi_sig', 'custodial', 'external']
    return validTypes.includes(walletType as WalletType)
  }

  private isValidBlockchain(blockchain: string): boolean {
    return Object.keys(COIN_TYPES).includes(blockchain)
  }

  private isValidWalletStatus(status: string): boolean {
    const validStatuses = ['active', 'pending', 'suspended', 'archived']
    return validStatuses.includes(status)
  }

  private async checkInvestorExists(investorId: string): Promise<boolean> {
    try {
      const investor = await this.db.investors.findUnique({
        where: { investor_id: investorId },
        select: { investor_id: true }
      })
      return investor !== null
    } catch (error) {
      this.logError('Failed to check investor existence', { error, investorId })
      return false
    }
  }

  private hasWeakMnemonicPattern(words: string[]): boolean {
    // Check for repeated words
    const uniqueWords = new Set(words)
    if (uniqueWords.size < words.length * 0.8) {
      return true
    }

    // Check for sequential patterns (simplified)
    const wordlist = bip39.wordlists.english
    if (!wordlist) {
      return false
    }
    const indices = words.map(word => wordlist.indexOf(word)).filter(i => i !== -1)
    
    if (indices && indices.length > 2) {
      let sequentialCount = 0
      for (let i = 1; i < indices.length; i++) {
        const current = indices[i];
        const previous = indices[i-1];
        if (current !== undefined && previous !== undefined && current === previous + 1) {
          sequentialCount++
        }
      }
      if (sequentialCount > 3) {
        return true
      }
    }

    return false
  }

  private validateAddressFormat(address: string, blockchain: BlockchainNetwork): boolean {
    switch (blockchain) {
      case 'bitcoin':
        // Bitcoin addresses start with 1, 3, or bc1
        return /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/.test(address)
      
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'avalanche':
        // Ethereum-style addresses
        return /^0x[a-fA-F0-9]{40}$/.test(address)
      
      case 'solana':
        // Solana addresses are base58 encoded, 32-44 characters
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
      
      case 'near':
        // NEAR addresses end with .near or are implicit (64 char hex)
        return /^[a-z0-9-_.]+\.near$/.test(address) || /^[a-f0-9]{64}$/.test(address)
      
      default:
        return false
    }
  }

  /**
   * Business rule validations
   */

  /**
   * Check if investor can create additional wallets
   */
  async canCreateWallet(investorId: string): Promise<ServiceResult<boolean>> {
    try {
      const walletCount = await this.db.wallets.count({
        where: { 
          investor_id: investorId,
          status: { not: 'archived' }
        }
      })

      // Business rule: max 10 wallets per investor
      const maxWallets = 10
      if (walletCount >= maxWallets) {
        return this.error(`Investor has reached maximum wallet limit (${maxWallets})`, 'WALLET_LIMIT_EXCEEDED', 400)
      }

      return this.success(true)

    } catch (error) {
      this.logError('Failed to check wallet creation eligibility', { error, investorId })
      return this.error('Failed to validate wallet creation eligibility', 'VALIDATION_ERROR')
    }
  }

  /**
   * Check if blockchain is supported for investor's jurisdiction
   */
  async isSupportedForJurisdiction(blockchain: BlockchainNetwork, investorId: string): Promise<ServiceResult<boolean>> {
    try {
      const investor = await this.db.investors.findUnique({
        where: { investor_id: investorId },
        select: { tax_residency: true }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Business rules for blockchain support by jurisdiction
      const restrictedJurisdictions: Record<string, BlockchainNetwork[]> = {
        'US': [], // Example: no restrictions for US
        'CN': ['bitcoin'], // Example: Bitcoin restricted in China
        // Add more jurisdiction rules as needed
      }

      const jurisdiction = investor.tax_residency
      const restrictions = restrictedJurisdictions[jurisdiction || ''] || []
      
      if (restrictions.includes(blockchain)) {
        return this.error(`${blockchain} not supported for jurisdiction: ${jurisdiction}`, 'JURISDICTION_RESTRICTED', 403)
      }

      return this.success(true)

    } catch (error) {
      this.logError('Failed to check jurisdiction support', { error, blockchain, investorId })
      return this.error('Failed to validate jurisdiction support', 'VALIDATION_ERROR')
    }
  }
}
