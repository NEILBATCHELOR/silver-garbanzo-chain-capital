import { ethers } from 'ethers';
import { supabase } from '@/infrastructure/database/client';
import { internalWalletService } from './InternalWalletService';
import { universalTransactionBuilder } from './builders/TransactionBuilder';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import { nonceManager } from './NonceManager';
import { 
  getChainName, 
  getChainId, 
  isTestnet,
  getChainInfo,
  type ChainInfo 
} from '@/infrastructure/web3/utils/chainIds';
import type { NetworkType } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

// Token Standards
export type TokenStandard = 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'ERC-1400' | 'ERC-3525' | 'ERC-4626' | 'NATIVE';

// Transfer Types
export interface TransferParams {
  from: string; // Wallet address
  to: string; // Destination address
  amount: string; // Amount to transfer (in token units)
  token?: string; // Token address (undefined = native token)
  
  // Standard-specific parameters
  standard?: TokenStandard; // Optional: if known upfront
  tokenId?: string; // For ERC-721
  id?: string; // For ERC-1155
  slot?: string; // For ERC-3525
  partition?: string; // For ERC-1400
  data?: string; // For ERC-1155, ERC-1400
  decimals?: number; // Token decimals (default: 18)
  
  chainId: number; // Chain ID from wallet data (source of truth)
  walletId: string; // Database ID of source wallet
  walletType: 'project' | 'user'; // Wallet type for key retrieval
  gasLimit?: string; // Optional gas limit override
  gasPrice?: string; // Optional gas price override
  maxFeePerGas?: string; // Optional EIP-1559
  maxPriorityFeePerGas?: string; // Optional EIP-1559
  nonce?: number; // Optional nonce override (for fee bumping - replaces stuck transactions)
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  baseFeePerGas?: string; // EIP-1559 base fee (read-only, set by protocol)
  estimatedCost: string; // In native token
  estimatedCostUSD?: string;
}

export interface UnsignedTransaction {
  from?: string; // Sender address (for nonce tracking)
  to: string;
  value: string;
  data: string;
  chainId: number;
  nonce: number;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipt?: any;
  diagnostics?: TransactionDiagnostics;
}

export interface TransactionDiagnostics {
  step: string;
  timestamp: number;
  broadcastTimestamp?: number; // When transaction was broadcast to network
  chainId: number;
  nonce: number;
  standard?: TokenStandard;
  gasEstimate?: GasEstimate;
  balanceCheck?: {
    balance: string;
    amount: string;
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
  note?: string; // Optional descriptive note about transaction status
}

export class TransferService {
  private static instance: TransferService;

  private constructor() {}

  static getInstance(): TransferService {
    if (!TransferService.instance) {
      TransferService.instance = new TransferService();
    }
    return TransferService.instance;
  }

  /**
   * Detect token standard via ERC-165
   * @private
   */
  private async detectStandard(
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<TokenStandard> {
    const contract = new ethers.Contract(tokenAddress, [
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

      // Default to ERC-20 (most common fungible token)
      return 'ERC-20';
    } catch (error) {
      console.warn('Failed to detect standard, defaulting to ERC-20:', error);
      return 'ERC-20';
    }
  }

  /**
   * Get provider from chain ID
   * Uses RPC manager to get correct provider configuration
   */
  private async getProviderFromChainId(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chainName = getChainName(chainId);
    const networkType: NetworkType = isTestnet(chainId) ? 'testnet' : 'mainnet';
    
    const rpcConfig = rpcManager.getProviderConfig(chainName as any, networkType);
    
    if (!rpcConfig) {
      throw new Error(`No RPC configuration found for chain ${chainId}`);
    }
    
    return new ethers.JsonRpcProvider(rpcConfig.url);
  }

  /**
   * Get next nonce for an address
   * Uses NonceManager for centralized nonce tracking
   */
  private async getNextNonce(
    address: string,
    provider: ethers.JsonRpcProvider
  ): Promise<number> {
    return nonceManager.getNextNonce(address, provider);
  }

  /**
   * Clear nonce tracking for an address
   */
  private clearNonceTracking(address: string): void {
    nonceManager.clearNonceTracking(address);
  }

  /**
   * Validate transfer parameters
   * Checks addresses, amounts, and chain configuration
   */
  async validateTransfer(params: TransferParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate addresses
      if (!ethers.isAddress(params.from)) {
        errors.push('Invalid from address');
      }
      if (!ethers.isAddress(params.to)) {
        errors.push('Invalid to address');
      }
      if (params.token && !ethers.isAddress(params.token)) {
        errors.push('Invalid token address');
      }

      // Validate amount
      try {
        const amount = params.token 
          ? ethers.parseUnits(params.amount, params.decimals || 18)
          : ethers.parseEther(params.amount);
        
        if (amount <= 0n) {
          errors.push('Amount must be greater than 0');
        }
      } catch (e) {
        errors.push('Invalid amount format');
      }

      // Validate chain ID
      const chainInfo = getChainInfo(params.chainId);
      if (!chainInfo) {
        errors.push(`Unknown chain ID: ${params.chainId}`);
      }

      // Check if provider is available
      try {
        await this.getProviderFromChainId(params.chainId);
      } catch (e) {
        errors.push(`No RPC provider available for chain ${params.chainId}`);
      }

      // Standard-specific validation
      if (params.standard === 'ERC-721' && !params.tokenId) {
        errors.push('tokenId required for ERC-721 transfers');
      }
      if (params.standard === 'ERC-1155' && !params.id) {
        errors.push('id required for ERC-1155 transfers');
      }
      if (params.standard === 'ERC-1400' && !params.partition) {
        errors.push('partition required for ERC-1400 transfers');
      }
      if (params.standard === 'ERC-3525' && !params.slot) {
        errors.push('slot required for ERC-3525 transfers');
      }

      // Testnet warning
      if (chainInfo?.type === 'testnet') {
        warnings.push(`Using testnet: ${chainInfo.name}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(
        `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Estimate gas for transfer
   * Includes safety buffers for EIP-1559 and legacy transactions
   */
  async estimateGas(params: TransferParams): Promise<GasEstimate> {
    try {
      const provider = await this.getProviderFromChainId(params.chainId);

      // Standard-specific gas limits
      let baseGasLimit = 21000n; // Native transfer
      
      if (params.token) {
        switch (params.standard || 'ERC-20') {
          case 'ERC-20':
          case 'ERC-4626':
            baseGasLimit = 65000n; // ERC-20 transfer
            break;
          case 'ERC-721':
            baseGasLimit = 150000n; // NFT transfer (safeTransferFrom)
            break;
          case 'ERC-1155':
            baseGasLimit = 200000n; // Multi-token transfer
            break;
          case 'ERC-1400':
            baseGasLimit = 250000n; // Security token with compliance
            break;
          case 'ERC-3525':
            baseGasLimit = 180000n; // Semi-fungible token
            break;
        }
      }

      // Add 10% buffer for safety
      const gasLimit = (baseGasLimit * 110n) / 100n;

      // Get gas pricing
      const feeData = await provider.getFeeData();
      
      let estimatedCost: bigint;
      let gasPrice: string | undefined;
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559: Add buffer for volatility
        const chainInfo = getChainInfo(params.chainId);
        const isTestnetChain = chainInfo?.type === 'testnet';
        const feeBuffer = isTestnetChain ? 150n : 125n; // 50% for testnet, 25% for mainnet
        
        maxFeePerGas = ((feeData.maxFeePerGas * feeBuffer) / 100n).toString();
        maxPriorityFeePerGas = ((feeData.maxPriorityFeePerGas * feeBuffer) / 100n).toString();
        estimatedCost = gasLimit * ((feeData.maxFeePerGas * feeBuffer) / 100n);
        
        console.log(
          `⛽ Gas estimate (EIP-1559 with ${feeBuffer-100n}% buffer): ` +
          `Limit=${gasLimit}, MaxFee=${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei`
        );
      } else if (feeData.gasPrice) {
        // Legacy: Add 10% buffer
        gasPrice = ((feeData.gasPrice * 110n) / 100n).toString();
        estimatedCost = gasLimit * ((feeData.gasPrice * 110n) / 100n);
        
        console.log(
          `⛽ Gas estimate (Legacy with 10% buffer): ` +
          `Limit=${gasLimit}, Price=${ethers.formatUnits(gasPrice, 'gwei')} gwei`
        );
      } else {
        throw new Error('Could not retrieve gas price data from network');
      }

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice || '',
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost: ethers.formatEther(estimatedCost)
      };
    } catch (error) {
      console.error('❌ Gas estimation error:', error);
      throw new Error(
        `Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create transfer data based on token standard
   * @private
   */
  private createTransferData(params: TransferParams, standard: TokenStandard): {
    to: string;
    value: string;
    data: string;
  } {
    // Native token transfer
    if (standard === 'NATIVE' || !params.token) {
      return {
        to: params.to,
        value: ethers.parseEther(params.amount).toString(),
        data: '0x'
      };
    }

    // Token transfers - value is always 0, function call in data
    const amount = ethers.parseUnits(params.amount, params.decimals || 18);

    switch (standard) {
      case 'ERC-20':
      case 'ERC-4626': {
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 amount) returns (bool)'
        ]);
        return {
          to: params.token,
          value: '0',
          data: erc20Interface.encodeFunctionData('transfer', [params.to, amount])
        };
      }

      case 'ERC-721': {
        if (!params.tokenId) {
          throw new Error('tokenId required for ERC-721 transfer');
        }
        const erc721Interface = new ethers.Interface([
          'function safeTransferFrom(address from, address to, uint256 tokenId)'
        ]);
        return {
          to: params.token,
          value: '0',
          data: erc721Interface.encodeFunctionData('safeTransferFrom', [
            params.from,
            params.to,
            params.tokenId
          ])
        };
      }

      case 'ERC-1155': {
        if (!params.id) {
          throw new Error('id required for ERC-1155 transfer');
        }
        const erc1155Interface = new ethers.Interface([
          'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)'
        ]);
        return {
          to: params.token,
          value: '0',
          data: erc1155Interface.encodeFunctionData('safeTransferFrom', [
            params.from,
            params.to,
            params.id,
            amount,
            params.data || '0x'
          ])
        };
      }

      case 'ERC-1400': {
        if (!params.partition) {
          throw new Error('partition required for ERC-1400 transfer');
        }
        const partitionBytes32 = ethers.hexlify(
          ethers.toUtf8Bytes(params.partition).slice(0, 32)
        ).padEnd(66, '0');
        
        const erc1400Interface = new ethers.Interface([
          'function transferByPartition(bytes32 partition, address to, uint256 value, bytes data) returns (bytes32)'
        ]);
        return {
          to: params.token,
          value: '0',
          data: erc1400Interface.encodeFunctionData('transferByPartition', [
            partitionBytes32,
            params.to,
            amount,
            params.data || '0x'
          ])
        };
      }

      case 'ERC-3525': {
        if (!params.tokenId) {
          throw new Error('tokenId required for ERC-3525 transfer');
        }
        const erc3525Interface = new ethers.Interface([
          'function transferFrom(uint256 fromTokenId, address to, uint256 value) returns (uint256 toTokenId)'
        ]);
        return {
          to: params.token,
          value: '0',
          data: erc3525Interface.encodeFunctionData('transferFrom', [
            params.tokenId,
            params.to,
            amount
          ])
        };
      }

      default:
        throw new Error(`Unsupported token standard: ${standard}`);
    }
  }

  /**
   * Create unsigned transaction with multi-standard support
   * ENHANCED: Uses nonce queue manager to prevent concurrent transaction conflicts
   * Uses chain ID from wallet data as source of truth
   */
  async createTransfer(params: TransferParams): Promise<UnsignedTransaction> {
    try {
      const provider = await this.getProviderFromChainId(params.chainId);
      const network = await provider.getNetwork();
      
      // Verify chain IDs match
      if (Number(network.chainId) !== params.chainId) {
        throw new Error(
          `Chain ID mismatch: Provider has ${network.chainId}, expected ${params.chainId}`
        );
      }
      
      // Detect standard if not provided
      let standard: TokenStandard;
      if (params.token) {
        standard = params.standard || await this.detectStandard(params.token, provider);
      } else {
        standard = 'NATIVE';
      }

      console.log(`📝 Creating ${standard} transfer`);

      // Get nonce
      const nonce = await this.getNextNonce(params.from, provider);

      // Get gas parameters
      const gasEstimate = await this.estimateGas({ ...params, standard });

      // Create transfer data based on standard
      const transferData = this.createTransferData(params, standard);

      const tx: UnsignedTransaction = {
        from: params.from,
        to: transferData.to,
        value: transferData.value,
        data: transferData.data,
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || gasEstimate.gasLimit
      };

      // Add gas pricing
      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        tx.maxFeePerGas = params.maxFeePerGas || gasEstimate.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas || gasEstimate.maxPriorityFeePerGas;
      } else {
        tx.gasPrice = params.gasPrice || gasEstimate.gasPrice;
      }

      const chainInfo = getChainInfo(params.chainId);
      console.log(
        `📝 Created ${standard} transaction for chain ${params.chainId} (${chainInfo?.name}):`,
        {
          chainId: tx.chainId,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          nonce: tx.nonce,
          standard,
          hasData: tx.data !== '0x'
        }
      );

      return tx;
    } catch (error) {
      console.error('❌ Transaction creation error:', error);
      this.clearNonceTracking(params.from);
      throw new Error(
        `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sign and broadcast transaction with comprehensive verification
   * SECURITY: Private keys are decrypted, used immediately, and cleared
   * ENHANCED: Verifies transaction enters mempool and waits for confirmation
   * Uses chain ID as source of truth for provider selection
   */
  async signAndBroadcast(
    transaction: UnsignedTransaction,
    walletId: string,
    walletType: 'project' | 'user'
  ): Promise<TransferResult> {
    let privateKey: string | null = null;
    const diagnostics: TransactionDiagnostics = {
      step: 'initialization',
      timestamp: Date.now(),
      chainId: transaction.chainId,
      nonce: transaction.nonce
    };

    try {
      // Step 1: Decrypt private key based on wallet type
      diagnostics.step = 'retrieving_private_key';
      if (walletType === 'project') {
        privateKey = await internalWalletService.getProjectWalletPrivateKey(walletId);
      } else {
        privateKey = await internalWalletService.getUserWalletPrivateKey(walletId);
      }

      if (!privateKey || privateKey.length < 64) {
        throw new Error('Invalid private key retrieved from storage');
      }

      // Step 2: Create wallet instance
      diagnostics.step = 'creating_wallet';
      const wallet = new ethers.Wallet(privateKey);
      
      const txFromAddress = await wallet.getAddress();
      console.log(`🔑 Wallet address: ${txFromAddress}`);

      // Step 3: Get verified provider using chain ID
      diagnostics.step = 'getting_provider';
      const provider = await this.getProviderFromChainId(transaction.chainId);
      const connectedWallet = wallet.connect(provider);

      // Step 4: Sign transaction
      diagnostics.step = 'signing_transaction';
      const signedTx = await connectedWallet.signTransaction(transaction);
      console.log(`✍️  Transaction signed successfully`);

      // Step 5: Broadcast transaction
      diagnostics.step = 'broadcasting';
      const broadcastStart = Date.now();
      const txResponse = await provider.broadcastTransaction(signedTx);
      const broadcastTime = Date.now() - broadcastStart;
      
      const chainInfo = getChainInfo(transaction.chainId);
      const isTestnetChain = chainInfo?.type === 'testnet';
      
      console.log(
        `📡 Transaction broadcast successful for chain ${transaction.chainId} ` +
        `(${chainInfo?.name}) in ${broadcastTime}ms: ${txResponse.hash}`
      );

      // Step 6: Verify transaction entered mempool
      diagnostics.step = 'verifying_mempool';
      const mempoolStart = Date.now();
      
      try {
        let attempts = 0;
        let pendingTx = null;
        
        while (attempts < 10 && !pendingTx) {
          pendingTx = await provider.getTransaction(txResponse.hash);
          if (!pendingTx) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        const mempoolTime = Date.now() - mempoolStart;
        
        if (!pendingTx) {
          // Transaction not found in mempool
          diagnostics.mempoolVerification = {
            found: false,
            timestamp: Date.now()
          };
          diagnostics.note = 'Transaction broadcast but not found in mempool within 10 seconds';
          console.warn(`⚠️  Transaction not found in mempool after ${mempoolTime}ms`);
        } else {
          diagnostics.mempoolVerification = {
            found: true,
            timestamp: Date.now()
          };
          console.log(`✅ Transaction found in mempool after ${mempoolTime}ms`);
        }
      } catch (mempoolError) {
        console.warn('⚠️  Mempool verification failed:', mempoolError);
        diagnostics.mempoolVerification = {
          found: false
        };
      }

      // Step 7: Wait for confirmation (longer timeout for testnets)
      diagnostics.step = 'confirming';
      const confirmStart = Date.now();
      const confirmTimeout = isTestnetChain ? 180000 : 60000; // 3min testnet, 1min mainnet

      try {
        const receipt = await txResponse.wait(1, confirmTimeout);
        const confirmTime = Date.now() - confirmStart;

        if (receipt.status === 0) {
          // Transaction reverted
          nonceManager.failNonce(txFromAddress, transaction.nonce);
          diagnostics.step = 'reverted';
          diagnostics.rpcVerification = {
            verified: true,
            blockNumber: receipt.blockNumber,
            latency: confirmTime
          };

          console.error(
            `❌ Transaction reverted in block ${receipt.blockNumber} after ${confirmTime}ms`
          );

          return {
            success: false,
            transactionHash: txResponse.hash,
            error: 'Transaction reverted on-chain',
            receipt,
            diagnostics
          };
        }

        // Transaction successful
        nonceManager.confirmNonce(txFromAddress, transaction.nonce);
        diagnostics.step = 'confirmed';
        diagnostics.rpcVerification = {
          verified: true,
          blockNumber: receipt.blockNumber,
          latency: confirmTime
        };

        console.log(
          `✅ Transaction confirmed in block ${receipt.blockNumber} ` +
          `after ${confirmTime}ms (${receipt.confirmations} confirmations)`
        );

        return {
          success: true,
          transactionHash: txResponse.hash,
          receipt,
          diagnostics
        };
      } catch (confirmError) {
        // Confirmation timeout or error
        console.warn(`⚠️  Confirmation timeout or error:`, confirmError);
        
        diagnostics.step = 'pending';
        diagnostics.note = `Confirmation timeout after ${confirmTimeout}ms. Transaction may still be pending.`;

        return {
          success: true, // Transaction was broadcast successfully
          transactionHash: txResponse.hash,
          diagnostics
        };
      }
    } catch (error) {
      console.error('❌ Sign and broadcast error:', error);

      // Clear nonce tracking on error
      if (transaction.from) {
        nonceManager.clearNonceTracking(transaction.from);
      }

      diagnostics.step = 'error';
      diagnostics.note = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign and broadcast transaction',
        diagnostics
      };
    } finally {
      // Always clear sensitive data
      if (privateKey) {
        privateKey = null;
      }
    }
  }

  /**
   * Execute complete transfer (validate → create → sign → broadcast → verify)
   * Uses chain ID from wallet data as source of truth throughout the flow
   * NOW SUPPORTS: Native tokens + ERC-20/721/1155/1400/3525/4626
   */
  async executeTransfer(params: TransferParams): Promise<TransferResult> {
    const startTime = Date.now();
    
    // Detect standard for logging
    let standard: TokenStandard = 'NATIVE';
    if (params.token) {
      try {
        const provider = await this.getProviderFromChainId(params.chainId);
        standard = params.standard || await this.detectStandard(params.token, provider);
      } catch {
        standard = 'ERC-20'; // Fallback
      }
    }
    
    console.log(`🚀 Starting ${standard} transfer execution for chain ${params.chainId}`);
    
    try {
      // Step 1: Validate transfer
      console.log(`1️⃣  Validating transfer...`);
      const validation = await this.validateTransfer(params);
      
      if (!validation.valid) {
        console.error(`❌ Validation failed:`, validation.errors);
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }
      
      if (validation.warnings.length > 0) {
        console.warn(`⚠️  Validation warnings:`, validation.warnings);
      }
      
      console.log(`✅ Validation passed`);

      // Step 2: Create transaction
      console.log(`2️⃣  Creating ${standard} transaction...`);
      const transaction = await this.createTransfer(params);
      console.log(`✅ Transaction created with nonce ${transaction.nonce}`);

      // Step 3: Sign and broadcast
      console.log(`3️⃣  Signing and broadcasting...`);
      const result = await this.signAndBroadcast(
        transaction,
        params.walletId,
        params.walletType
      );

      if (!result.success) {
        console.error(`❌ Sign and broadcast failed:`, result.error);
        return result;
      }
      
      console.log(`✅ Transaction broadcast successful: ${result.transactionHash}`);

      // Step 4: Record transaction in database
      console.log(`4️⃣  Recording transaction in database...`);
      if (result.transactionHash) {
        await this.recordTransaction({
          transactionHash: result.transactionHash,
          fromAddress: params.from,
          toAddress: params.to,
          amount: params.amount,
          chainId: params.chainId,
          walletId: params.walletId,
          token: params.token,
          standard,
          status: result.receipt ? 'confirmed' : 'pending'
        });
        console.log(`✅ Transaction recorded`);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 ${standard} transfer execution completed in ${totalTime}ms`);

      // Add standard to diagnostics
      if (result.diagnostics) {
        result.diagnostics.standard = standard;
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Execute transfer error after ${totalTime}ms:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Record transaction in database with proper status tracking
   * 
   * IMPORTANT: wallet_id is nullable because transactions can come from:
   * - wallets table (user/investor wallets)
   * - project_wallets table (project wallets)
   * We use from_address as the primary identifier instead
   */
  private async recordTransaction(data: {
    transactionHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    chainId: number;
    walletId: string;
    token?: string;
    standard?: TokenStandard;
    status: string;
  }): Promise<void> {
    try {
      const chainInfo = getChainInfo(data.chainId);
      const chainName = getChainName(data.chainId);
      
      // Check if wallet exists in wallets table
      const { data: walletExists } = await supabase
        .from('wallets')
        .select('id')
        .eq('id', data.walletId)
        .single();
      
      const { error } = await supabase.from('wallet_transactions').insert({
        transaction_hash: data.transactionHash,
        tx_hash: data.transactionHash,
        from_address: data.fromAddress,
        to_address: data.toAddress,
        amount: data.amount,
        value: data.amount,
        blockchain: chainName || `chain-${data.chainId}`,
        chain_id: data.chainId.toString(),
        wallet_id: walletExists ? data.walletId : null,
        status: data.status,
        transaction_type: data.token ? 'token_transfer' : 'transfer',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('❌ Failed to record transaction in database:', error);
      } else {
        console.log(
          `📊 Recorded ${data.standard || 'NATIVE'} transaction: ` +
          `Chain ${data.chainId} (${chainInfo?.name}), ` +
          `Status: ${data.status}, Hash: ${data.transactionHash}`
        );
      }
    } catch (error) {
      console.error('❌ Failed to record transaction:', error);
    }
  }

  /**
   * Get transaction status by hash
   * Useful for polling transaction confirmation status
   */
  async getTransactionStatus(txHash: string, chainId: number): Promise<{
    found: boolean;
    pending: boolean;
    confirmed: boolean;
    reverted: boolean;
    receipt?: any;
  }> {
    try {
      const provider = await this.getProviderFromChainId(chainId);
      
      const tx = await provider.getTransaction(txHash);
      
      if (!tx) {
        return { found: false, pending: false, confirmed: false, reverted: false };
      }
      
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { found: true, pending: true, confirmed: false, reverted: false };
      }
      
      return {
        found: true,
        pending: false,
        confirmed: receipt.status === 1,
        reverted: receipt.status === 0,
        receipt
      };
    } catch (error) {
      console.error('Error checking transaction status:', error);
      throw error;
    }
  }

  /**
   * Clear all nonce tracking (useful for testing or reset)
   */
  clearAllNonceTracking(): void {
    nonceManager.clearAllNonceTracking();
    console.log('🗑️  Cleared all nonce tracking');
  }

  /**
   * Bump fees for a stuck transaction by broadcasting a replacement with same nonce
   * Works for both native and token transfers
   */
  async bumpTransactionFees(
    originalTxHash: string,
    walletId: string,
    walletType: 'project' | 'user',
    newMaxFeePerGas: string,
    newMaxPriorityFeePerGas: string
  ): Promise<TransferResult> {
    try {
      console.log(`💰 Bumping fees for transaction ${originalTxHash}`);

      // Get original transaction details
      const provider = await this.getProviderFromChainId(1); // Temporary, will be replaced
      const originalTx = await provider.getTransaction(originalTxHash);

      if (!originalTx) {
        throw new Error('Original transaction not found');
      }

      // Get correct provider for chain
      const correctProvider = await this.getProviderFromChainId(Number(originalTx.chainId));

      // Reconstruct transfer params from original transaction
      const params: TransferParams = {
        from: originalTx.from,
        to: originalTx.to,
        amount: originalTx.data === '0x' 
          ? ethers.formatEther(originalTx.value) 
          : '0', // Will need to decode for tokens
        token: originalTx.data !== '0x' ? originalTx.to : undefined,
        chainId: Number(originalTx.chainId),
        walletId,
        walletType,
        nonce: originalTx.nonce, // CRITICAL: Use same nonce
        maxFeePerGas: newMaxFeePerGas,
        maxPriorityFeePerGas: newMaxPriorityFeePerGas
      };

      // Execute replacement transaction
      return await this.executeTransfer(params);
    } catch (error) {
      console.error('❌ Fee bump failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fee bump failed'
      };
    }
  }

  /**
   * Diagnose nonce issues for an address
   */
  async diagnoseNonceIssues(
    address: string,
    chainId: number
  ): Promise<{
    hasGap: boolean;
    recommendations: string[];
  }> {
    const provider = await this.getProviderFromChainId(chainId);
    const status = await nonceManager.getNonceStatus(address, provider);

    const recommendations: string[] = [];

    if (status.hasGap) {
      recommendations.push(`⚠️ ${status.gapSize} stuck transaction(s) detected`);
      recommendations.push('Cancel stuck transactions before batch operations');
    } else {
      recommendations.push('✅ No nonce issues detected');
    }

    return {
      hasGap: status.hasGap,
      recommendations
    };
  }
}

export const transferService = TransferService.getInstance();
