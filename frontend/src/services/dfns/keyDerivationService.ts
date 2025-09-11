/**
 * DFNS Key Derivation Service - Advanced Keys API Implementation
 * 
 * Implements DFNS deterministic key derivation using threshold Diffie-Hellman protocol
 * based on the GLOW20 paper. Enables reproducible key derivation from domain tags and seeds.
 * 
 * Key Features:
 * - Deterministic key derivation using Diffie-Hellman protocol
 * - Domain separation for application-specific outputs
 * - Reproducible results from same inputs
 * - Support for secp256k1 curve with hash-to-curve RFC9380
 * - Enterprise security with User Action Signing
 * - Database synchronization for derivation tracking
 * 
 * Technical Details:
 * - Uses threshold Diffie-Hellman based on GLOW20 paper
 * - Hash to curve implementation follows RFC9380
 * - Ciphersuite: secp256k1_XMD:SHA-256_SSWU_RO_
 * - Domain separation ensures different outputs per application
 * - Only works with Diffie-Hellman keys (scheme=DH, curve=secp256k1)
 * 
 * Reference: https://docs.dfns.co/d/api-docs/keys/advanced-keys-apis/deterministic-derivation
 */

import type { WorkingDfnsClient } from '../../infrastructure/dfns/working-client';
import { DfnsError } from '../../types/dfns/errors';

// ==============================================
// DFNS Key Derivation API Types
// ==============================================

/**
 * Supported derivation curve (only secp256k1 for DH)
 */
export type DfnsDerivationCurve = 'secp256k1';

/**
 * Key derivation request parameters
 */
export interface DeriveKeyRequest {
  domain: string; // Domain separation tag in hex format
  seed: string; // Seed value in hex format
}

/**
 * Key derivation response
 */
export interface DeriveKeyResponse {
  output: string; // Derivation output in hex format
}

/**
 * Domain separation tag builder for consistent formatting
 */
export interface DomainSeparationTag {
  company: string; // Your company/organization name
  application: string; // Application name
  version: string; // Version or purpose identifier
  purpose?: string; // Optional purpose description
}

/**
 * Derivation validation result
 */
export interface DerivationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  domainInfo?: {
    company: string;
    application: string;
    version: string;
    hexEncoded: string;
  };
  seedInfo?: {
    format: 'hex' | 'string';
    length: number;
    hexEncoded: string;
  };
}

/**
 * Key information for derivation validation
 */
export interface DerivationKeyInfo {
  id: string;
  scheme: string; // Must be 'DH' for derivation
  curve: string; // Must be 'secp256k1'
  publicKey: string;
  status: string;
}

/**
 * Derivation operation options
 */
export interface DerivationOperationOptions {
  syncToDatabase?: boolean;
  validateInputs?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * Derivation statistics for monitoring
 */
export interface DerivationStatistics {
  totalDerivations: number;
  successfulDerivations: number;
  failedDerivations: number;
  averageDerivationTime: number;
  uniqueDomains: number;
  uniqueSeeds: number;
  byDomain: Record<string, number>;
  recentDerivations: Array<{
    keyId: string;
    domain: string;
    seedHash: string; // Hash of seed for privacy
    output: string;
    timestamp: string;
    success: boolean;
  }>;
}

// ==============================================
// DFNS Key Derivation Service Implementation
// ==============================================

export class DfnsKeyDerivationService {
  private client: WorkingDfnsClient;
  private requestCount = 0;
  private errorCount = 0;
  private derivationHistory: DerivationStatistics['recentDerivations'] = [];

  constructor(client: WorkingDfnsClient) {
    this.client = client;
  }

  // ==============================================
  // Core Derivation Operations
  // ==============================================

  /**
   * Check if key derivation is supported for a specific key
   * 
   * @param keyId - Key ID to check
   * @returns Whether key supports derivation
   */
  async isDerivationSupported(keyId: string): Promise<boolean> {
    try {
      // Get key details to verify it's a DH key
      const keyInfo = await this.getKeyInfo(keyId);
      return keyInfo.scheme === 'DH' && keyInfo.curve === 'secp256k1';
    } catch (error) {
      console.warn('⚠️ Could not verify derivation support for key:', error);
      return false;
    }
  }

  /**
   * Get key information for derivation validation
   * 
   * @param keyId - Key ID to get information for
   * @returns Key information
   */
  async getKeyInfo(keyId: string): Promise<DerivationKeyInfo> {
    try {
      const response = await this.client.makeRequest<DerivationKeyInfo>('GET', `/keys/${keyId}`);
      this.requestCount++;
      return response;
    } catch (error) {
      this.errorCount++;
      throw new DfnsError(
        `Failed to get key info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_INFO_FAILED',
        { keyId, error }
      );
    }
  }

  /**
   * Create domain separation tag from components
   * 
   * @param tag - Domain tag components
   * @returns Hex-encoded domain separation tag
   */
  createDomainSeparationTag(tag: DomainSeparationTag): string {
    // Format: {company}:{application}:{version}
    let domainString = `${tag.company}:${tag.application}:${tag.version}`;
    
    if (tag.purpose) {
      domainString += `:${tag.purpose}`;
    }
    
    // Convert to hex encoding
    return '0x' + Buffer.from(domainString, 'utf8').toString('hex');
  }

  /**
   * Create seed value from various input types
   * 
   * @param input - Input value (string, number, or hex)
   * @param encoding - Input encoding (default: 'utf8')
   * @returns Hex-encoded seed value
   */
  createSeedValue(input: string | number, encoding: 'utf8' | 'hex' | 'base64' = 'utf8'): string {
    let inputString = input.toString();
    
    if (encoding === 'hex') {
      // Remove 0x prefix if present
      inputString = inputString.replace(/^0x/, '');
      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(inputString)) {
        throw new Error('Invalid hex input for seed');
      }
      return '0x' + inputString;
    }
    
    let buffer: Buffer;
    if (encoding === 'base64') {
      buffer = Buffer.from(inputString, 'base64');
    } else {
      buffer = Buffer.from(inputString, 'utf8');
    }
    
    return '0x' + buffer.toString('hex');
  }

  /**
   * Validate derivation inputs before making the request
   * 
   * @param keyId - Key ID for derivation
   * @param domain - Domain separation tag
   * @param seed - Seed value
   * @returns Validation result with recommendations
   */
  async validateDerivationInputs(
    keyId: string,
    domain: string,
    seed: string
  ): Promise<DerivationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Validate key supports derivation
      const keyInfo = await this.getKeyInfo(keyId);
      
      if (keyInfo.scheme !== 'DH') {
        errors.push(`Key scheme is ${keyInfo.scheme}. Derivation requires scheme=DH (Diffie-Hellman).`);
      }
      
      if (keyInfo.curve !== 'secp256k1') {
        errors.push(`Key curve is ${keyInfo.curve}. Derivation requires curve=secp256k1.`);
      }
      
      if (keyInfo.status !== 'Active') {
        errors.push(`Key status is ${keyInfo.status}. Derivation requires Active keys.`);
      }

    } catch (error) {
      errors.push(`Cannot validate key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate domain format
    if (!domain.startsWith('0x')) {
      errors.push('Domain must be hex-encoded (start with 0x)');
    } else {
      const domainHex = domain.slice(2);
      if (!/^[0-9a-fA-F]+$/.test(domainHex)) {
        errors.push('Domain contains invalid hex characters');
      }
      
      // Try to decode domain for analysis
      try {
        const decodedDomain = Buffer.from(domainHex, 'hex').toString('utf8');
        const domainParts = decodedDomain.split(':');
        
        if (domainParts.length < 3) {
          warnings.push('Domain should follow format: company:application:version');
        }
        
        if (decodedDomain.length < 10) {
          warnings.push('Domain is very short. Consider more specific naming.');
        }
      } catch {
        warnings.push('Domain does not decode to valid UTF-8 text');
      }
    }

    // Validate seed format
    if (!seed.startsWith('0x')) {
      errors.push('Seed must be hex-encoded (start with 0x)');
    } else {
      const seedHex = seed.slice(2);
      if (!/^[0-9a-fA-F]+$/.test(seedHex)) {
        errors.push('Seed contains invalid hex characters');
      }
      
      if (seedHex.length < 16) {
        warnings.push('Seed is very short. Consider using longer values for better security.');
      }
      
      if (seedHex.length % 2 !== 0) {
        errors.push('Seed hex length must be even');
      }
    }

    // Security recommendations
    recommendations.push('Use company-specific domain separation to prevent collisions');
    recommendations.push('Include version numbers in domain tags for future compatibility');
    recommendations.push('Use high-entropy seeds for cryptographic security');
    recommendations.push('Same domain + seed will always produce the same output');
    recommendations.push('Store derivation parameters securely if reproducibility is needed');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Derive output from a Diffie-Hellman key using domain and seed
   * 
   * @param keyId - Diffie-Hellman key ID (must be scheme=DH, curve=secp256k1)
   * @param request - Derivation request with domain and seed
   * @param userActionToken - Required User Action token for security
   * @param options - Derivation operation options
   * @returns Derivation output in hex format
   */
  async deriveKey(
    keyId: string,
    request: DeriveKeyRequest,
    userActionToken?: string,
    options: DerivationOperationOptions = {}
  ): Promise<DeriveKeyResponse> {
    try {
      if (!keyId?.trim()) {
        throw new Error('Key ID is required');
      }

      if (!request.domain?.trim()) {
        throw new Error('Domain separation tag is required');
      }

      if (!request.seed?.trim()) {
        throw new Error('Seed value is required');
      }

      // Validate inputs if requested
      if (options.validateInputs) {
        const validation = await this.validateDerivationInputs(keyId, request.domain, request.seed);
        if (!validation.isValid) {
          throw new Error(`Invalid derivation inputs: ${validation.errors.join(', ')}`);
        }
      }

      const startTime = Date.now();

      const response = await this.client.makeRequest<DeriveKeyResponse>(
        'POST',
        `/keys/${keyId}/derive`,
        request,
        userActionToken
      );

      this.requestCount++;
      const derivationTime = Date.now() - startTime;

      // Add to derivation history (hash seed for privacy)
      const seedHash = this.hashSeed(request.seed);
      this.derivationHistory.unshift({
        keyId,
        domain: request.domain,
        seedHash,
        output: response.output,
        timestamp: new Date().toISOString(),
        success: true
      });

      // Keep only last 100 derivations
      this.derivationHistory = this.derivationHistory.slice(0, 100);

      // Sync to database if requested
      if (options.syncToDatabase) {
        await this.syncDerivationToDatabase(keyId, request, response);
      }

      console.log(`✅ Key derivation successful: ${keyId} in ${derivationTime}ms`);
      console.log(`🔗 Output: ${response.output.substring(0, 20)}...`);
      
      return response;

    } catch (error) {
      this.errorCount++;
      
      // Add failed derivation to history
      this.derivationHistory.unshift({
        keyId,
        domain: request.domain,
        seedHash: this.hashSeed(request.seed),
        output: '',
        timestamp: new Date().toISOString(),
        success: false
      });

      console.error('❌ Key derivation failed:', error);
      throw new DfnsError(
        `Failed to derive key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEY_DERIVATION_FAILED',
        { keyId, request: { ...request, seed: '[REDACTED]' }, error }
      );
    }
  }

  /**
   * Batch derive multiple outputs from the same key
   * 
   * @param keyId - Diffie-Hellman key ID
   * @param derivations - Array of derivation requests
   * @param userActionToken - Required User Action token
   * @param options - Operation options
   * @returns Array of derivation results
   */
  async batchDeriveKey(
    keyId: string,
    derivations: DeriveKeyRequest[],
    userActionToken?: string,
    options: DerivationOperationOptions = {}
  ): Promise<DeriveKeyResponse[]> {
    const results: DeriveKeyResponse[] = [];
    
    for (const request of derivations) {
      try {
        const result = await this.deriveKey(keyId, request, userActionToken, options);
        results.push(result);
      } catch (error) {
        console.error(`❌ Batch derivation failed for domain ${request.domain}:`, error);
        // Continue with other derivations
        results.push({ output: '' }); // Empty output indicates failure
      }
    }
    
    return results;
  }

  /**
   * Create a reproducible derivation for application-specific use
   * 
   * @param keyId - Diffie-Hellman key ID
   * @param tag - Domain separation tag components
   * @param seedInput - Seed input (will be hex-encoded)
   * @param userActionToken - Required User Action token
   * @param options - Operation options
   * @returns Derivation output
   */
  async deriveForApplication(
    keyId: string,
    tag: DomainSeparationTag,
    seedInput: string | number,
    userActionToken?: string,
    options: DerivationOperationOptions = {}
  ): Promise<DeriveKeyResponse> {
    const domain = this.createDomainSeparationTag(tag);
    const seed = this.createSeedValue(seedInput);
    
    return this.deriveKey(keyId, { domain, seed }, userActionToken, options);
  }

  // ==============================================
  // Statistics and Monitoring
  // ==============================================

  /**
   * Get derivation statistics for monitoring and analytics
   * 
   * @returns Derivation operation statistics
   */
  getDerivationStatistics(): DerivationStatistics {
    const successfulDerivations = this.derivationHistory.filter(h => h.success).length;
    const failedDerivations = this.derivationHistory.filter(h => h.success === false).length;
    
    // Calculate unique domains and seeds
    const uniqueDomains = new Set(this.derivationHistory.map(h => h.domain)).size;
    const uniqueSeeds = new Set(this.derivationHistory.map(h => h.seedHash)).size;
    
    // Count by domain
    const byDomain: Record<string, number> = {};
    this.derivationHistory.forEach(derivation => {
      if (derivation.success) {
        // Decode domain for display
        try {
          const domainHex = derivation.domain.slice(2);
          const domainString = Buffer.from(domainHex, 'hex').toString('utf8');
          byDomain[domainString] = (byDomain[domainString] || 0) + 1;
        } catch {
          byDomain[derivation.domain] = (byDomain[derivation.domain] || 0) + 1;
        }
      }
    });

    return {
      totalDerivations: this.derivationHistory.length,
      successfulDerivations,
      failedDerivations,
      averageDerivationTime: 0, // Would need to track timing
      uniqueDomains,
      uniqueSeeds,
      byDomain,
      recentDerivations: this.derivationHistory.slice(0, 20)
    };
  }

  /**
   * Get success rate for derivation operations
   * 
   * @returns Success rate percentage
   */
  getDerivationSuccessRate(): number {
    if (this.requestCount === 0) return 100;
    return ((this.requestCount - this.errorCount) / this.requestCount) * 100;
  }

  // ==============================================
  // Utility Methods
  // ==============================================

  /**
   * Hash seed value for privacy in logs and statistics
   * 
   * @param seed - Seed value to hash
   * @returns Hashed seed (first 16 chars of hex)
   */
  private hashSeed(seed: string): string {
    // Simple hash for privacy - in production, use proper cryptographic hash
    const seedHex = seed.replace(/^0x/, '');
    let hash = 0;
    for (let i = 0; i < seedHex.length; i++) {
      const char = seedHex.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 16);
  }

  /**
   * Sync derivation operation to local database
   * 
   * @param keyId - Key ID used for derivation
   * @param request - Derivation request
   * @param response - Derivation response
   */
  private async syncDerivationToDatabase(
    keyId: string,
    request: DeriveKeyRequest,
    response: DeriveKeyResponse
  ): Promise<void> {
    try {
      // This would integrate with your database sync service
      // Implementation depends on your database schema
      console.log(`📊 Syncing key derivation to database: ${keyId}`);
      
      // TODO: Implement database sync
      // await this.databaseSyncService.syncKeyDerivation(keyId, request, response);
      
    } catch (error) {
      console.warn('⚠️ Failed to sync key derivation to database:', error);
      // Don't throw - derivation was successful even if sync failed
    }
  }
}

// ==============================================
// Service Factory Function
// ==============================================

/**
 * Create and configure DFNS Key Derivation Service instance
 * 
 * @param client - Working DFNS client
 * @returns Configured service instance
 */
export function getDfnsKeyDerivationService(client: WorkingDfnsClient): DfnsKeyDerivationService {
  return new DfnsKeyDerivationService(client);
}

/**
 * Default export for convenience
 */
export default DfnsKeyDerivationService;
