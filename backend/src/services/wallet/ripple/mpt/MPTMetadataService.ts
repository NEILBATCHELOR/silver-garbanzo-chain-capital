/**
 * MPT Metadata Service
 * 
 * Handles metadata storage and retrieval for MPT tokens using Prisma
 */

import { getDatabase } from '@/infrastructure/database/client'

export interface MPTMetadata {
  name?: string
  symbol?: string
  description?: string
  icon?: string
  [key: string]: any
}

export class MPTMetadataService {
  /**
   * Store MPT metadata
   */
  async storeMetadata(mptId: string, metadata: MPTMetadata) {
    const db = getDatabase()

    // Update the MPT issuance record with metadata
    const record = await db.mpt_issuances.update({
      where: {
        issuance_id: mptId
      },
      data: {
        metadata_json: metadata,
        name: metadata.name || '',
        ticker: metadata.symbol || '',
        description: metadata.description,
        icon_url: metadata.icon
      }
    })

    return record
  }

  /**
   * Get MPT metadata
   */
  async getMetadata(mptId: string): Promise<MPTMetadata | null> {
    const db = getDatabase()

    const record = await db.mpt_issuances.findUnique({
      where: {
        issuance_id: mptId
      },
      select: {
        metadata_json: true,
        name: true,
        ticker: true,
        description: true,
        icon_url: true
      }
    })

    if (!record || !record.metadata_json) {
      return null
    }

    return record.metadata_json as MPTMetadata
  }

  /**
   * Update specific metadata fields
   */
  async updateMetadata(mptId: string, updates: Partial<MPTMetadata>) {
    const db = getDatabase()

    // Get current metadata
    const current = await this.getMetadata(mptId)
    const merged = { ...current, ...updates }

    // Update with merged metadata
    return this.storeMetadata(mptId, merged)
  }
}

export const mptMetadataService = new MPTMetadataService()
