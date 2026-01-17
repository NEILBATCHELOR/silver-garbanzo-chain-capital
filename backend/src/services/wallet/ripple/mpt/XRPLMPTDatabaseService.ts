/**
 * Backend XRPL MPT Database Service
 * 
 * Handles database operations for MPT tokens using Prisma
 */

import { getDatabase } from '@/infrastructure/database/client'

export interface MPTIssuanceData {
  mptId: string
  issuerAddress: string
  assetScale: number
  maximumAmount: string | null
  transferFee: number
  transactionHash: string
  ledgerIndex: number
  metadata?: any
  flags?: any
  status: string
  ticker: string
  name: string
  description?: string
}

export class XRPLMPTDatabaseService {
  /**
   * Save MPT issuance to database
   */
  async saveMPTIssuance(projectId: string, data: MPTIssuanceData) {
    const db = getDatabase()

    const record = await db.mpt_issuances.create({
      data: {
        project_id: projectId,
        issuance_id: data.mptId,
        issuer_address: data.issuerAddress,
        asset_scale: data.assetScale,
        maximum_amount: data.maximumAmount,
        transfer_fee: data.transferFee,
        creation_transaction_hash: data.transactionHash,
        ticker: data.ticker,
        name: data.name,
        description: data.description,
        metadata_json: data.metadata,
        flags: data.flags,
        status: data.status
      }
    })

    return record
  }

  /**
   * Get MPT issuance by ID
   */
  async getMPTIssuance(mptId: string) {
    const db = getDatabase()

    const record = await db.mpt_issuances.findUnique({
      where: {
        issuance_id: mptId
      }
    })

    if (!record) {
      throw new Error(`MPT issuance ${mptId} not found`)
    }

    return record
  }

  /**
   * List MPT issuances with filters
   */
  async listMPTIssuances(filters: {
    projectId?: string
    issuerAddress?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const db = getDatabase()
    
    const where: any = {}
    
    if (filters.projectId) {
      where.project_id = filters.projectId
    }
    if (filters.issuerAddress) {
      where.issuer_address = filters.issuerAddress
    }
    if (filters.status) {
      where.status = filters.status
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.mpt_issuances.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      }),
      db.mpt_issuances.count({ where })
    ])

    return {
      data: data || [],
      total: total || 0,
      page,
      limit
    }
  }

  /**
   * Save MPT holder authorization
   */
  async saveHolderAuthorization(
    mptId: string, 
    data: {
      holderAddress: string
      authorized: boolean
      transactionHash: string
      ledgerIndex?: number
    }
  ) {
    const db = getDatabase()

    const record = await db.mpt_holders.create({
      data: {
        issuance_id: mptId,
        holder_address: data.holderAddress,
        authorization_transaction_hash: data.transactionHash,
        balance: '0',
        authorized: data.authorized,
        authorized_at: data.authorized ? new Date() : undefined
      }
    })

    return record
  }

  /**
   * Get MPT holders
   */
  async getMPTHolders(mptId: string) {
    const db = getDatabase()

    const holders = await db.mpt_holders.findMany({
      where: {
        issuance_id: mptId
      },
      orderBy: {
        balance: 'desc'
      }
    })

    return holders || []
  }

  /**
   * Save MPT transaction
   */
  async saveMPTTransaction(data: {
    mptId: string
    transactionType: string
    fromAddress: string
    toAddress?: string
    amount: string
    transactionHash: string
    ledgerIndex?: number
    projectId?: string
  }) {
    const db = getDatabase()

    const record = await db.mpt_transactions.create({
      data: {
        issuance_id: data.mptId,
        transaction_type: data.transactionType,
        from_address: data.fromAddress,
        to_address: data.toAddress || '',
        amount: data.amount,
        transaction_hash: data.transactionHash,
        ledger_index: data.ledgerIndex,
        project_id: data.projectId
      }
    })

    return record
  }

  /**
   * Get MPT transactions with pagination
   */
  async getMPTTransactions(
    mptId: string,
    filters?: {
      page?: number
      limit?: number
      transactionType?: string
      fromAddress?: string
      toAddress?: string
    }
  ) {
    const db = getDatabase()
    
    const where: any = {
      issuance_id: mptId
    }
    
    if (filters?.transactionType) {
      where.transaction_type = filters.transactionType
    }
    if (filters?.fromAddress) {
      where.from_address = filters.fromAddress
    }
    if (filters?.toAddress) {
      where.to_address = filters.toAddress
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.mpt_transactions.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      }),
      db.mpt_transactions.count({ where })
    ])

    return {
      data: data || [],
      total: total || 0,
      page,
      limit
    }
  }

  /**
   * Update MPT holder balance
   */
  async updateHolderBalance(mptId: string, holderAddress: string, newBalance: string) {
    const db = getDatabase()

    const record = await db.mpt_holders.updateMany({
      where: {
        issuance_id: mptId,
        holder_address: holderAddress
      },
      data: {
        balance: newBalance,
        updated_at: new Date()
      }
    })

    return record
  }
}

export const xrplMPTDatabaseService = new XRPLMPTDatabaseService()
