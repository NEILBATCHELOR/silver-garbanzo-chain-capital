/**
 * Token Burning Service - Multi-Standard Support
 * Handles token burning with automatic nonce management
 * Supports: ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626
 * Pattern: Exact match with TokenMintingService.ts for consistency
 */

import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { internalWalletService } from './InternalWalletService';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import {
  getChainName,
  getChainId,
  isTestnet,
  getChainInfo,
  type ChainInfo,
} from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Token Standards
export type TokenStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626';

// Burn Types
export interface BurnParams {
  contractAddress: string; // Token contract address
  fromAddress?: string; // Address burning tokens (optional, defaults to wallet address)
  amount: string; // Amount to burn (in token units) - for ERC-20, ERC-1155, ERC-3525
  decimals?: number; // Token decimals (default: 18)
  
  // Standard-specific parameters
  standard?: TokenStandard; // Optional: if known upfront
  tokenId?: string; // For ERC-721
  id?: string; // For ERC-1155
  slot?: string; // For ERC-3525
  partition?: string; // For ERC-1400
  data?: string; // For ERC-1155, ERC-1400
  
  chainId: number; // Chain ID from wallet data
  walletId: string; // Database ID of burner wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping)
}

export interface BurnResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: BurnDiagnostics;
}

export interface BurnDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number;
  chainId: number;
  nonce: number;
  standard?: TokenStandard;
  gasEstimate?: {
    gasLimit: string;
    gasPrice: string;
    estimatedCost: string;
  };
  balanceCheck?: {
    balance: string;
    totalCost: string;
    sufficient: boolean;
  };
  rpcVerification?: {
    verified: boolean;
    blockNumber?: number;
    latency?: number;
  };
  note?: string;
}

export class TokenBurningService {
  private static instance: TokenBurningService;

  private constructor() {}

  static getInstance(): TokenBurningService {
    if (!TokenBurningService.instance) {
      TokenBurningService.instance = new TokenBurningService();
    }
    return TokenBurningService.instance;
  }

  /**
   * Detect token standard via ERC-165
   * @private
   */
  private async detectStandard(
    contractAddress: string,
    provider: ethers.Provider
  ): Promise<TokenStandard> {
    const contract = new ethers.Contract(contractAddress, [
      'function supportsInterface(bytes4 interfaceId) view returns (bool)'
    ], provider);

    try {
      // ERC-165 interface IDs
      const ERC721_INTERFACE = '0x80ac58cd';
      const ERC1155_INTERFACE = '0xd9b67a26';
      const ERC3525_INTERFACE = '0xd5358140';

      if (await contract.supportsInterface(ERC721_INTERFACE)) {
        return 'ERC-721';
      }
      if (await contract.supportsInterface(ERC1155_INTERFACE)) {
        return 'ERC-1155';
      }
      if (await contract.supportsInterface(ERC3525_INTERFACE)) {
        return 'ERC-3525';
      }

      // Default to ERC-20 (most common)
      return 'ERC-20';
    } catch (error) {
      console.warn('Failed to detect standard, defaulting to ERC-20:', error);
      return 'ERC-20';
    }
  }

  /**
   * Get provider from chainId
   * @private
   */
  private async getProvider(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);
    
    if (!rpcConfig) {
      throw new Error(`No RPC configuration found for chain ${chainId}`);
    }
    
    return new ethers.JsonRpcProvider(rpcConfig.url);
  }

  /**
   * Helper: Get wallet credentials
   * @private
   */
  private async getWallet(
    walletId: string,
    walletType: 'project' | 'user',
    provider: ethers.JsonRpcProvider
  ): Promise<ethers.Wallet> {
    const privateKey = walletType === 'project'
      ? await internalWalletService.getProjectWalletPrivateKey(walletId)
      : await internalWalletService.getUserWalletPrivateKey(walletId);
    
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Helper: Add gas pricing to transaction
   * @private
   */
  private async addGasPricing(
    tx: any,
    params: BurnParams,
    provider: ethers.JsonRpcProvider
  ): Promise<void> {
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
  }

  /**
   * Helper: Execute transaction with nonce management
   * @private
   */
  private async executeTransaction(
    wallet: ethers.Wallet,
    tx: any,
    nonce: number,
    params: BurnParams,
    startTime: number
  ): Promise<BurnResult> {
    const signedTx = await wallet.signTransaction(tx);
    const txResponse = await wallet.provider!.broadcastTransaction(signedTx);

    console.log(`⏳ Waiting for confirmation: ${txResponse.hash}`);
    const receipt = await txResponse.wait(1);

    if (receipt.status === 0) {
      nonceManager.failNonce(wallet.address, nonce);
      throw new Error('Transaction reverted');
    }

    nonceManager.confirmNonce(wallet.address, nonce);
    console.log(`✅ Burn confirmed: Block ${receipt.blockNumber}`);

    return {
      success: true,
      transactionHash: txResponse.hash,
      diagnostics: {
        step: 'complete',
        timestamp: Date.now(),
        broadcastTimestamp: Date.now(),
        chainId: params.chainId,
        nonce,
        standard: params.standard,
        gasEstimate: {
          gasLimit: receipt.gasUsed.toString(),
          gasPrice: tx.gasPrice?.toString() || tx.maxFeePerGas?.toString() || '0',
          estimatedCost: ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || 0n))
        },
        rpcVerification: {
          verified: true,
          blockNumber: receipt.blockNumber,
          latency: Date.now() - startTime
        }
      }
    };
  }

  /**
   * Execute burn operation with automatic nonce management and standard detection
   */
  async executeBurn(params: BurnParams): Promise<BurnResult> {
    const startTime = Date.now();
    
    try {
      // 1. Detect standard if not provided
      const provider = await this.getProvider(params.chainId);
      const standard = params.standard || await this.detectStandard(params.contractAddress, provider);
      
      console.log(`🔥 Burning with standard: ${standard}`, {
        contractAddress: params.contractAddress,
        amount: params.amount,
        chainId: params.chainId
      });

      // Store standard in params for diagnostics
      params.standard = standard;

      // 2. Route to appropriate burn implementation
      switch (standard) {
        case 'ERC-20':
          return this.burnERC20(params, provider, startTime);
        case 'ERC-721':
          return this.burnERC721(params, provider, startTime);
        case 'ERC-1155':
          return this.burnERC1155(params, provider, startTime);
        case 'ERC-1400':
          return this.burnERC1400(params, provider, startTime);
        case 'ERC-3525':
          return this.burnERC3525(params, provider, startTime);
        case 'ERC-4626':
          return this.burnERC4626(params, provider, startTime);
        default:
          throw new Error(`Unsupported token standard: ${standard}`);
      }
    } catch (error) {
      console.error('🔥 Burn failed:', error);

      // Clear nonce tracking on error
      if (params.nonce === undefined) {
        const provider = await this.getProvider(params.chainId);
        const wallet = await this.getWallet(params.walletId, params.walletType, provider);
        nonceManager.clearNonceTracking(wallet.address);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Burn failed'
      };
    }
  }

  /**
   * ERC-20 Burn (Original implementation)
   * @private
   */
  private async burnERC20(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    // Validate parameters
    if (!ethers.isAddress(params.contractAddress)) {
      throw new Error('Invalid token contract address');
    }
    
    const amount = ethers.parseUnits(params.amount, params.decimals || 18);
    if (amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    // Get wallet
    const wallet = await this.getWallet(params.walletId, params.walletType, provider);

    // Get nonce
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-20 burn`);

    // Encode burn transaction
    const erc20Interface = new ethers.Interface([
      'function burn(uint256 amount)',
      'function burnFrom(address account, uint256 amount)'
    ]);

    let data: string;
    if (params.fromAddress && params.fromAddress !== wallet.address) {
      data = erc20Interface.encodeFunctionData('burnFrom', [params.fromAddress, amount]);
    } else {
      data = erc20Interface.encodeFunctionData('burn', [amount]);
    }

    // Build transaction
    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '100000',
    };

    await this.addGasPricing(tx, params, provider);

    // Execute
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * ERC-721 Burn (NFT)
   * @private
   */
  private async burnERC721(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    if (!params.tokenId) {
      throw new Error('tokenId required for ERC-721 burning');
    }

    const wallet = await this.getWallet(params.walletId, params.walletType, provider);
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-721 burn`);

    const erc721Interface = new ethers.Interface([
      'function burn(uint256 tokenId)'
    ]);

    const data = erc721Interface.encodeFunctionData('burn', [params.tokenId]);

    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '150000'
    };

    await this.addGasPricing(tx, params, provider);
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * ERC-1155 Burn (Multi-token)
   * @private
   */
  private async burnERC1155(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    if (!params.id) {
      throw new Error('id required for ERC-1155 burning');
    }

    const wallet = await this.getWallet(params.walletId, params.walletType, provider);
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-1155 burn`);

    const amount = ethers.parseUnits(params.amount, params.decimals || 18);
    const fromAddress = params.fromAddress || wallet.address;

    const erc1155Interface = new ethers.Interface([
      'function burn(address from, uint256 id, uint256 amount)'
    ]);

    const data = erc1155Interface.encodeFunctionData('burn', [
      fromAddress,
      params.id,
      amount
    ]);

    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '200000'
    };

    await this.addGasPricing(tx, params, provider);
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * ERC-1400 Burn (Security Token)
   * @private
   */
  private async burnERC1400(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    if (!params.partition) {
      throw new Error('partition required for ERC-1400 burning');
    }

    const wallet = await this.getWallet(params.walletId, params.walletType, provider);
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-1400 burn`);

    const amount = ethers.parseUnits(params.amount, params.decimals || 18);
    const partitionBytes32 = ethers.hexlify(
      ethers.toUtf8Bytes(params.partition).slice(0, 32)
    ).padEnd(66, '0');

    const erc1400Interface = new ethers.Interface([
      'function redeemByPartition(bytes32 partition, uint256 value, bytes data)'
    ]);

    const data = erc1400Interface.encodeFunctionData('redeemByPartition', [
      partitionBytes32,
      amount,
      params.data || '0x'
    ]);

    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '250000'
    };

    await this.addGasPricing(tx, params, provider);
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * ERC-3525 Burn (Semi-Fungible Token)
   * @private
   */
  private async burnERC3525(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    if (!params.slot && !params.tokenId) {
      throw new Error('slot or tokenId required for ERC-3525 burning');
    }

    const wallet = await this.getWallet(params.walletId, params.walletType, provider);
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-3525 burn`);

    const amount = ethers.parseUnits(params.amount, params.decimals || 18);

    const erc3525Interface = new ethers.Interface([
      'function burn(uint256 tokenId, uint256 amount)'
    ]);

    const data = erc3525Interface.encodeFunctionData('burn', [
      params.tokenId || params.slot!,
      amount
    ]);

    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '200000'
    };

    await this.addGasPricing(tx, params, provider);
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * ERC-4626 Withdraw (Vault Share Burn)
   * @private
   */
  private async burnERC4626(
    params: BurnParams,
    provider: ethers.JsonRpcProvider,
    startTime: number
  ): Promise<BurnResult> {
    const wallet = await this.getWallet(params.walletId, params.walletType, provider);
    const nonce = params.nonce !== undefined
      ? params.nonce
      : await nonceManager.getNextNonce(wallet.address, provider);

    console.log(`🔢 Using nonce ${nonce} for ERC-4626 withdraw`);

    const shares = ethers.parseUnits(params.amount, params.decimals || 18);
    const receiver = params.fromAddress || wallet.address;

    const erc4626Interface = new ethers.Interface([
      'function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)'
    ]);

    const data = erc4626Interface.encodeFunctionData('withdraw', [
      shares,
      receiver,
      wallet.address
    ]);

    const tx: any = {
      to: params.contractAddress,
      data,
      chainId: params.chainId,
      nonce,
      gasLimit: params.gasLimit || '200000'
    };

    await this.addGasPricing(tx, params, provider);
    return this.executeTransaction(wallet, tx, nonce, params, startTime);
  }

  /**
   * Diagnose nonce issues before batch burning
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    recommendations: string[];
  }> {
    const provider = await this.getProvider(chainId);
    const status = await nonceManager.getNonceStatus(address, provider);

    const recommendations: string[] = [];

    if (status.hasGap) {
      recommendations.push(`⚠️ ${status.gapSize} stuck transaction(s) detected`);
      recommendations.push('Cancel stuck transactions before batch burning');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const tokenBurningService = TokenBurningService.getInstance();
