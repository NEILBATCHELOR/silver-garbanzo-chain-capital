/**
 * Abstract base class for block explorer clients
 * Provides common interface for Etherscan, Blockscout, etc.
 */

import type {
  SourceVerificationRequest,
  SourceVerificationResult,
  BlockExplorerConfig
} from '../types';

export abstract class BlockExplorerClient {
  constructor(protected config: BlockExplorerConfig) {}

  /**
   * Main verification method
   * Submit contract source code for verification
   */
  abstract verifyContract(
    request: SourceVerificationRequest
  ): Promise<SourceVerificationResult>;

  /**
   * Check verification status by GUID
   * Used for polling verification progress
   */
  abstract checkStatus(guid: string): Promise<SourceVerificationResult>;

  /**
   * Check if contract is already verified
   * Prevents unnecessary verification attempts
   */
  abstract isVerified(address: string): Promise<boolean>;

  /**
   * Get block explorer URL for contract
   */
  getExplorerUrl(address: string): string {
    const baseUrl = this.config.apiUrl.replace('/api', '');
    return `${baseUrl}/address/${address}#code`;
  }

  /**
   * Rate limiting - wait between requests
   * Prevents API rate limit errors
   * Public so it can be called by service layer
   */
  async rateLimit(): Promise<void> {
    const delayMs = (60 / this.config.rateLimit) * 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Extract contract name from path
   * "src/masters/ERC20Master.sol:ERC20Master" -> "ERC20Master"
   */
  protected extractContractName(contractPath: string): string {
    const parts = contractPath.split(':');
    if (parts.length > 1) {
      return parts[1];
    }
    return contractPath.split('/').pop()?.replace('.sol', '') || '';
  }

  /**
   * Extract file path from contract path
   * "src/masters/ERC20Master.sol:ERC20Master" -> "src/masters/ERC20Master.sol"
   */
  protected extractFilePath(contractPath: string): string {
    return contractPath.split(':')[0];
  }
}
