/**
 * Blockscout API client for source code verification
 * Matches behavior of: forge verify-contract --verifier blockscout
 */

import { BlockExplorerClient } from './blockExplorerClient';
import type {
  SourceVerificationRequest,
  SourceVerificationResult,
  BlockExplorerConfig,
  SourceVerificationStatus
} from '../types';

export class BlockscoutClient extends BlockExplorerClient {
  constructor(config: BlockExplorerConfig) {
    super(config);
  }

  /**
   * Verify contract source code on Blockscout
   * Matches: forge verify-contract ... --verifier blockscout
   */
  async verifyContract(
    request: SourceVerificationRequest
  ): Promise<SourceVerificationResult> {
    try {
      // Check if already verified first (like bash script does)
      const alreadyVerified = await this.isVerified(request.contractAddress);
      if (alreadyVerified) {
        return {
          success: true,
          status: 'already_verified' as SourceVerificationStatus,
          message: 'Contract already verified on Blockscout',
          explorerUrl: this.getExplorerUrl(request.contractAddress)
        };
      }

      // Prepare verification request
      const verificationPayload = this.prepareVerificationPayload(request);

      // Submit to Blockscout API
      const response = await fetch(
        `${this.config.apiUrl}?module=contract&action=verifysourcecode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(verificationPayload)
        }
      );

      const result = await response.json();

      // Handle response
      if (result.status === '1' || result.message === 'OK') {
        return {
          success: true,
          status: 'verified' as SourceVerificationStatus,
          message: 'Contract verified successfully',
          explorerUrl: this.getExplorerUrl(request.contractAddress),
          guid: result.result
        };
      }

      // Check for "already verified" in error message
      if (result.message?.toLowerCase().includes('already verified')) {
        return {
          success: true,
          status: 'already_verified' as SourceVerificationStatus,
          message: 'Contract already verified',
          explorerUrl: this.getExplorerUrl(request.contractAddress)
        };
      }

      // Verification failed
      return {
        success: false,
        status: 'failed' as SourceVerificationStatus,
        message: result.message || 'Verification failed'
      };

    } catch (error: any) {
      // Check error message for "already verified" (bash script pattern)
      if (error.message?.toLowerCase().includes('already verified')) {
        return {
          success: true,
          status: 'already_verified' as SourceVerificationStatus,
          message: 'Contract already verified',
          explorerUrl: this.getExplorerUrl(request.contractAddress)
        };
      }

      return {
        success: false,
        status: 'failed' as SourceVerificationStatus,
        message: error.message || 'Verification request failed'
      };
    }
  }

  /**
   * Check if contract is already verified on Blockscout
   * Prevents unnecessary verification attempts
   */
  async isVerified(address: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}?module=contract&action=getsourcecode&address=${address}`
      );

      const result = await response.json();

      // If source code is not empty, contract is verified
      return result.result?.[0]?.SourceCode !== '';
    } catch (error) {
      // If check fails, assume not verified
      return false;
    }
  }

  /**
   * Check verification status by GUID
   * Used for polling verification progress
   */
  async checkStatus(guid: string): Promise<SourceVerificationResult> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}?module=contract&action=checkverifystatus&guid=${guid}`
      );

      const result = await response.json();

      if (result.status === '1') {
        return {
          success: true,
          status: 'verified' as SourceVerificationStatus,
          message: result.result || 'Verification complete'
        };
      }

      if (result.result === 'Pending in queue') {
        return {
          success: true,
          status: 'pending' as SourceVerificationStatus,
          message: 'Verification in progress',
          retryAfter: 5
        };
      }

      return {
        success: false,
        status: 'failed' as SourceVerificationStatus,
        message: result.result || 'Verification failed'
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed' as SourceVerificationStatus,
        message: error.message || 'Status check failed'
      };
    }
  }

  /**
   * Prepare verification payload for Blockscout API
   * Matches format expected by Blockscout verifier
   */
  private prepareVerificationPayload(request: SourceVerificationRequest): any {
    return {
      addressHash: request.contractAddress,
      name: this.extractContractName(request.contractPath),
      compilerVersion: request.compilerVersion,
      optimization: request.optimizationEnabled,
      optimizationRuns: request.optimizationRuns,
      contractSourceCode: request.sourceCode,
      constructorArguments: request.constructorArgs || '',
      // Blockscout-specific fields
      autodetectConstructorArguments: false,
      evmVersion: 'paris'
    };
  }
}
