import { BaseService } from '../BaseService'
import { 
  Invoice, 
  Provider, 
  Payer, 
  Pool,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreatePoolRequest,
  UpdatePoolRequest,
  CreateProviderRequest,
  UpdateProviderRequest,
  CreatePayerRequest,
  UpdatePayerRequest,
  InvoiceWithRelations,
  PoolWithInvoices,
  FactoringServiceResult,
  FactoringPaginatedResponse,
  FactoringQueryOptions,
  decimalToNumber,
  transformPoolType,
  TokenizationRequest,
  TokenAllocation,
  TokenDistribution,
  CreateTokenAllocationRequest,
  DistributeTokensRequest,
  PoolTokenizationData
} from './types'
import { QueryOptions } from '@/types/index'

/**
 * Main factoring service handling healthcare invoice factoring operations
 */
export class FactoringService extends BaseService {
  constructor() {
    super('Factoring')
  }

  // ==================== INVOICE OPERATIONS ====================

  /**
   * Create a new healthcare invoice
   */
  async createInvoice(data: CreateInvoiceRequest): Promise<FactoringServiceResult<Invoice>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, [
        'patient_name', 'patient_dob', 'service_dates', 'procedure_codes',
        'diagnosis_codes', 'billed_amount', 'net_amount_due', 'policy_number',
        'invoice_number', 'invoice_date', 'due_date'
      ])

      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Create invoice with auto-generated ID
      const invoice = await this.db.invoice.create({
        data: {
          ...data,
          upload_timestamp: new Date(),
          // Handle optional numeric fields
          adjustments: data.adjustments || 0,
          factoring_discount_rate: data.factoring_discount_rate || 0
        }
      })

      await this.logActivity('INVOICE_CREATE', 'invoice', String(invoice.invoice_id))
      
      // Convert Prisma result to Invoice type
      const invoiceResult: Invoice = {
        ...invoice,
        billed_amount: invoice.billed_amount,
        adjustments: invoice.adjustments,
        net_amount_due: invoice.net_amount_due,
        factoring_discount_rate: invoice.factoring_discount_rate
      }
      
      return this.success(invoiceResult)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create invoice')
      return this.error('Failed to create invoice', 'CREATE_ERROR')
    }
  }

  /**
   * Get invoice by ID with relations
   */
  async getInvoice(invoiceId: number): Promise<FactoringServiceResult<InvoiceWithRelations>> {
    try {
      const invoice = await this.db.invoice.findUnique({
        where: { invoice_id: invoiceId },
        include: {
          provider: true,
          payer: true,
          pool: true
        }
      })

      if (!invoice) {
        return this.error('Invoice not found', 'NOT_FOUND', 404)
      }

      // Convert Prisma result to InvoiceWithRelations type
      const result: InvoiceWithRelations = {
        ...invoice,
        billed_amount: invoice.billed_amount,
        adjustments: invoice.adjustments,
        net_amount_due: invoice.net_amount_due,
        factoring_discount_rate: invoice.factoring_discount_rate,
        provider: invoice.provider || null,
        payer: invoice.payer || null,
        pool: invoice.pool ? {
          ...invoice.pool,
          pool_type: transformPoolType(invoice.pool.pool_type)
        } : null
      }

      return this.success(result)

    } catch (error) {
      this.logger.error({ error, invoiceId }, 'Failed to get invoice')
      return this.error('Failed to get invoice', 'FETCH_ERROR')
    }
  }

  /**
   * Get paginated list of invoices with filtering
   */
  async getInvoices(options: FactoringQueryOptions = {}): Promise<FactoringPaginatedResponse<InvoiceWithRelations>> {
    try {
      const { skip, take, where, orderBy } = this.parseQueryOptions(options)

      // Build enhanced where clause for factoring-specific filtering
      const factoringWhere: any = { ...where }

      // Add pool filtering
      if (options.filters?.poolId) {
        factoringWhere.pool_id = Number(options.filters.poolId)
      }

      // Add provider filtering
      if (options.filters?.providerId) {
        factoringWhere.provider_id = Number(options.filters.providerId)
      }

      // Add payer filtering
      if (options.filters?.payerId) {
        factoringWhere.payer_id = Number(options.filters.payerId)
      }

      // Add amount range filtering
      if (options.filters?.minAmount) {
        factoringWhere.net_amount_due = { 
          ...factoringWhere.net_amount_due,
          gte: Number(options.filters.minAmount) 
        }
      }
      if (options.filters?.maxAmount) {
        factoringWhere.net_amount_due = { 
          ...factoringWhere.net_amount_due,
          lte: Number(options.filters.maxAmount) 
        }
      }

      const [invoices, total] = await Promise.all([
        this.db.invoice.findMany({
          skip,
          take,
          where: factoringWhere,
          orderBy: orderBy || { upload_timestamp: 'desc' },
          include: {
            provider: true,
            payer: true,
            pool: true
          }
        }),
        this.db.invoice.count({ where: factoringWhere })
      ])

      // Convert Prisma results to InvoiceWithRelations type
      const convertedInvoices: InvoiceWithRelations[] = invoices.map(invoice => ({
        ...invoice,
        billed_amount: invoice.billed_amount,
        adjustments: invoice.adjustments,
        net_amount_due: invoice.net_amount_due,
        factoring_discount_rate: invoice.factoring_discount_rate,
        provider: invoice.provider || null,
        payer: invoice.payer || null,
        pool: invoice.pool ? {
          ...invoice.pool,
          pool_type: transformPoolType(invoice.pool.pool_type)
        } : null
      }))

      const page = Math.floor(skip / take) + 1
      return this.success(this.paginatedResponse(convertedInvoices, total, page, take))

    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get invoices')
      const limit = options.limit || 20
      return this.error('Failed to fetch invoices', 'FETCH_ERROR', 500)
    }
  }

  /**
   * Update an invoice
   */
  async updateInvoice(invoiceId: number, data: UpdateInvoiceRequest): Promise<FactoringServiceResult<Invoice>> {
    try {
      const invoice = await this.db.invoice.update({
        where: { invoice_id: invoiceId },
        data: {
          ...data,
          // Always update timestamp on modification
          upload_timestamp: new Date()
        }
      })

      await this.logActivity('INVOICE_UPDATE', 'invoice', String(invoiceId), data)
      
      // Convert Prisma result to Invoice type
      const invoiceResult: Invoice = {
        ...invoice,
        billed_amount: invoice.billed_amount,
        adjustments: invoice.adjustments,
        net_amount_due: invoice.net_amount_due,
        factoring_discount_rate: invoice.factoring_discount_rate
      }
      
      return this.success(invoiceResult)

    } catch (error) {
      this.logger.error({ error, invoiceId, data }, 'Failed to update invoice')
      
      if ((error as any).code === 'P2025') {
        return this.error('Invoice not found', 'NOT_FOUND', 404)
      }
      
      return this.error('Failed to update invoice', 'UPDATE_ERROR')
    }
  }

  // ==================== POOL OPERATIONS ====================

  /**
   * Create a new pool
   */
  async createPool(data: CreatePoolRequest): Promise<FactoringServiceResult<Pool>> {
    try {
      const validation = this.validateRequiredFields(data, ['pool_name', 'pool_type'])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      const pool = await this.db.pool.create({
        data: {
          pool_name: data.pool_name,
          pool_type: data.pool_type as any, // Cast to match database enum
          creation_timestamp: new Date()
        }
      })

      await this.logActivity('POOL_CREATE', 'pool', String(pool.pool_id))
      
      // Convert Prisma result to Pool type
      const poolResult: Pool = {
        ...pool,
        pool_type: data.pool_type
      }
      
      return this.success(poolResult)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create pool')
      return this.error('Failed to create pool', 'CREATE_ERROR')
    }
  }

  /**
   * Get pool with invoices and statistics
   */
  async getPoolWithInvoices(poolId: number): Promise<FactoringServiceResult<PoolWithInvoices>> {
    try {
      const pool = await this.db.pool.findUnique({
        where: { pool_id: poolId },
        include: {
          invoice: {
            include: {
              provider: true,
              payer: true
            }
          }
        }
      })

      if (!pool) {
        return this.error('Pool not found', 'NOT_FOUND', 404)
      }

      // Calculate pool statistics
      const invoices = pool.invoice || []
      const total_value = invoices.reduce((sum, inv) => sum + decimalToNumber(inv.net_amount_due), 0)
      const invoice_count = invoices.length
      
      // Calculate average age in days
      const totalAge = invoices.reduce((sum, inv) => {
        if (!inv.invoice_date || !inv.due_date) return sum
        const invoiceDate = new Date(inv.invoice_date)
        const dueDate = new Date(inv.due_date)
        const ageInDays = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (ageInDays > 0 ? ageInDays : 0)
      }, 0)
      const average_age = invoice_count > 0 ? Math.round(totalAge / invoice_count) : 0

      // Convert invoices to proper type
      const convertedInvoices: Invoice[] = invoices.map(invoice => ({
        ...invoice,
        billed_amount: invoice.billed_amount,
        adjustments: invoice.adjustments,
        net_amount_due: invoice.net_amount_due,
        factoring_discount_rate: invoice.factoring_discount_rate
      }))

      const poolWithStats: PoolWithInvoices = {
        ...pool,
        pool_type: pool.pool_type as any,
        invoices: convertedInvoices,
        total_value,
        invoice_count,
        average_age
      }

      return this.success(poolWithStats)

    } catch (error) {
      this.logger.error({ error, poolId }, 'Failed to get pool with invoices')
      return this.error('Failed to get pool', 'FETCH_ERROR')
    }
  }

  // ==================== PROVIDER OPERATIONS ====================

  /**
   * Create a new provider
   */
  async createProvider(data: CreateProviderRequest): Promise<FactoringServiceResult<Provider>> {
    try {
      const validation = this.validateRequiredFields(data, ['name'])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      const provider = await this.db.provider.create({
        data
      })

      await this.logActivity('PROVIDER_CREATE', 'provider', String(provider.provider_id))
      
      // Provider type matches perfectly, no conversion needed
      return this.success(provider as Provider)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create provider')
      return this.error('Failed to create provider', 'CREATE_ERROR')
    }
  }

  /**
   * Get paginated list of providers
   */
  async getProviders(options: QueryOptions = {}): Promise<FactoringPaginatedResponse<Provider>> {
    try {
      const result = await this.executePaginatedQuery<Provider>(
        this.db.provider,
        {
          ...options,
          searchFields: ['name', 'address']
        }
      )
      return this.success(result)
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get providers')
      return this.error('Failed to fetch providers', 'FETCH_ERROR', 500)
    }
  }

  // ==================== PAYER OPERATIONS ====================

  /**
   * Create a new payer
   */
  async createPayer(data: CreatePayerRequest): Promise<FactoringServiceResult<Payer>> {
    try {
      const validation = this.validateRequiredFields(data, ['name'])
      if (!validation.success) {
        return this.error(validation.error || 'Validation failed', 'VALIDATION_ERROR', 400)
      }

      const payer = await this.db.payer.create({
        data
      })

      await this.logActivity('PAYER_CREATE', 'payer', String(payer.payer_id))
      
      // Payer type matches perfectly, no conversion needed
      return this.success(payer as Payer)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create payer')
      return this.error('Failed to create payer', 'CREATE_ERROR')
    }
  }

  /**
   * Get paginated list of payers
   */
  async getPayers(options: QueryOptions = {}): Promise<FactoringPaginatedResponse<Payer>> {
    try {
      const result = await this.executePaginatedQuery<Payer>(
        this.db.payer,
        {
          ...options,
          searchFields: ['name']
        }
      )
      return this.success(result)
    } catch (error) {
      this.logger.error({ error, options }, 'Failed to get payers')
      return this.error('Failed to fetch payers', 'FETCH_ERROR', 500)
    }
  }

  // ==================== TOKENIZATION OPERATIONS ====================

  /**
   * Tokenize a pool of invoices
   */
  async tokenizePool(data: TokenizationRequest): Promise<FactoringServiceResult<any>> {
    try {
      // Validate pool exists and has invoices
      const pool = await this.db.pool.findUnique({
        where: { pool_id: data.poolId },
        include: {
          invoice: true
        }
      })

      if (!pool) {
        return this.error('Pool not found', 'NOT_FOUND', 404)
      }

      if (!pool.invoice || pool.invoice.length === 0) {
        return this.error('Cannot tokenize empty pool', 'VALIDATION_ERROR', 400)
      }

      // Calculate pool metrics
      const totalValue = pool.invoice.reduce((sum, invoice) => {
        return sum + decimalToNumber(invoice.net_amount_due)
      }, 0)

      const averageDiscountRate = pool.invoice.reduce((sum, invoice) => {
        return sum + decimalToNumber(invoice.factoring_discount_rate)
      }, 0) / pool.invoice.length

      const discountedValue = pool.invoice.reduce((sum, invoice) => {
        const rate = decimalToNumber(invoice.factoring_discount_rate) / 100
        const value = decimalToNumber(invoice.net_amount_due)
        return sum + (value * (1 - rate))
      }, 0)

      const averageAge = pool.invoice.reduce((sum, invoice) => {
        if (!invoice.invoice_date || !invoice.due_date) return sum
        const invoiceDate = new Date(invoice.invoice_date)
        const dueDate = new Date(invoice.due_date)
        const days = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (days > 0 ? days : 0)
      }, 0) / pool.invoice.length

      // Create token in tokens table
      const tokenData = {
        name: data.tokenName,
        symbol: data.tokenSymbol,
        project_id: data.projectId,
        standard: data.tokenStandard as any, // Cast to match Prisma enum type
        blocks: {},
        decimals: 18,
        total_supply: String(data.totalTokens),
        metadata: {
          factoring: {
            source: 'factoring_tokenization',
            pool_id: data.poolId,
            total_tokens: data.totalTokens,
            token_value: data.tokenValue,
            total_value: totalValue,
            security_interest_details: data.securityInterestDetails || '',
            status: 'draft',
            average_age: Math.round(averageAge),
            discounted_value: discountedValue,
            discount_amount: totalValue - discountedValue,
            average_discount_rate: averageDiscountRate / 100,
            pool_name: pool.pool_name
          }
        },
        status: 'DRAFT' as any, // Cast to match Prisma enum type
        created_at: new Date(),
        updated_at: new Date()
      }

      const token = await this.db.tokens.create({
        data: tokenData
      })

      await this.logActivity('TOKEN_CREATE', 'tokens', token.id, {
        poolId: data.poolId,
        tokenName: data.tokenName,
        totalTokens: data.totalTokens
      })

      return this.success(token)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to tokenize pool')
      return this.error('Failed to tokenize pool', 'TOKENIZATION_ERROR')
    }
  }

  /**
   * Get tokenization data for a pool
   */
  async getPoolTokenizationData(poolId: number): Promise<FactoringServiceResult<PoolTokenizationData>> {
    try {
      const pool = await this.db.pool.findUnique({
        where: { pool_id: poolId },
        include: {
          invoice: true
        }
      })

      if (!pool) {
        return this.error('Pool not found', 'NOT_FOUND', 404)
      }

      // Calculate pool metrics
      const totalValue = pool.invoice.reduce((sum, invoice) => {
        return sum + decimalToNumber(invoice.net_amount_due)
      }, 0)

      const invoiceCount = pool.invoice.length

      const averageAge = invoiceCount > 0 ? pool.invoice.reduce((sum, invoice) => {
        if (!invoice.invoice_date || !invoice.due_date) return sum
        const invoiceDate = new Date(invoice.invoice_date)
        const dueDate = new Date(invoice.due_date)
        const days = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (days > 0 ? days : 0)
      }, 0) / invoiceCount : 0

      const averageDiscountRate = invoiceCount > 0 ? pool.invoice.reduce((sum, invoice) => {
        return sum + decimalToNumber(invoice.factoring_discount_rate)
      }, 0) / invoiceCount : 0

      const discountedValue = pool.invoice.reduce((sum, invoice) => {
        const rate = decimalToNumber(invoice.factoring_discount_rate) / 100
        const value = decimalToNumber(invoice.net_amount_due)
        return sum + (value * (1 - rate))
      }, 0)

      const discountAmount = totalValue - discountedValue

      // Check if pool can be tokenized (has invoices and not already fully tokenized)
      const existingTokens = await this.db.tokens.findMany({
        where: {
          metadata: {
            path: ['factoring', 'pool_id'],
            equals: poolId
          }
        }
      })

      const tokens = existingTokens.map(token => ({
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        totalSupply: token.total_supply || null,
        status: token.status as string
      }))

      const canTokenize = invoiceCount > 0 && !existingTokens.some(t => 
        ['DEPLOYED', 'MINTED', 'DISTRIBUTED'].includes(t.status)
      )

      const tokenizationData: PoolTokenizationData = {
        poolId,
        poolName: pool.pool_name,
        poolType: transformPoolType(pool.pool_type),
        totalValue,
        invoiceCount,
        averageAge: Math.round(averageAge),
        averageDiscountRate: averageDiscountRate / 100,
        discountedValue,
        discountAmount,
        canTokenize,
        tokens
      }

      return this.success(tokenizationData)

    } catch (error) {
      this.logger.error({ error, poolId }, 'Failed to get pool tokenization data')
      return this.error('Failed to get pool tokenization data', 'FETCH_ERROR')
    }
  }

  // ==================== TOKEN ALLOCATION OPERATIONS ====================

  /**
   * Create token allocation for investor
   */
  async createTokenAllocation(data: CreateTokenAllocationRequest): Promise<FactoringServiceResult<TokenAllocation>> {
    try {
      // Validate token exists
      const token = await this.db.tokens.findUnique({
        where: { id: data.tokenId }
      })

      if (!token) {
        return this.error('Token not found', 'NOT_FOUND', 404)
      }

      // Validate investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id: data.investorId }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Get subscription for the investor (assuming there's one)
      const subscription = await this.db.subscriptions.findFirst({
        where: { 
          investor_id: data.investorId,
          project_id: token.project_id
        }
      })

      if (!subscription) {
        return this.error('No subscription found for investor and project', 'NOT_FOUND', 404)
      }

      // Create token allocation
      const allocationData = {
        investor_id: data.investorId,
        subscription_id: subscription.id,
        project_id: token.project_id,
        token_id: data.tokenId,
        token_type: token.name,
        token_amount: data.tokenAmount,
        standard: token.standard,
        symbol: token.symbol,
        notes: data.notes,
        allocation_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }

      const allocation = await this.db.token_allocations.create({
        data: allocationData
      })

      await this.logActivity('TOKEN_ALLOCATION_CREATE', 'token_allocations', allocation.id, {
        investorId: data.investorId,
        tokenId: data.tokenId,
        tokenAmount: data.tokenAmount
      })

      return this.success({
        id: allocation.id,
        investorId: allocation.investor_id,
        tokenId: allocation.token_id || data.tokenId,
        tokenAmount: decimalToNumber(allocation.token_amount),
        allocationDate: allocation.allocation_date || new Date(),
        status: allocation.minted ? 'minted' : 'pending',
        notes: allocation.notes
      } as TokenAllocation)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create token allocation')
      return this.error('Failed to create token allocation', 'ALLOCATION_ERROR')
    }
  }

  /**
   * Get token allocations for a project
   */
  async getTokenAllocations(projectId: string, options: QueryOptions = {}): Promise<FactoringPaginatedResponse<TokenAllocation>> {
    try {
      const allocations = await this.db.token_allocations.findMany({
        where: { project_id: projectId },
        include: {
          investors: true,
          tokens: true
        },
        orderBy: { created_at: 'desc' },
        skip: options.offset || 0,
        take: options.limit || 20
      })

      const total = await this.db.token_allocations.count({
        where: { project_id: projectId }
      })

      const formattedAllocations = allocations.map(allocation => ({
        id: allocation.id,
        investorId: allocation.investor_id,
        tokenId: allocation.token_id || '',
        tokenAmount: decimalToNumber(allocation.token_amount),
        allocationDate: allocation.allocation_date || new Date(),
        status: allocation.distributed ? 'distributed' : (allocation.minted ? 'minted' : 'pending'),
        notes: allocation.notes
      })) as TokenAllocation[]

      const limit = options.limit || 20
      const totalPages = Math.ceil(total / limit)
      const currentPage = Math.floor((options.offset || 0) / limit) + 1

      return this.success(this.paginatedResponse(formattedAllocations, total, currentPage, limit))

    } catch (error) {
      this.logger.error({ error, projectId, options }, 'Failed to get token allocations')
      return this.error('Failed to fetch token allocations', 'FETCH_ERROR', 500)
    }
  }

  // ==================== TOKEN DISTRIBUTION OPERATIONS ====================

  /**
   * Distribute tokens to investor
   */
  async distributeTokens(data: DistributeTokensRequest): Promise<FactoringServiceResult<TokenDistribution>> {
    try {
      // Get allocation
      const allocation = await this.db.token_allocations.findUnique({
        where: { id: data.allocationId },
        include: {
          investors: true,
          tokens: true
        }
      })

      if (!allocation) {
        return this.error('Token allocation not found', 'NOT_FOUND', 404)
      }

      // Create distribution record
      const distributionData = {
        token_allocation_id: allocation.id,
        investor_id: allocation.investor_id,
        subscription_id: allocation.subscription_id,
        project_id: allocation.project_id,
        token_type: allocation.token_type,
        token_amount: allocation.token_amount,
        distribution_date: new Date(),
        distribution_tx_hash: `0x${Math.random().toString(16).substr(2, 64)}`, // Placeholder - replace with actual tx hash
        blockchain: data.blockchain,
        token_address: '', // Will be filled when token is deployed
        token_symbol: allocation.symbol,
        to_address: data.toAddress,
        status: 'pending',
        remaining_amount: allocation.token_amount,
        fully_redeemed: false,
        standard: allocation.standard,
        created_at: new Date(),
        updated_at: new Date()
      }

      const distribution = await this.db.distributions.create({
        data: distributionData
      })

      // Update allocation status
      await this.db.token_allocations.update({
        where: { id: allocation.id },
        data: {
          distributed: true,
          distribution_date: new Date(),
          distribution_tx_hash: distribution.distribution_tx_hash,
          updated_at: new Date()
        }
      })

      await this.logActivity('TOKEN_DISTRIBUTION_CREATE', 'distributions', distribution.id, {
        allocationId: data.allocationId,
        investorId: allocation.investor_id,
        blockchain: data.blockchain,
        toAddress: data.toAddress
      })

      return this.success({
        id: distribution.id,
        tokenAllocationId: distribution.token_allocation_id,
        investorId: distribution.investor_id,
        tokenAmount: decimalToNumber(distribution.token_amount),
        distributionDate: distribution.distribution_date,
        transactionHash: distribution.distribution_tx_hash,
        blockchain: distribution.blockchain,
        toAddress: distribution.to_address,
        status: distribution.status,
        notes: distribution.notes
      } as TokenDistribution)

    } catch (error) {
      this.logger.error({ error, data }, 'Failed to distribute tokens')
      return this.error('Failed to distribute tokens', 'DISTRIBUTION_ERROR')
    }
  }

  /**
   * Get token distributions for a project
   */
  async getTokenDistributions(projectId: string, options: QueryOptions = {}): Promise<FactoringPaginatedResponse<TokenDistribution>> {
    try {
      const distributions = await this.db.distributions.findMany({
        where: { project_id: projectId },
        include: {
          investors: true
        },
        orderBy: { created_at: 'desc' },
        skip: options.offset || 0,
        take: options.limit || 20
      })

      const total = await this.db.distributions.count({
        where: { project_id: projectId }
      })

      const formattedDistributions = distributions.map(distribution => ({
        id: distribution.id,
        tokenAllocationId: distribution.token_allocation_id,
        investorId: distribution.investor_id,
        tokenAmount: decimalToNumber(distribution.token_amount),
        distributionDate: distribution.distribution_date,
        transactionHash: distribution.distribution_tx_hash,
        blockchain: distribution.blockchain,
        toAddress: distribution.to_address,
        status: distribution.status,
        notes: distribution.notes
      })) as TokenDistribution[]

      const limit = options.limit || 20
      const totalPages = Math.ceil(total / limit)
      const currentPage = Math.floor((options.offset || 0) / limit) + 1

      return this.success(this.paginatedResponse(formattedDistributions, total, currentPage, limit))

    } catch (error) {
      this.logger.error({ error, projectId, options }, 'Failed to get token distributions')
      return this.error('Failed to fetch token distributions', 'FETCH_ERROR', 500)
    }
  }

  /**
   * Update token distribution status (e.g., confirm transaction)
   */
  async updateDistributionStatus(distributionId: string, status: 'pending' | 'confirmed' | 'failed', transactionHash?: string): Promise<FactoringServiceResult<TokenDistribution>> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date()
      }

      if (transactionHash) {
        updateData.distribution_tx_hash = transactionHash
      }

      if (status === 'confirmed') {
        updateData.status = 'confirmed'
      }

      const distribution = await this.db.distributions.update({
        where: { id: distributionId },
        data: updateData
      })

      await this.logActivity('TOKEN_DISTRIBUTION_UPDATE', 'distributions', distribution.id, {
        status,
        transactionHash
      })

      return this.success({
        id: distribution.id,
        tokenAllocationId: distribution.token_allocation_id,
        investorId: distribution.investor_id,
        tokenAmount: decimalToNumber(distribution.token_amount),
        distributionDate: distribution.distribution_date,
        transactionHash: distribution.distribution_tx_hash,
        blockchain: distribution.blockchain,
        toAddress: distribution.to_address,
        status: distribution.status,
        notes: distribution.notes
      } as TokenDistribution)

    } catch (error) {
      this.logger.error({ error, distributionId, status }, 'Failed to update distribution status')
      return this.error('Failed to update distribution status', 'UPDATE_ERROR')
    }
  }
}
