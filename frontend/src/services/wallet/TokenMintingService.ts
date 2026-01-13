/**
 * Token Minting Service - Multi-Standard Support
 * Handles minting for ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626
 * With automatic nonce management and standard detection
 * 
 * IMPORTANT: Backward compatible - ERC-20 works as before
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
export type TokenStandard = 
  | 'ERC-20'   // Fungible tokens
  | 'ERC-721'  // Non-fungible tokens (NFTs)
  | 'ERC-1155' // Multi-token standard
  | 'ERC-1400' // Security tokens
  | 'ERC-3525' // Semi-fungible tokens
  | 'ERC-4626' // Tokenized vaults
  | 'UNKNOWN'; // Unable to detect

// Mint Types
export interface MintParams {
  contractAddress: string; // Token contract address
  toAddress: string; // Recipient address
  amount: string; // Amount to mint (in token units for ERC-20/1155/3525/4626)
  decimals?: number; // Token decimals (default: 18)
  chainId: number; // Chain ID from wallet data
  walletId: string; // Database ID of minter wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  
  // Standard-specific parameters
  standard?: TokenStandard; // Optional: if known upfront (auto-detected if not provided)
  tokenId?: string; // For ERC-721
  id?: string; // For ERC-1155
  slot?: string; // For ERC-3525
  partition?: string; // For ERC-1400
  data?: string; // For ERC-1155, ERC-1400 (hex string)
  
  // Gas parameters
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping)
}

export interface MintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedStandard?: TokenStandard;
}

export interface MintGasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string;
  estimatedCost: string; // In native token
  estimatedCostUSD?: string;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: MintDiagnostics;
}

export interface MintDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number;
  chainId: number;
  nonce: number;
  standard?: TokenStandard; // Which standard was used
  gasEstimate?: MintGasEstimate;
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
  mempoolVerification?: {
    found: boolean;
    timestamp?: number;
  };
  note?: string;
}

export class TokenMintingService {
  private static instance: TokenMintingService;

  private constructor() {}

  static getInstance(): TokenMintingService {
    if (!TokenMintingService.instance) {
      TokenMintingService.instance = new TokenMintingService();
    }
    return TokenMintingService.instance;
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
   * Detect token standard by querying contract
   * Uses ERC-165 supportsInterface when available
   * Falls back to ERC-20 if unable to detect
   * @private
   */
  private async detectStandard(
    contractAddress: string,
    provider: ethers.JsonRpcProvider
  ): Promise<TokenStandard> {
    try {
      const contract = new ethers.Contract(
        contractAddress,
        ['function supportsInterface(bytes4 interfaceId) view returns (bool)'],
        provider
      );

      // ERC-165 interface IDs
      const ERC721_INTERFACE = '0x80ac58cd';
      const ERC1155_INTERFACE = '0xd9b67a26';
      const ERC3525_INTERFACE = '0xd5358140';
      const ERC1400_INTERFACE = '0x'; // TODO: Add ERC-1400 interface ID if available
      const ERC4626_INTERFACE = '0x'; // TODO: Add ERC-4626 interface ID if available

      // Check ERC-721
      try {
        if (await contract.supportsInterface(ERC721_INTERFACE)) {
          console.log('✅ Detected standard: ERC-721');
          return 'ERC-721';
        }
      } catch (e) {
        // Continue checking
      }

      // Check ERC-1155
      try {
        if (await contract.supportsInterface(ERC1155_INTERFACE)) {
          console.log('✅ Detected standard: ERC-1155');
          return 'ERC-1155';
        }
      } catch (e) {
        // Continue checking
      }

      // Check ERC-3525
      try {
        if (await contract.supportsInterface(ERC3525_INTERFACE)) {
          console.log('✅ Detected standard: ERC-3525');
          return 'ERC-3525';
        }
      } catch (e) {
        // Continue checking
      }

      // Default to ERC-20 (most common, doesn't require ERC-165)
      console.log('ℹ️ Using default standard: ERC-20');
      return 'ERC-20';
    } catch (error) {
      console.warn('⚠️ Failed to detect standard, defaulting to ERC-20:', error);
      return 'ERC-20';
    }
  }

  /**
   * Get next available nonce with gap detection
   * @private
   */
  private async getNextNonce(
    address: string,
    provider: ethers.JsonRpcProvider,
    forceNonce?: number
  ): Promise<number> {
    return await nonceManager.getNextNonce(address, provider, {
      forceNonce,
      allowGaps: false, // Never allow gaps
    });
  }

  /**
   * Clear nonce tracking for an address
   * @private
   */
  private clearNonceTracking(address: string): void {
    nonceManager.clearNonceTracking(address);
  }

  /**
   * Diagnose nonce issues for an address
   * PUBLIC method for troubleshooting
   * @public
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    status: any;
    recommendations: string[];
  }> {
    try {
      const provider = await this.getProviderFromChainId(chainId);
      const validation = await nonceManager.getNonceStatus(address, provider);

      const recommendations: string[] = [];

      if (validation.hasGap) {
        recommendations.push(
          `⚠️ Nonce gap detected: ${validation.gapSize} transaction(s) stuck`
        );
        recommendations.push('Recommended: Cancel stuck transactions before batch minting');
        recommendations.push('Option 1: Wait for transactions to confirm');
        recommendations.push('Option 2: Use fee bumping to replace stuck transactions');
      } else {
        recommendations.push('✅ No nonce issues detected');
        recommendations.push('Safe to proceed with minting');
      }

      return {
        hasGap: validation.hasGap,
        status: validation,
        recommendations,
      };
    } catch (error) {
      console.error('Error diagnosing nonce issues:', error);
      throw error;
    }
  }

  /**
   * Validate mint parameters
   * @public
   */
  async validateMint(params: MintParams): Promise<MintValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate contract address
    if (!ethers.isAddress(params.contractAddress)) {
      errors.push('Invalid token contract address');
    }

    // Validate recipient address
    if (!ethers.isAddress(params.toAddress)) {
      errors.push('Invalid recipient address');
    }

    // Validate chain ID
    const chainName = getChainName(params.chainId);
    if (!chainName) {
      errors.push(`Invalid chain ID: ${params.chainId}`);
    }

    // Standard-specific validation
    const standard = params.standard || 'ERC-20'; // Default if not provided

    switch (standard) {
      case 'ERC-20':
      case 'ERC-1155':
      case 'ERC-3525':
      case 'ERC-4626':
        // Validate amount
        try {
          const decimals = params.decimals || 18;
          const amount = ethers.parseUnits(params.amount, decimals);
          if (amount <= 0n) {
            errors.push('Amount must be greater than 0');
          }
        } catch (error) {
          errors.push('Invalid amount format');
        }
        break;

      case 'ERC-721':
        // ERC-721 requires tokenId
        if (!params.tokenId) {
          errors.push('tokenId required for ERC-721 minting');
        }
        break;
    }

    // Standard-specific parameter checks
    if (standard === 'ERC-1155' && !params.id) {
      errors.push('id required for ERC-1155 minting');
    }

    if (standard === 'ERC-3525' && !params.slot) {
      errors.push('slot required for ERC-3525 minting');
    }

    if (standard === 'ERC-1400' && !params.partition) {
      errors.push('partition required for ERC-1400 minting');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      detectedStandard: standard,
    };
  }

  /**
   * Execute mint operation with automatic standard detection and nonce management
   * CRITICAL: Maintains backward compatibility - ERC-20 works exactly as before
   * @public
   */
  async executeMint(params: MintParams): Promise<MintResult> {
    const diagnostics: MintDiagnostics = {
      step: 'Initializing',
      timestamp: Date.now(),
      chainId: params.chainId,
      nonce: -1,
    };

    try {
      // 1. Validate parameters
      diagnostics.step = 'Validating parameters';
      const validation = await this.validateMint(params);

      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          diagnostics,
        };
      }

      // 2. Get provider
      diagnostics.step = 'Getting RPC provider';
      const provider = await this.getProviderFromChainId(params.chainId);

      // 3. Detect standard if not provided
      diagnostics.step = 'Detecting token standard';
      const standard =
        params.standard || (await this.detectStandard(params.contractAddress, provider));

      diagnostics.standard = standard;
      console.log(`🔍 Using token standard: ${standard}`);

      // 4. Route to appropriate mint implementation
      diagnostics.step = `Executing ${standard} mint`;
      
      switch (standard) {
        case 'ERC-20':
          return await this.mintERC20(params, provider, diagnostics);
        
        case 'ERC-721':
          return await this.mintERC721(params, provider, diagnostics);
        
        case 'ERC-1155':
          return await this.mintERC1155(params, provider, diagnostics);
        
        case 'ERC-1400':
          return await this.mintERC1400(params, provider, diagnostics);
        
        case 'ERC-3525':
          return await this.mintERC3525(params, provider, diagnostics);
        
        case 'ERC-4626':
          return await this.mintERC4626(params, provider, diagnostics);
        
        default:
          return {
            success: false,
            error: `Unsupported token standard: ${standard}`,
            diagnostics,
          };
      }
    } catch (error) {
      console.error('❌ Mint execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        diagnostics,
      };
    }
  }

  /**
   * ERC-20 Mint (Fungible Tokens)
   * ORIGINAL IMPLEMENTATION - Preserved for backward compatibility
   * @private
   */
  private async mintERC20(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    try {
      // Get private key
      diagnostics.step = 'Retrieving wallet credentials';
      let privateKey: string;
      if (params.walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(params.walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(params.walletId);
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      const minterAddress = wallet.address;

      // Get next nonce
      diagnostics.step = 'Getting next nonce';
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(minterAddress, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting ERC-20 with nonce ${nonce} from ${minterAddress}`);

      // Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // Create mint transaction
      diagnostics.step = 'Building ERC-20 mint transaction';

      // ERC-20 mint function interface
      const erc20Interface = new ethers.Interface([
        'function mint(address to, uint256 amount) returns (bool)',
      ]);

      const data = erc20Interface.encodeFunctionData('mint', [params.toAddress, amount]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '100000',
      };

      // Add gas pricing
      await this.addGasPricing(tx, params, provider, diagnostics);

      // Sign and broadcast
      diagnostics.step = 'Signing and broadcasting ERC-20 transaction';
      const signedTx = await wallet.signTransaction(tx);
      
      diagnostics.broadcastTimestamp = Date.now();
      const txResponse = await provider.broadcastTransaction(signedTx);
      
      console.log(`📡 ERC-20 transaction broadcast: ${txResponse.hash}`);

      // Verify in mempool
      diagnostics.step = 'Verifying transaction in mempool';
      try {
        const mempoolTx = await provider.getTransaction(txResponse.hash);
        if (mempoolTx) {
          diagnostics.mempoolVerification = {
            found: true,
            timestamp: Date.now(),
          };
          console.log('✅ Transaction verified in mempool');
        }
      } catch (e) {
        console.warn('⚠️ Could not verify in mempool (may be slow network)');
      }

      // Wait for confirmation
      diagnostics.step = 'Waiting for ERC-20 confirmation';
      console.log(`⏳ Waiting for confirmation of ${txResponse.hash}`);
      
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(minterAddress, nonce);
        throw new Error('Transaction reverted');
      }

      // Mark nonce as confirmed
      nonceManager.confirmNonce(minterAddress, nonce);

      diagnostics.step = 'Complete';
      diagnostics.rpcVerification = {
        verified: true,
        blockNumber: receipt.blockNumber,
        latency: Date.now() - diagnostics.broadcastTimestamp!,
      };

      console.log(`✅ ERC-20 mint confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        receipt,
        diagnostics,
      };
    } catch (error) {
      console.error('❌ ERC-20 mint failed:', error);
      throw error;
    }
  }

  /**
   * ERC-721 Mint (Non-Fungible Tokens / NFTs)
   * @private
   */
  private async mintERC721(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    if (!params.tokenId) {
      return {
        success: false,
        error: 'tokenId required for ERC-721 minting',
        diagnostics,
      };
    }

    try {
      // Get wallet
      const wallet = await this.getWallet(params.walletId, params.walletType, provider);
      
      // Get nonce
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(wallet.address, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting ERC-721 tokenId ${params.tokenId} with nonce ${nonce}`);

      // Encode ERC-721 mint function
      const erc721Interface = new ethers.Interface([
        'function mint(address to, uint256 tokenId)',
      ]);

      const data = erc721Interface.encodeFunctionData('mint', [
        params.toAddress,
        params.tokenId,
      ]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '200000', // Higher for NFTs
      };

      await this.addGasPricing(tx, params, provider, diagnostics);

      // Execute transaction
      return await this.executeTransaction(tx, wallet.signer, diagnostics);
    } catch (error) {
      console.error('❌ ERC-721 mint failed:', error);
      throw error;
    }
  }

  /**
   * ERC-1155 Mint (Multi-Token Standard)
   * @private
   */
  private async mintERC1155(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    if (!params.id) {
      return {
        success: false,
        error: 'id required for ERC-1155 minting',
        diagnostics,
      };
    }

    try {
      // Get wallet
      const wallet = await this.getWallet(params.walletId, params.walletType, provider);
      
      // Get nonce
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(wallet.address, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting ERC-1155 id ${params.id} with nonce ${nonce}`);

      // Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // Encode ERC-1155 mint function
      const erc1155Interface = new ethers.Interface([
        'function mint(address to, uint256 id, uint256 amount, bytes data)',
      ]);

      const data = erc1155Interface.encodeFunctionData('mint', [
        params.toAddress,
        params.id,
        amount,
        params.data || '0x', // Empty data if not provided
      ]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '250000', // Higher for 1155
      };

      await this.addGasPricing(tx, params, provider, diagnostics);

      // Execute transaction
      return await this.executeTransaction(tx, wallet.signer, diagnostics);
    } catch (error) {
      console.error('❌ ERC-1155 mint failed:', error);
      throw error;
    }
  }

  /**
   * ERC-1400 Mint (Security Tokens)
   * @private
   */
  private async mintERC1400(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    if (!params.partition) {
      return {
        success: false,
        error: 'partition required for ERC-1400 minting',
        diagnostics,
      };
    }

    try {
      // Get wallet
      const wallet = await this.getWallet(params.walletId, params.walletType, provider);
      
      // Get nonce
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(wallet.address, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting ERC-1400 partition ${params.partition} with nonce ${nonce}`);

      // Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // Convert partition to bytes32
      const partitionBytes32 = ethers.zeroPadValue(
        ethers.toUtf8Bytes(params.partition),
        32
      );

      // Encode ERC-1400 issueByPartition function
      const erc1400Interface = new ethers.Interface([
        'function issueByPartition(bytes32 partition, address to, uint256 value, bytes data)',
      ]);

      const data = erc1400Interface.encodeFunctionData('issueByPartition', [
        partitionBytes32,
        params.toAddress,
        amount,
        params.data || '0x',
      ]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '300000', // Higher for security tokens
      };

      await this.addGasPricing(tx, params, provider, diagnostics);

      // Execute transaction
      return await this.executeTransaction(tx, wallet.signer, diagnostics);
    } catch (error) {
      console.error('❌ ERC-1400 mint failed:', error);
      throw error;
    }
  }

  /**
   * ERC-3525 Mint (Semi-Fungible Tokens)
   * @private
   */
  private async mintERC3525(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    if (!params.slot) {
      return {
        success: false,
        error: 'slot required for ERC-3525 minting',
        diagnostics,
      };
    }

    try {
      // Get wallet
      const wallet = await this.getWallet(params.walletId, params.walletType, provider);
      
      // Get nonce
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(wallet.address, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Minting ERC-3525 slot ${params.slot} with nonce ${nonce}`);

      // Parse amount
      const decimals = params.decimals || 18;
      const amount = ethers.parseUnits(params.amount, decimals);

      // Encode ERC-3525 mint function
      const erc3525Interface = new ethers.Interface([
        'function mint(address to, uint256 slot, uint256 amount)',
      ]);

      const data = erc3525Interface.encodeFunctionData('mint', [
        params.toAddress,
        params.slot,
        amount,
      ]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '250000',
      };

      await this.addGasPricing(tx, params, provider, diagnostics);

      // Execute transaction
      return await this.executeTransaction(tx, wallet.signer, diagnostics);
    } catch (error) {
      console.error('❌ ERC-3525 mint failed:', error);
      throw error;
    }
  }

  /**
   * ERC-4626 Deposit (Tokenized Vault Shares)
   * Note: ERC-4626 uses "deposit" not "mint"
   * @private
   */
  private async mintERC4626(
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    try {
      // Get wallet
      const wallet = await this.getWallet(params.walletId, params.walletType, provider);
      
      // Get nonce
      const nonce =
        params.nonce !== undefined
          ? params.nonce
          : await this.getNextNonce(wallet.address, provider);

      diagnostics.nonce = nonce;
      console.log(`🔑 Depositing ERC-4626 with nonce ${nonce}`);

      // Parse assets amount
      const decimals = params.decimals || 18;
      const assets = ethers.parseUnits(params.amount, decimals);

      // Encode ERC-4626 deposit function
      const erc4626Interface = new ethers.Interface([
        'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
      ]);

      const data = erc4626Interface.encodeFunctionData('deposit', [
        assets,
        params.toAddress,
      ]);

      // Build transaction
      const tx: any = {
        to: params.contractAddress,
        data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || '200000',
      };

      await this.addGasPricing(tx, params, provider, diagnostics);

      // Execute transaction
      return await this.executeTransaction(tx, wallet.signer, diagnostics);
    } catch (error) {
      console.error('❌ ERC-4626 deposit failed:', error);
      throw error;
    }
  }

  /**
   * Helper: Get wallet credentials and signer
   * @private
   */
  private async getWallet(
    walletId: string,
    walletType: 'project' | 'user',
    provider: ethers.JsonRpcProvider
  ): Promise<{
    address: string;
    privateKey: string;
    signer: ethers.Wallet;
  }> {
    let privateKey: string;

    if (walletType === 'project') {
      privateKey = await internalWalletService.getProjectWalletPrivateKey(walletId);
    } else {
      privateKey = await internalWalletService.getUserWalletPrivateKey(walletId);
    }

    const wallet = new ethers.Wallet(privateKey, provider);

    return {
      address: wallet.address,
      privateKey,
      signer: wallet,
    };
  }

  /**
   * Helper: Add gas pricing to transaction
   * @private
   */
  private async addGasPricing(
    tx: any,
    params: MintParams,
    provider: ethers.JsonRpcProvider,
    diagnostics: MintDiagnostics
  ): Promise<void> {
    if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
      // EIP-1559
      tx.maxFeePerGas = params.maxFeePerGas;
      tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
      diagnostics.gasEstimate = {
        gasLimit: tx.gasLimit,
        gasPrice: '0',
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        estimatedCost: ethers.formatEther(
          BigInt(tx.gasLimit) * BigInt(params.maxFeePerGas)
        ),
      };
    } else if (params.gasPrice) {
      // Legacy
      tx.gasPrice = params.gasPrice;
      diagnostics.gasEstimate = {
        gasLimit: tx.gasLimit,
        gasPrice: params.gasPrice,
        estimatedCost: ethers.formatEther(BigInt(tx.gasLimit) * BigInt(params.gasPrice)),
      };
    } else {
      // Get fee data from network
      const feeData = await provider.getFeeData();
      if (feeData.maxFeePerGas) {
        tx.maxFeePerGas = feeData.maxFeePerGas;
        tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        diagnostics.gasEstimate = {
          gasLimit: tx.gasLimit,
          gasPrice: '0',
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
          estimatedCost: ethers.formatEther(
            BigInt(tx.gasLimit) * feeData.maxFeePerGas
          ),
        };
      } else {
        tx.gasPrice = feeData.gasPrice;
        diagnostics.gasEstimate = {
          gasLimit: tx.gasLimit,
          gasPrice: feeData.gasPrice?.toString() || '0',
          estimatedCost: ethers.formatEther(
            BigInt(tx.gasLimit) * (feeData.gasPrice || 0n)
          ),
        };
      }
    }
  }

  /**
   * Helper: Execute transaction with full lifecycle tracking
   * @private
   */
  private async executeTransaction(
    tx: any,
    signer: ethers.Wallet,
    diagnostics: MintDiagnostics
  ): Promise<MintResult> {
    try {
      // Sign and broadcast
      diagnostics.step = 'Signing and broadcasting transaction';
      const signedTx = await signer.signTransaction(tx);
      
      diagnostics.broadcastTimestamp = Date.now();
      const txResponse = await signer.provider!.broadcastTransaction(signedTx);
      
      console.log(`📡 Transaction broadcast: ${txResponse.hash}`);

      // Verify in mempool
      diagnostics.step = 'Verifying transaction in mempool';
      try {
        const mempoolTx = await signer.provider!.getTransaction(txResponse.hash);
        if (mempoolTx) {
          diagnostics.mempoolVerification = {
            found: true,
            timestamp: Date.now(),
          };
          console.log('✅ Transaction verified in mempool');
        }
      } catch (e) {
        console.warn('⚠️ Could not verify in mempool');
      }

      // Wait for confirmation
      diagnostics.step = 'Waiting for confirmation';
      console.log(`⏳ Waiting for confirmation of ${txResponse.hash}`);
      
      const receipt = await txResponse.wait(1);

      if (receipt.status === 0) {
        nonceManager.failNonce(signer.address, tx.nonce);
        throw new Error('Transaction reverted');
      }

      // Mark nonce as confirmed
      nonceManager.confirmNonce(signer.address, tx.nonce);

      diagnostics.step = 'Complete';
      diagnostics.rpcVerification = {
        verified: true,
        blockNumber: receipt.blockNumber,
        latency: Date.now() - diagnostics.broadcastTimestamp!,
      };

      console.log(`✅ Mint confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txResponse.hash,
        receipt,
        diagnostics,
      };
    } catch (error) {
      console.error('❌ Transaction execution failed:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a mint operation
   * @public
   */
  async estimateGas(params: MintParams): Promise<MintGasEstimate> {
    try {
      const provider = await this.getProviderFromChainId(params.chainId);

      // Get fee data
      const feeData = await provider.getFeeData();

      // Default gas limit based on standard
      const standard = params.standard || 'ERC-20';
      let gasLimit = '100000'; // ERC-20 default

      switch (standard) {
        case 'ERC-721':
          gasLimit = '200000';
          break;
        case 'ERC-1155':
        case 'ERC-3525':
          gasLimit = '250000';
          break;
        case 'ERC-1400':
          gasLimit = '300000';
          break;
      }

      if (feeData.maxFeePerGas) {
        // EIP-1559
        return {
          gasLimit,
          gasPrice: '0',
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
          baseFeePerGas: feeData.gasPrice?.toString(),
          estimatedCost: ethers.formatEther(BigInt(gasLimit) * feeData.maxFeePerGas),
        };
      } else {
        // Legacy
        return {
          gasLimit,
          gasPrice: feeData.gasPrice?.toString() || '0',
          estimatedCost: ethers.formatEther(BigInt(gasLimit) * (feeData.gasPrice || 0n)),
        };
      }
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }
}

export const tokenMintingService = TokenMintingService.getInstance();
