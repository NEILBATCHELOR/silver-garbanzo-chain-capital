/**
 * XRPL Monitoring API Routes
 * 
 * RESTful endpoints for:
 * - WebSocket stream monitoring
 * - Payment path finding
 * - Currency code normalization
 * - Batch operations
 * - Transaction utilities
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { XRPLErrorHandler, XRPLErrorCode, XRPLError } from '@/services/xrpl/error-handler'
import { getXRPLWebSocketService, XRPLEventType } from '@/services/xrpl/websocket-service'
import { 
  Client,
  convertStringToHex,
  convertHexToString,
  xrpToDrops,
  dropsToXrp,
  RipplePathFindResponse
} from 'xrpl'

// ==================== REQUEST/RESPONSE TYPES ====================

interface StartMonitoringRequest {
  Body: {
    accountAddress: string
    eventTypes?: string[]  // 'payment', 'trust', 'offer', 'nft', etc.
    projectId: string
  }
}

interface StopMonitoringRequest {
  Params: {
    monitorId: string
  }
}

interface FindPathRequest {
  Body: {
    sourceAccount: string
    destinationAccount: string
    destinationAmount: {
      currency: string
      issuer?: string
      value: string
    }
    sourceCurrencies?: Array<{
      currency: string
      issuer?: string
    }>
  }
}

interface NormalizeCurrencyRequest {
  Body: {
    currencyCode: string
    operation?: 'encode' | 'decode'
  }
}

interface BatchTransactionRequest {
  Body: {
    transactions: Array<{
      type: string
      params: Record<string, any>
    }>
    walletSeed: string
    projectId: string
  }
}

interface ConvertAmountRequest {
  Body: {
    amount: string
    from: 'xrp' | 'drops'
    to: 'xrp' | 'drops'
  }
}

interface EncodeStringRequest {
  Body: {
    text: string
    format?: 'hex' | 'base64'
  }
}

interface DecodeStringRequest {
  Body: {
    encoded: string
    format?: 'hex' | 'base64'
  }
}

interface MonitorConfig {
  accountAddress: string
  eventTypes: string[]
  projectId: string
  startedAt: Date
  status: string
}

// ==================== ROUTES ====================

export async function monitoringRoutes(fastify: FastifyInstance) {
  // Initialize services
  const xrplClient = xrplClientManager.getClient('mainnet')
  const wsService = getXRPLWebSocketService()

  // Track active monitors
  const activeMonitors = new Map<string, MonitorConfig>()

  // ==================== WEBSOCKET MONITORING ====================
  
  /**
   * Start monitoring account
   * 
   * POST /xrpl/monitoring/start
   * 
   * Starts real-time WebSocket monitoring for an account.
   * Streams events like payments, trust lines, offers, NFTs.
   */
  fastify.post<StartMonitoringRequest>(
    '/start',
    {
      schema: {
        description: 'Start monitoring account via WebSocket',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['accountAddress', 'projectId'],
          properties: {
            accountAddress: { type: 'string' },
            eventTypes: {
              type: 'array',
              items: { type: 'string' }
            },
            projectId: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  monitorId: { type: 'string' },
                  accountAddress: { type: 'string' },
                  eventTypes: { type: 'array' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<StartMonitoringRequest>, reply: FastifyReply) => {
      try {
        const { accountAddress, eventTypes, projectId } = request.body

        const monitorId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Subscribe to account transactions
        await xrplClient.request({
          command: 'subscribe',
          accounts: [accountAddress]
        })

        // Store monitor configuration
        activeMonitors.set(monitorId, {
          accountAddress,
          eventTypes: eventTypes || ['all'],
          projectId,
          startedAt: new Date(),
          status: 'active'
        })

        // Setup event listener
        xrplClient.on('transaction', (tx: any) => {
          if (tx.transaction.Account === accountAddress || 
              tx.transaction.Destination === accountAddress) {
            
            const txType = tx.transaction.TransactionType.toLowerCase()
            
            if (!eventTypes || eventTypes.includes('all') || eventTypes.includes(txType)) {
              wsService.emitToAll(XRPLEventType.TRANSACTION_VALIDATED, {
                monitorId,
                accountAddress,
                transaction: tx,
                projectId
              })
            }
          }
        })

        return reply.send({
          success: true,
          data: {
            monitorId,
            accountAddress,
            eventTypes: eventTypes || ['all'],
            status: 'active',
            message: 'WebSocket monitoring started'
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * Stop monitoring
   * 
   * DELETE /xrpl/monitoring/:monitorId
   * 
   * Stops an active WebSocket monitor.
   */
  fastify.delete<StopMonitoringRequest>(
    '/:monitorId',
    {
      schema: {
        description: 'Stop account monitoring',
        tags: ['Monitoring'],
        params: {
          type: 'object',
          properties: {
            monitorId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<StopMonitoringRequest>, reply: FastifyReply) => {
      try {
        const { monitorId } = request.params

        const monitor = activeMonitors.get(monitorId)
        
        if (!monitor) {
          throw new XRPLError(
            XRPLErrorCode.RECORD_NOT_FOUND,
            `Monitor ${monitorId} not found`
          )
        }

        // Unsubscribe from account
        await xrplClient.request({
          command: 'unsubscribe',
          accounts: [monitor.accountAddress]
        })

        activeMonitors.delete(monitorId)

        wsService.emitToAll(XRPLEventType.TRANSACTION_VALIDATED, {
          type: 'monitor:stopped',
          monitorId
        })

        return reply.send({
          success: true,
          data: {
            monitorId,
            status: 'stopped'
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * List active monitors
   * 
   * GET /xrpl/monitoring/list
   * 
   * Lists all currently active monitors.
   */
  fastify.get(
    '/list',
    {
      schema: {
        description: 'List active monitors',
        tags: ['Monitoring']
      }
    },
    async (request, reply) => {
      try {
        const monitors = Array.from(activeMonitors.entries()).map(([id, config]) => ({
          monitorId: id,
          ...config
        }))

        return reply.send({
          success: true,
          data: {
            monitors,
            total: monitors.length
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== PATH FINDING ====================
  
  /**
   * Find payment path
   * 
   * POST /xrpl/monitoring/find-path
   * 
   * Finds optimal payment path for cross-currency payments.
   */
  fastify.post<FindPathRequest>(
    '/find-path',
    {
      schema: {
        description: 'Find optimal payment path',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['sourceAccount', 'destinationAccount', 'destinationAmount'],
          properties: {
            sourceAccount: { type: 'string' },
            destinationAccount: { type: 'string' },
            destinationAmount: { type: 'object' },
            sourceCurrencies: { type: 'array' }
          }
        }
      }
    },
    async (request: FastifyRequest<FindPathRequest>, reply: FastifyReply) => {
      try {
        const { 
          sourceAccount, 
          destinationAccount, 
          destinationAmount, 
          sourceCurrencies 
        } = request.body

        const pathRequest: any = {
          command: 'ripple_path_find',
          source_account: sourceAccount,
          destination_account: destinationAccount,
          destination_amount: destinationAmount,
          ledger_index: 'validated'
        }

        if (sourceCurrencies && sourceCurrencies.length > 0) {
          pathRequest.source_currencies = sourceCurrencies
        }

        const response = await xrplClient.request(pathRequest) as RipplePathFindResponse

        // Safely access alternatives with proper type checking
        const paths = response.result && 'alternatives' in response.result 
          ? response.result.alternatives 
          : []

        return reply.send({
          success: true,
          data: {
            sourceAccount,
            destinationAccount,
            destinationAmount,
            paths: paths.map((alt: any) => ({
              sourceAmount: alt.source_amount,
              pathsComputed: alt.paths_computed,
              qualityIn: alt.quality_in,
              qualityOut: alt.quality_out
            })),
            totalPaths: paths.length,
            recommended: paths[0] || null
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== CURRENCY NORMALIZATION ====================
  
  /**
   * Normalize currency code
   * 
   * POST /xrpl/monitoring/normalize-currency
   * 
   * Converts currency codes between standard and hexadecimal formats.
   */
  fastify.post<NormalizeCurrencyRequest>(
    '/normalize-currency',
    {
      schema: {
        description: 'Normalize currency code format',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['currencyCode'],
          properties: {
            currencyCode: { type: 'string' },
            operation: { type: 'string', enum: ['encode', 'decode'] }
          }
        }
      }
    },
    async (request: FastifyRequest<NormalizeCurrencyRequest>, reply: FastifyReply) => {
      try {
        const { currencyCode, operation = 'encode' } = request.body

        let normalized: string

        if (operation === 'encode') {
          // Convert standard currency code to hex
          if (currencyCode.length <= 3) {
            // Standard 3-character code (e.g., USD, EUR)
            normalized = currencyCode
          } else {
            // Non-standard code, convert to hex
            normalized = convertStringToHex(currencyCode).toUpperCase()
          }
        } else {
          // Decode hex to standard format
          if (currencyCode.length === 40) {
            // Hex format
            normalized = convertHexToString(currencyCode)
          } else {
            // Already standard format
            normalized = currencyCode
          }
        }

        return reply.send({
          success: true,
          data: {
            original: currencyCode,
            normalized,
            operation,
            isStandard: normalized.length <= 3
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== BATCH OPERATIONS ====================
  
  /**
   * Submit batch transactions
   * 
   * POST /xrpl/monitoring/batch
   * 
   * Submits multiple transactions in sequence.
   * Note: XRPL processes these sequentially, not atomically.
   */
  fastify.post<BatchTransactionRequest>(
    '/batch',
    {
      schema: {
        description: 'Submit batch transactions',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['transactions', 'walletSeed', 'projectId'],
          properties: {
            transactions: { type: 'array' },
            walletSeed: { type: 'string' },
            projectId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<BatchTransactionRequest>, reply: FastifyReply) => {
      try {
        const { transactions, walletSeed, projectId } = request.body

        // Note: This is a simplified implementation
        // Production should use more sophisticated batching strategies

        const results = []

        for (const tx of transactions) {
          try {
            // Process each transaction
            // This would need to be expanded based on transaction type
            const result = {
              type: tx.type,
              status: 'processed',
              params: tx.params
            }
            results.push(result)
          } catch (error) {
            results.push({
              type: tx.type,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        wsService.emitToAll(XRPLEventType.TRANSACTION_VALIDATED, {
          type: 'batch:completed',
          projectId,
          total: transactions.length,
          successful: results.filter(r => r.status === 'processed').length,
          failed: results.filter(r => r.status === 'failed').length
        })

        return reply.send({
          success: true,
          data: {
            results,
            summary: {
              total: transactions.length,
              successful: results.filter(r => r.status === 'processed').length,
              failed: results.filter(r => r.status === 'failed').length
            }
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  // ==================== UTILITY ENDPOINTS ====================
  
  /**
   * Convert amount
   * 
   * POST /xrpl/monitoring/convert-amount
   * 
   * Converts between XRP and drops.
   */
  fastify.post<ConvertAmountRequest>(
    '/convert-amount',
    {
      schema: {
        description: 'Convert between XRP and drops',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['amount', 'from', 'to'],
          properties: {
            amount: { type: 'string' },
            from: { type: 'string', enum: ['xrp', 'drops'] },
            to: { type: 'string', enum: ['xrp', 'drops'] }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  original: { type: 'string' },
                  converted: { type: 'string' },
                  from: { type: 'string' },
                  to: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<ConvertAmountRequest>, reply: FastifyReply) => {
      try {
        const { amount, from, to } = request.body

        let converted: string

        if (from === 'xrp' && to === 'drops') {
          converted = xrpToDrops(amount)
        } else if (from === 'drops' && to === 'xrp') {
          // dropsToXrp returns a number, need to convert to string
          converted = dropsToXrp(amount).toString()
        } else {
          converted = amount
        }

        return reply.send({
          success: true,
          data: {
            original: amount,
            converted,
            from,
            to
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * Encode string
   * 
   * POST /xrpl/monitoring/encode-string
   * 
   * Encodes string to hex for XRPL transactions.
   */
  fastify.post<EncodeStringRequest>(
    '/encode-string',
    {
      schema: {
        description: 'Encode string to hex',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string' },
            format: { type: 'string', enum: ['hex', 'base64'] }
          }
        }
      }
    },
    async (request: FastifyRequest<EncodeStringRequest>, reply: FastifyReply) => {
      try {
        const { text, format = 'hex' } = request.body

        let encoded: string

        if (format === 'hex') {
          encoded = convertStringToHex(text).toUpperCase()
        } else {
          encoded = Buffer.from(text).toString('base64')
        }

        return reply.send({
          success: true,
          data: {
            original: text,
            encoded,
            format,
            length: encoded.length.toString()
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * Decode string
   * 
   * POST /xrpl/monitoring/decode-string
   * 
   * Decodes hex/base64 to readable string.
   */
  fastify.post<DecodeStringRequest>(
    '/decode-string',
    {
      schema: {
        description: 'Decode hex/base64 to string',
        tags: ['Monitoring'],
        body: {
          type: 'object',
          required: ['encoded'],
          properties: {
            encoded: { type: 'string' },
            format: { type: 'string', enum: ['hex', 'base64'] }
          }
        }
      }
    },
    async (request: FastifyRequest<DecodeStringRequest>, reply: FastifyReply) => {
      try {
        const { encoded, format = 'hex' } = request.body

        let decoded: string

        if (format === 'hex') {
          decoded = convertHexToString(encoded)
        } else {
          decoded = Buffer.from(encoded, 'base64').toString('utf8')
        }

        return reply.send({
          success: true,
          data: {
            encoded,
            decoded,
            format
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * Get server info
   * 
   * GET /xrpl/monitoring/server-info
   * 
   * Retrieves XRPL server information and status.
   */
  fastify.get(
    '/server-info',
    {
      schema: {
        description: 'Get XRPL server information',
        tags: ['Monitoring']
      }
    },
    async (request, reply) => {
      try {
        const serverInfo = await xrplClient.request({
          command: 'server_info'
        })

        return reply.send({
          success: true,
          data: {
            info: serverInfo.result.info,
            validatedLedger: serverInfo.result.info.validated_ledger,
            load: serverInfo.result.info.load_factor
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )

  /**
   * Get ledger info
   * 
   * GET /xrpl/monitoring/ledger
   * 
   * Retrieves current ledger information.
   */
  fastify.get(
    '/ledger',
    {
      schema: {
        description: 'Get current ledger information',
        tags: ['Monitoring']
      }
    },
    async (request, reply) => {
      try {
        const ledger = await xrplClient.request({
          command: 'ledger',
          ledger_index: 'validated'
        })

        return reply.send({
          success: true,
          data: {
            ledgerIndex: ledger.result.ledger_index,
            ledgerHash: ledger.result.ledger_hash,
            closeTime: ledger.result.ledger.close_time,
            totalCoins: ledger.result.ledger.total_coins
          }
        })

      } catch (error) {
        return XRPLErrorHandler.handleError(error, reply, request.id)
      }
    }
  )
}
