/**
 * DFNS Validators Service (Updated for Current API)
 * 
 * Service for DFNS Validators API endpoints
 * Based on: https://docs.dfns.co/d/api-docs/networks/validators
 * 
 * API Endpoints:
 * - POST /networks/:networkId/validators
 * - GET /networks/:networkId/validators  
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import type {
  DfnsValidator,
  DfnsCreateValidatorRequest,
  DfnsCreateValidatorResponse,
  DfnsListValidatorsRequest,
  DfnsListValidatorsResponse,
  DfnsGetValidatorRequest,
  DfnsUpdateValidatorRequest,
  DfnsDeleteValidatorRequest,
  DfnsValidatorKind,
  DfnsOAuth2Config
} from '../../types/dfns/networks';
import type { DfnsNetwork } from '../../types/dfns/core';
import { DfnsError, DfnsValidationError, DfnsAuthenticationError } from '../../types/dfns/errors';

export class DfnsValidatorsService {
  constructor(private workingClient: WorkingDfnsClient) {}

  // ==============================================
  // VALIDATOR CRUD OPERATIONS (Current DFNS API)
  // ==============================================

  /**
   * Create a new Canton validator
   * POST /networks/:networkId/validators
   * 
   * Requires User Action Signing and Networks:CantonValidators:Create permission
   */
  async createValidator(
    networkId: string,
    request: DfnsCreateValidatorRequest,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    try {
      // Validate request
      this.validateCreateValidatorRequest(request);

      if (!userActionToken) {
        console.warn('⚠️ Creating validator without User Action token - this will likely fail with 403');
      }

      console.log(`🏗️ Creating ${request.kind} validator '${request.name}' on network ${networkId}...`, {
        kind: request.kind,
        hasUrl: !!request.url,
        hasOAuth2: !!request.oauth2,
        hasUserAction: !!userActionToken
      });

      const response = await this.workingClient.makeRequest<DfnsCreateValidatorResponse>(
        'POST',
        `/networks/${networkId}/validators`,
        request,
        userActionToken
      );

      console.log(`✅ Validator created successfully:`, {
        id: response.id,
        name: response.name,
        network: response.network,
        kind: response.kind,
        dateCreated: response.dateCreated
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to create validator:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to create validator: ${error}`,
        'VALIDATOR_CREATE_FAILED',
        { 
          name: request.name, 
          networkId, 
          kind: request.kind,
          hasUserAction: !!userActionToken 
        }
      );
    }
  }

  /**
   * List validators for a specific network
   * GET /networks/:networkId/validators
   * 
   * Requires Networks:CantonValidators:Read permission
   */
  async listValidators(networkId: string): Promise<DfnsListValidatorsResponse> {
    try {
      console.log(`📋 Listing validators for network ${networkId}...`);

      const response = await this.workingClient.makeRequest<DfnsListValidatorsResponse>(
        'GET',
        `/networks/${networkId}/validators`
      );

      console.log(`✅ Retrieved ${response.items.length} validators for ${networkId}`, {
        hasMore: !!response.nextPageToken,
        validators: response.items.map(v => ({ id: v.id, name: v.name, kind: v.kind }))
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to list validators for network ${networkId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to list validators for network ${networkId}: ${error}`,
        'VALIDATOR_LIST_FAILED',
        { networkId }
      );
    }
  }

  /**
   * Get specific validator by ID
   * GET /networks/:networkId/validators/:validatorId
   * 
   * Note: This endpoint may not be available in current API
   */
  async getValidator(networkId: string, validatorId: string): Promise<DfnsValidator> {
    try {
      if (!networkId || !validatorId) {
        throw new DfnsValidationError('Network ID and Validator ID are required');
      }

      console.log(`🔍 Getting validator ${validatorId} on network ${networkId}...`);

      const response = await this.workingClient.makeRequest<DfnsValidator>(
        'GET',
        `/networks/${networkId}/validators/${validatorId}`
      );

      console.log(`✅ Validator retrieved:`, {
        id: response.id,
        name: response.name,
        network: response.network,
        kind: response.kind
      });

      return response;
    } catch (error) {
      console.error(`❌ Failed to get validator ${validatorId}:`, error);
      
      if (error instanceof DfnsError) {
        throw error;
      }
      
      throw new DfnsError(
        `Failed to get validator ${validatorId}: ${error}`,
        'VALIDATOR_GET_FAILED',
        { networkId, validatorId }
      );
    }
  }

  // ==============================================
  // VALIDATOR MANAGEMENT HELPERS
  // ==============================================

  /**
   * Create a shared Canton validator (most common use case)
   */
  async createSharedValidator(
    networkId: string,
    name: string,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    return this.createValidator(networkId, {
      name,
      kind: 'Shared'
    }, userActionToken);
  }

  /**
   * Create a custom Canton validator with OAuth2 configuration
   */
  async createCustomValidator(
    networkId: string,
    name: string,
    url: string,
    oauth2Config: DfnsOAuth2Config,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    return this.createValidator(networkId, {
      name,
      kind: 'Custom',
      url,
      oauth2: oauth2Config
    }, userActionToken);
  }

  /**
   * Create Auth0 custom validator (helper)
   */
  async createAuth0Validator(
    networkId: string,
    name: string,
    url: string,
    domain: string,
    clientId: string,
    clientSecret: string,
    audience: string,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    return this.createCustomValidator(networkId, name, url, {
      domain,
      clientId,
      clientSecret,
      audience
    }, userActionToken);
  }

  /**
   * Create Okta custom validator (helper)
   */
  async createOktaValidator(
    networkId: string,
    name: string,
    url: string,
    domain: string,
    tokenPath: string,
    clientId: string,
    clientSecret: string,
    audience: string,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    return this.createCustomValidator(networkId, name, url, {
      domain,
      tokenPath,
      clientId,
      clientSecret,
      audience
    }, userActionToken);
  }

  /**
   * Create Keycloak custom validator (helper)
   */
  async createKeycloakValidator(
    networkId: string,
    name: string,
    url: string,
    domain: string,
    realm: string,
    clientId: string,
    clientSecret: string,
    userActionToken?: string
  ): Promise<DfnsCreateValidatorResponse> {
    return this.createCustomValidator(networkId, name, url, {
      domain,
      tokenPath: `/auth/realms/${realm}/protocol/openid-connect/token`,
      clientId,
      clientSecret,
      audience: url
    }, userActionToken);
  }

  /**
   * Get validators by kind
   */
  async getValidatorsByKind(networkId: string, kind: DfnsValidatorKind): Promise<DfnsValidator[]> {
    const response = await this.listValidators(networkId);
    return response.items.filter(validator => validator.kind === kind);
  }

  /**
   * Get shared validators only
   */
  async getSharedValidators(networkId: string): Promise<DfnsValidator[]> {
    return this.getValidatorsByKind(networkId, 'Shared');
  }

  /**
   * Get custom validators only
   */
  async getCustomValidators(networkId: string): Promise<DfnsValidator[]> {
    return this.getValidatorsByKind(networkId, 'Custom');
  }

  // ==============================================
  // VALIDATOR STATISTICS
  // ==============================================

  /**
   * Get validator statistics for a network
   */
  async getValidatorStats(networkId: string): Promise<{
    total: number;
    byKind: Record<DfnsValidatorKind, number>;
    networks: string[];
  }> {
    try {
      const validators = await this.listValidators(networkId);
      
      const stats = {
        total: validators.items.length,
        byKind: {
          'Shared': 0,
          'Custom': 0
        } as Record<DfnsValidatorKind, number>,
        networks: [networkId]
      };

      // Count validators by kind
      validators.items.forEach(validator => {
        stats.byKind[validator.kind]++;
      });

      return stats;
    } catch (error) {
      throw new DfnsError(
        `Failed to get validator statistics for ${networkId}: ${error}`,
        'VALIDATOR_STATS_FAILED',
        { networkId }
      );
    }
  }

  // ==============================================
  // VALIDATION HELPERS
  // ==============================================

  /**
   * Validate create validator request
   */
  private validateCreateValidatorRequest(request: DfnsCreateValidatorRequest): void {
    if (!request.name?.trim()) {
      throw new DfnsValidationError('Validator name is required');
    }

    if (!request.kind) {
      throw new DfnsValidationError('Validator kind is required');
    }

    const validKinds: DfnsValidatorKind[] = ['Shared', 'Custom'];
    if (!validKinds.includes(request.kind)) {
      throw new DfnsValidationError(
        `Invalid validator kind: ${request.kind}. Must be one of: ${validKinds.join(', ')}`
      );
    }

    // For custom validators, url and oauth2 are required
    if (request.kind === 'Custom') {
      if (!request.url?.trim()) {
        throw new DfnsValidationError('URL is required for Custom validators');
      }

      if (!request.url.startsWith('http')) {
        throw new DfnsValidationError('URL must be a valid HTTP/HTTPS URL');
      }

      if (!request.oauth2) {
        throw new DfnsValidationError('OAuth2 configuration is required for Custom validators');
      }

      this.validateOAuth2Config(request.oauth2);
    }
  }

  /**
   * Validate OAuth2 configuration
   */
  private validateOAuth2Config(config: DfnsOAuth2Config): void {
    if (!config.domain?.trim()) {
      throw new DfnsValidationError('OAuth2 domain is required');
    }

    if (!config.domain.startsWith('http')) {
      throw new DfnsValidationError('OAuth2 domain must be a valid HTTP/HTTPS URL');
    }

    if (!config.clientId?.trim()) {
      throw new DfnsValidationError('OAuth2 client ID is required');
    }

    if (!config.clientSecret?.trim()) {
      throw new DfnsValidationError('OAuth2 client secret is required');
    }

    if (!config.audience?.trim()) {
      throw new DfnsValidationError('OAuth2 audience is required');
    }
  }

  /**
   * Check if network supports validators
   */
  supportsValidators(networkId: string): boolean {
    // Canton validators are currently supported on specific networks
    const supportedNetworks = [
      'CantonDevnet',
      'CantonTestnet',
      'Canton'
    ];
    
    return supportedNetworks.includes(networkId);
  }

  /**
   * Get supported validator networks
   */
  getSupportedNetworks(): string[] {
    return [
      'CantonDevnet',
      'CantonTestnet',
      'Canton'
    ];
  }

  // ==============================================
  // UTILITY METHODS
  // ==============================================

  /**
   * Test validator connectivity for a network
   */
  async testValidatorConnectivity(networkId: string): Promise<{
    canList: boolean;
    totalValidators: number;
    responseTime: number;
    networkSupported: boolean;
  }> {
    const startTime = Date.now();
    const networkSupported = this.supportsValidators(networkId);
    
    if (!networkSupported) {
      return {
        canList: false,
        totalValidators: 0,
        responseTime: Date.now() - startTime,
        networkSupported: false
      };
    }
    
    try {
      const response = await this.listValidators(networkId);
      const responseTime = Date.now() - startTime;
      
      return {
        canList: true,
        totalValidators: response.items.length,
        responseTime,
        networkSupported: true
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        canList: false,
        totalValidators: 0,
        responseTime,
        networkSupported: true
      };
    }
  }

  /**
   * Get available validator kinds
   */
  getValidatorKinds(): DfnsValidatorKind[] {
    return ['Shared', 'Custom'];
  }

  /**
   * Create OAuth2 config examples for different providers
   */
  getOAuth2Examples(): Record<string, Partial<DfnsOAuth2Config>> {
    return {
      auth0: {
        domain: 'https://your-domain.us.auth0.com',
        audience: 'https://canton.network.global'
      },
      okta: {
        domain: 'https://your-domain.okta.com',
        tokenPath: 'oauth2/your-auth-server/v1/token',
        audience: 'https://validator.testnet.mydomain.com/'
      },
      keycloak: {
        domain: 'https://my-own-server.running-keycloak.com',
        tokenPath: '/auth/realms/your-realm/protocol/openid-connect/token',
        audience: 'https://validator.testnet.mydomain.com/'
      }
    };
  }
}
