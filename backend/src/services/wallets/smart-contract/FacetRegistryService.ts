import { BaseService } from '../../BaseService'
import { ServiceResult } from '../../../types/index'

export interface FacetInfo {
  name: string
  address: string
  version: string
  functionSelectors: string[]
  isActive: boolean
  description?: string
  securityAudit?: {
    auditor: string
    auditDate: string
    auditReport: string
  }
}

export interface RegisteredFacet extends FacetInfo {
  id: string
  registeredAt: string
  registeredBy: string
}

/**
 * FacetRegistryService - Trusted Facet Registry for Diamond Proxy Wallets
 * 
 * Manages a registry of trusted, audited facets that can be used in Diamond proxy wallets.
 * Provides security validation and version management for wallet facets.
 */
export class FacetRegistryService extends BaseService {

  constructor() {
    super('FacetRegistry')
  }

  /**
   * Register a new facet in the trusted registry
   */
  async registerFacet(facetInfo: FacetInfo, registeredBy: string): Promise<ServiceResult<RegisteredFacet>> {
    try {
      // Validate facet information
      const validation = await this.validateFacetInfo(facetInfo)
      if (!validation.success) {
        return this.error(validation.error!, validation.code!)
      }

      // Check if facet already exists
      const existingFacet = await this.db.wallet_facets.findFirst({
        where: {
          facet_name: facetInfo.name,
          facet_address: facetInfo.address
        }
      })

      if (existingFacet) {
        return this.error('Facet already registered', 'FACET_ALREADY_EXISTS')
      }

      // Create a registry entry using wallet_facets table with null wallet_id for registry entries
      const registeredFacet = await this.db.wallet_facets.create({
        data: {
          wallet_id: '00000000-0000-0000-0000-000000000000', // Special UUID for registry entries
          facet_name: facetInfo.name,
          facet_address: facetInfo.address,
          function_selectors: facetInfo.functionSelectors,
          is_active: facetInfo.isActive
        }
      })

      this.logger.info({
        facetName: facetInfo.name,
        facetAddress: facetInfo.address,
        registeredBy
      }, 'Facet registered in trusted registry')

      return this.success({
        id: registeredFacet.id,
        name: registeredFacet.facet_name,
        address: registeredFacet.facet_address,
        version: facetInfo.version,
        functionSelectors: registeredFacet.function_selectors || [],
        isActive: registeredFacet.is_active || false,
        description: facetInfo.description,
        securityAudit: facetInfo.securityAudit,
        registeredAt: registeredFacet.added_at?.toISOString() || '',
        registeredBy
      })

    } catch (error) {
      this.logger.error({ error, facetName: facetInfo.name }, 'Failed to register facet')
      return this.error('Failed to register facet', 'FACET_REGISTER_ERROR')
    }
  }

  /**
   * Get all registered facets
   */
  async getRegisteredFacets(): Promise<ServiceResult<RegisteredFacet[]>> {
    try {
      const facets = await this.db.wallet_facets.findMany({
        where: {
          wallet_id: '00000000-0000-0000-0000-000000000000' // Registry entries
        },
        orderBy: { added_at: 'desc' }
      })

      const registeredFacets = facets.map(facet => ({
        id: facet.id,
        name: facet.facet_name,
        address: facet.facet_address,
        version: '1.0.0', // Default version
        functionSelectors: facet.function_selectors || [],
        isActive: facet.is_active || false,
        registeredAt: facet.added_at?.toISOString() || '',
        registeredBy: 'system' // Default
      }))

      return this.success(registeredFacets)

    } catch (error) {
      this.logger.error({ error }, 'Failed to get registered facets')
      return this.error('Failed to get registered facets', 'FACET_LIST_ERROR')
    }
  }

  /**
   * Get facet by name
   */
  async getFacetByName(name: string): Promise<ServiceResult<RegisteredFacet | null>> {
    try {
      const facet = await this.db.wallet_facets.findFirst({
        where: {
          wallet_id: '00000000-0000-0000-0000-000000000000',
          facet_name: name
        }
      })

      if (!facet) {
        return this.success(null)
      }

      return this.success({
        id: facet.id,
        name: facet.facet_name,
        address: facet.facet_address,
        version: '1.0.0',
        functionSelectors: facet.function_selectors || [],
        isActive: facet.is_active || false,
        registeredAt: facet.added_at?.toISOString() || '',
        registeredBy: 'system'
      })

    } catch (error) {
      this.logger.error({ error, name }, 'Failed to get facet by name')
      return this.error('Failed to get facet by name', 'FACET_GET_ERROR')
    }
  }

  /**
   * Validate facet information
   */
  private async validateFacetInfo(facetInfo: FacetInfo): Promise<ServiceResult<boolean>> {
    // Validate name
    if (!facetInfo.name || facetInfo.name.length < 3) {
      return this.error('Facet name must be at least 3 characters', 'INVALID_FACET_NAME')
    }

    // Validate address
    if (!facetInfo.address || !/^0x[a-fA-F0-9]{40}$/.test(facetInfo.address)) {
      return this.error('Invalid facet address format', 'INVALID_FACET_ADDRESS')
    }

    // Validate function selectors
    if (!facetInfo.functionSelectors || facetInfo.functionSelectors.length === 0) {
      return this.error('Facet must have at least one function selector', 'NO_FUNCTION_SELECTORS')
    }

    // Validate function selector format (4-byte hex)
    for (const selector of facetInfo.functionSelectors) {
      if (!/^0x[a-fA-F0-9]{8}$/.test(selector)) {
        return this.error(`Invalid function selector format: ${selector}`, 'INVALID_FUNCTION_SELECTOR')
      }
    }

    // Validate version
    if (!facetInfo.version || !/^\d+\.\d+\.\d+$/.test(facetInfo.version)) {
      return this.error('Version must be in semver format (x.y.z)', 'INVALID_VERSION_FORMAT')
    }

    return this.success(true)
  }

  /**
   * Deactivate a facet in the registry
   */
  async deactivateFacet(facetId: string): Promise<ServiceResult<boolean>> {
    try {
      const facet = await this.db.wallet_facets.findUnique({
        where: { id: facetId }
      })

      if (!facet) {
        return this.error('Facet not found', 'FACET_NOT_FOUND', 404)
      }

      await this.db.wallet_facets.update({
        where: { id: facetId },
        data: { is_active: false }
      })

      this.logger.info({ facetId, facetName: facet.facet_name }, 'Facet deactivated')

      return this.success(true)

    } catch (error) {
      this.logger.error({ error, facetId }, 'Failed to deactivate facet')
      return this.error('Failed to deactivate facet', 'FACET_DEACTIVATE_ERROR')
    }
  }

  /**
   * List all registered facets (alias for getRegisteredFacets for test compatibility)
   */
  async listFacets(): Promise<ServiceResult<RegisteredFacet[]>> {
    // This is an alias for the main method to ensure test compatibility
    return await this.getRegisteredFacets()
  }

  /**
   * Get facet information by ID or address
   */
  async getFacetInfo(facetIdOrAddress: string): Promise<ServiceResult<RegisteredFacet | null>> {
    try {
      let facet
      
      // Check if it's a facet ID (UUID format) or address (0x...)
      if (facetIdOrAddress.startsWith('0x')) {
        // Search by address
        facet = await this.db.wallet_facets.findFirst({
          where: {
            wallet_id: '00000000-0000-0000-0000-000000000000',
            facet_address: facetIdOrAddress
          }
        })
      } else {
        // Search by ID
        facet = await this.db.wallet_facets.findFirst({
          where: {
            id: facetIdOrAddress,
            wallet_id: '00000000-0000-0000-0000-000000000000'
          }
        })
      }

      if (!facet) {
        return this.success(null)
      }

      return this.success({
        id: facet.id,
        name: facet.facet_name,
        address: facet.facet_address,
        version: '1.0.0',
        functionSelectors: facet.function_selectors || [],
        isActive: facet.is_active || false,
        registeredAt: facet.added_at?.toISOString() || '',
        registeredBy: 'system'
      })

    } catch (error) {
      this.logger.error({ error, facetIdOrAddress }, 'Failed to get facet info')
      return this.error('Failed to get facet info', 'FACET_INFO_ERROR')
    }
  }

  /**
   * Check if a facet is trusted (registered and active)
   */
  async isFacetTrusted(facetAddress: string): Promise<ServiceResult<boolean>> {
    try {
      const facet = await this.db.wallet_facets.findFirst({
        where: {
          wallet_id: '00000000-0000-0000-0000-000000000000',
          facet_address: facetAddress,
          is_active: true
        }
      })

      return this.success(!!facet)

    } catch (error) {
      this.logger.error({ error, facetAddress }, 'Failed to check facet trust status')
      return this.error('Failed to check facet trust status', 'FACET_TRUST_CHECK_ERROR')
    }
  }
}
