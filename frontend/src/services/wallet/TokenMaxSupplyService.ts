/**
 * Token Max Supply Service
 * Handles max supply updates with automatic nonce management
 * 
 * Pattern: Follows exact structure from TokenMintingService
 * Features:
 * - Automatic nonce management via NonceManager
 * - Nonce gap detection
 * - Transaction confirmation with retry logic
 * - Comprehensive error handling
 * - Diagnostic information (nonce, gas used, block number)
 */

import { ethers } from 'ethers';
import { nonceManager } from './NonceManager';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { internalWalletService } from './InternalWalletService';
import {
  getChainName,
  isTestnet,
} from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

export interface MaxSupplyParams {
  contractAddress: string;
  newMaxSupply: string; // "0" for unlimited, or amount in wei
  chainId: number;
  walletId: string;
  walletType: 'project' | 'user';
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number; // Optional for fee bumping
}

export interface MaxSupplyResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  diagnostics?: {
    nonce: number;
    gasUsed?: string;
    blockNumber?: number;
    previousMaxSupply: string;
    newMaxSupply: string;
    timestamp: number;
  };
}

export interface MaxSupplyValidationResult {
  valid: boolean;
  errors: string[];
}

export class TokenMaxSupplyService {
  private static instance: TokenMaxSupplyService;
  
  static getInstance(): TokenMaxSupplyService {
    if (!TokenMaxSupplyService.instance) {
      TokenMaxSupplyService.instance = new TokenMaxSupplyService();
    }
    return TokenMaxSupplyService.instance;
  }
  
  /**
   * Get provider from chainId
   * @private
   */
  private async getProviderFromChainId(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${chainId}`);
    }

    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);

    if (!rpcConfig) {
      throw new Error(`No RPC configuration for ${chainName} on ${networkType}`);
    }

    return new ethers.JsonRpcProvider(rpcConfig.url);
  }
  
  /**
   * Execute max supply update with automatic nonce management
   * PATTERN: Exact match with TokenMintingService.executeMint()
   */
  async executeUpdateMaxSupply(params: MaxSupplyParams): Promise<MaxSupplyResult> {
    try {
      // 1. Validate parameters
      const validation = await this.validateUpdate(params);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      
      if (!ethers.isAddress(params.contractAddress)) {
        throw new Error('Invalid contract address');
      }
      
      const newSupply = BigInt(params.newMaxSupply);
      if (newSupply < 0n) {
        throw new Error('Max supply cannot be negative');
      }
      
      // 2. Get provider
      const provider = await this.getProviderFromChainId(params.chainId);
      
      // 3. Get next nonce (or use forced nonce for replacement)
      const nonce = params.nonce !== undefined
        ? params.nonce
        : await nonceManager.getNextNonce(params.walletId, provider);
      
      // 4. Get private key
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(
          params.walletId
        );
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(
          params.walletId
        );
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // 5. Get current max supply for diagnostics
      const tokenContract = new ethers.Contract(
        params.contractAddress,
        ['function maxSupply() external view returns (uint256)'],
        provider
      );
      
      let previousMaxSupply: string;
      try {
        const currentSupply = await tokenContract.maxSupply();
        previousMaxSupply = currentSupply.toString();
      } catch (error) {
        console.warn('Could not fetch current max supply:', error);
        previousMaxSupply = 'unknown';
      }
      
      // 6. Create update max supply transaction
      const tokenInterface = new ethers.Interface([
        'function updateMaxSupply(uint256 newMaxSupply) external'
      ]);
      
      const data = tokenInterface.encodeFunctionData('updateMaxSupply', [
        newSupply
      ]);
      
      // 7. Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '150000',
      };
      
      // Add gas pricing (EIP-1559 or legacy)
      if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
        tx.maxFeePerGas = params.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
      } else {
        const feeData = await provider.getFeeData();
        if (feeData.maxFeePerGas) {
          tx.maxFeePerGas = feeData.maxFeePerGas;
          tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          tx.gasPrice = feeData.gasPrice;
        }
      }
      
      // 8. Sign and send
      console.log(`🔧 Updating max supply with nonce ${nonce}`);
      const signedTx = await wallet.signTransaction(tx);
      const txResponse = await provider.broadcastTransaction(signedTx);
      
      // 9. Wait for confirmation
      console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
      const receipt = await txResponse.wait(1);
      
      if (receipt.status === 0) {
        nonceManager.failNonce(wallet.address, nonce);
        throw new Error('Transaction reverted');
      }
      
      // 10. Mark nonce as confirmed
      nonceManager.confirmNonce(wallet.address, nonce);
      
      console.log(`✅ Max supply updated: Block ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: txResponse.hash,
        diagnostics: {
          nonce,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber,
          previousMaxSupply,
          newMaxSupply: params.newMaxSupply,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error('❌ Max supply update failed:', error);
      
      // Clear nonce tracking on error
      if (params.nonce === undefined) {
        try {
          nonceManager.clearNonceTracking(params.walletId);
        } catch (clearError) {
          console.error('Failed to clear nonce tracking:', clearError);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }
  
  /**
   * Validate max supply update parameters
   */
  async validateUpdate(params: MaxSupplyParams): Promise<MaxSupplyValidationResult> {
    const errors: string[] = [];
    
    // Validate contract address
    if (!params.contractAddress) {
      errors.push('Contract address is required');
    } else if (!ethers.isAddress(params.contractAddress)) {
      errors.push('Invalid contract address format');
    }
    
    // Validate new max supply
    if (!params.newMaxSupply) {
      errors.push('New max supply is required');
    } else {
      try {
        const supply = BigInt(params.newMaxSupply);
        if (supply < 0n) {
          errors.push('Max supply cannot be negative');
        }
      } catch (e) {
        errors.push('Invalid max supply format');
      }
    }
    
    // Validate chain ID
    if (!params.chainId) {
      errors.push('Chain ID is required');
    } else if (params.chainId <= 0) {
      errors.push('Invalid chain ID');
    }
    
    // Validate wallet ID
    if (!params.walletId) {
      errors.push('Wallet ID is required');
    }
    
    // Validate wallet type
    if (!params.walletType || !['project', 'user'].includes(params.walletType)) {
      errors.push('Invalid wallet type (must be "project" or "user")');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Diagnose nonce issues before update
   * PATTERN: Exact match with TokenMintingService.diagnoseNonceIssues()
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    status: any;
    recommendations: string[];
  }> {
    const provider = await this.getProviderFromChainId(chainId);
    const status = await nonceManager.getNonceStatus(address, provider);
    
    const recommendations: string[] = [];
    
    if (status.hasGap) {
      recommendations.push(
        `⚠️ ${status.gapSize} stuck transaction(s) detected`
      );
      recommendations.push(
        'Cancel stuck transactions before updating max supply'
      );
      recommendations.push(
        'Use nonce gap fixer script if needed'
      );
    } else {
      recommendations.push('✅ No nonce issues detected');
      recommendations.push('Safe to proceed with max supply update');
    }
    
    return {
      hasGap: status.hasGap,
      status,
      recommendations
    };
  }
  
  /**
   * Map chain ID to blockchain name
   * PATTERN: Matches TokenMintingService implementation
   */
  private getBlockchainFromChainId(chainId: number): string {
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      11155111: 'sepolia',
      17000: 'holesky',
      137: 'polygon',
      560048: 'hoodi',
      80001: 'mumbai',
      42161: 'arbitrum',
      10: 'optimism'
    };
    
    return chainMap[chainId] || 'ethereum';
  }
}

// Export singleton instance
export const tokenMaxSupplyService = TokenMaxSupplyService.getInstance();
