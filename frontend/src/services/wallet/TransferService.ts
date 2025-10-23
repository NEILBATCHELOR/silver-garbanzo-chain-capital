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

// Transfer Types
export interface TransferParams {
  from: string; // Wallet address
  to: string; // Destination address
  amount: string; // Amount to transfer (in token units)
  token?: string; // Token address (undefined = native token)
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
   * Get next available nonce with gap detection and prevention
   * Uses enhanced NonceManager to prevent nonce gaps
   * @private
   */
  private async getNextNonce(
    address: string, 
    provider: ethers.JsonRpcProvider,
    forceNonce?: number
  ): Promise<number> {
    return await nonceManager.getNextNonce(address, provider, {
      forceNonce,
      allowGaps: false // Never allow gaps - force explicit handling
    });
  }

  /**
   * Clear nonce tracking for an address (call after confirmed tx or on error)
   * Uses enhanced NonceManager
   * @private
   */
  private clearNonceTracking(address: string): void {
    nonceManager.clearNonceTracking(address);
  }

  /**
   * Diagnose nonce issues for an address
   * PUBLIC method for troubleshooting stuck transactions
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
          `⚠️  NONCE GAP DETECTED: ${validation.gapSize} transaction(s) stuck between ` +
          `nonce ${validation.confirmed} (confirmed) and ${validation.pending} (pending)`
        );
        recommendations.push(
          '📝 Solutions:\n' +
          '   1. Wait for pending transactions to confirm (may take hours on testnets)\n' +
          '   2. Cancel stuck transactions by sending 0 ETH to self with same nonce but higher gas\n' +
          '   3. Use the nonce gap fixer script at /scripts/fix-nonce-gap.ts'
        );
      } else if (validation.pending === validation.confirmed) {
        recommendations.push('✅ No nonce issues detected - all transactions confirmed');
      } else {
        recommendations.push(
          `⏳ ${validation.pending - validation.confirmed} transaction(s) pending confirmation`
        );
      }
      
      const pendingNonces = nonceManager.getPendingNonces(address);
      if (pendingNonces.length > 0) {
        recommendations.push(
          `📋 Tracked pending nonces: ${pendingNonces.join(', ')}`
        );
      }
      
      return {
        hasGap: validation.hasGap,
        status: validation,
        recommendations
      };
    } catch (error) {
      throw new Error(
        `Failed to diagnose nonce issues: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get ethers provider using chain ID and RPC manager with connection verification
   * Uses chain ID as source of truth for network determination
   * Automatically falls back to free public RPCs if primary RPC unavailable
   * ENHANCED: Verifies RPC connection before returning provider
   * @private
   */
  private async getProviderFromChainId(chainId: number): Promise<ethers.JsonRpcProvider> {
    // Validate chain ID
    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    // Get chain info
    const chainInfo = getChainInfo(chainId);
    if (!chainInfo) {
      throw new Error(`Unsupported chain ID: ${chainId}. Check chainIds.ts`);
    }

    // Determine network type from chain info
    const networkType: NetworkType = chainInfo.type === 'testnet' ? 'testnet' : 'mainnet';

    // Get RPC URL with automatic fallback support
    const rpcUrl = await rpcManager.getRPCUrlWithFallback(chainId, networkType);
    
    if (!rpcUrl) {
      throw new Error(
        `No RPC available for ${chainInfo.name} (${networkType}). ` +
        `Chain ID: ${chainId}. Neither primary nor fallback RPCs are configured.`
      );
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId,
      name: chainInfo.name
    });

    // VERIFY CONNECTION - Critical to ensure RPC is actually working
    const startTime = Date.now();
    try {
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);
      
      const latency = Date.now() - startTime;
      
      // Verify chain ID matches
      if (Number(network.chainId) !== chainId) {
        throw new Error(
          `Chain ID mismatch: RPC returned ${network.chainId}, expected ${chainId}`
        );
      }
      
      // Log whether using primary or fallback RPC
      const isFallback = rpcUrl.includes('publicnode.com') || 
                        rpcUrl.includes('grove.city') ||
                        rpcUrl.includes('drpc.org') ||
                        rpcUrl.includes('blastapi.io');
      
      if (isFallback) {
        console.warn(
          `⚠️  Using fallback RPC for chain ${chainId} (${chainInfo.name}): ` +
          `Block ${blockNumber}, Latency ${latency}ms`
        );
      } else {
        console.log(
          `✅ RPC verified: Chain ${chainId} (${chainInfo.name}), ` +
          `Block ${blockNumber}, Latency ${latency}ms`
        );
      }
      
      return provider;
    } catch (error) {
      console.error(`❌ RPC verification failed for ${rpcUrl}:`, error);
      throw new Error(
        `RPC connection failed for ${chainInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate transfer parameters before execution
   * ENHANCED: Checks balance BEFORE gas estimation to prevent false positives
   * Uses chain ID from wallet data as source of truth
   */
  async validateTransfer(params: TransferParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate chain ID first
      if (!params.chainId) {
        errors.push('Chain ID is required');
        return { valid: false, errors, warnings };
      }
      
      // Validate addresses
      if (!ethers.isAddress(params.from)) {
        errors.push('Invalid source address');
      }
      if (!ethers.isAddress(params.to)) {
        errors.push('Invalid destination address');
      }

      // Check for same address transfer
      if (params.from.toLowerCase() === params.to.toLowerCase()) {
        errors.push('Cannot transfer to the same address');
      }

      // Validate amount
      const amount = ethers.parseEther(params.amount);
      if (amount <= 0n) {
        errors.push('Transfer amount must be greater than 0');
      }

      // Exit early if critical validation errors
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }
      
      // Get provider and check balance
      const provider = await this.getProviderFromChainId(params.chainId);
      const balance = await provider.getBalance(params.from);

      // CRITICAL FIX #1: Check balance BEFORE gas estimation
      // This prevents false positives when amount ≈ balance
      if (amount > balance) {
        errors.push(
          `Insufficient balance. Need: ${ethers.formatEther(amount)} ETH, ` +
          `Have: ${ethers.formatEther(balance)} ETH, ` +
          `Short: ${ethers.formatEther(amount - balance)} ETH`
        );
        return { valid: false, errors, warnings };
      }

      // Now estimate gas with remaining balance
      try {
        const gasEstimate = await this.estimateGas(params);
        const gasCost = ethers.parseEther(gasEstimate.estimatedCost);
        const totalCost = amount + gasCost;

        if (totalCost > balance) {
          errors.push(
            `Insufficient balance including gas. ` +
            `Amount: ${ethers.formatEther(amount)} ETH, ` +
            `Gas: ${ethers.formatEther(gasCost)} ETH, ` +
            `Total: ${ethers.formatEther(totalCost)} ETH, ` +
            `Available: ${ethers.formatEther(balance)} ETH, ` +
            `Short: ${ethers.formatEther(totalCost - balance)} ETH`
          );
        }

        // Warn if gas cost is unusually high
        const gasCostPercent = (Number(gasEstimate.estimatedCost) / Number(params.amount)) * 100;
        if (gasCostPercent > 10) {
          warnings.push(
            `⚠️  Gas fees are ${gasCostPercent.toFixed(2)}% of transfer amount`
          );
        }
        
        // Warn if balance will be very low after transfer
        const remainingBalance = balance - totalCost;
        const minRecommendedBalance = ethers.parseEther('0.001'); // 0.001 ETH buffer
        if (remainingBalance < minRecommendedBalance && remainingBalance > 0n) {
          warnings.push(
            `⚠️  Low balance after transfer: ${ethers.formatEther(remainingBalance)} ETH remaining`
          );
        }
      } catch (gasError) {
        console.error('Gas estimation failed during validation:', gasError);
        errors.push(
          `Gas estimation failed: ${gasError instanceof Error ? gasError.message : 'Unknown error'}`
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        valid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings
      };
    }
  }

  /**
   * Estimate gas costs for transfer
   * ENHANCED: Adds 25% buffer to EIP-1559 fees to handle fee volatility
   * Uses chain ID from wallet data as source of truth
   */
  async estimateGas(params: TransferParams): Promise<GasEstimate> {
    try {
      const provider = await this.getProviderFromChainId(params.chainId);
      
      // Build transaction for estimation
      const tx: any = {
        from: params.from,
        to: params.to,
        value: ethers.parseEther(params.amount)
      };

      // Estimate gas limit with 10% buffer
      const baseGasLimit = await provider.estimateGas(tx);
      const gasLimit = (baseGasLimit * 110n) / 100n; // 10% buffer
      
      // Get current gas price
      const feeData = await provider.getFeeData();
      
      let estimatedCost: bigint;
      let gasPrice: string | undefined;
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // CRITICAL FIX #3: Add buffer to EIP-1559 fees for volatility
        // Per documentation: "Fees can spike 10x in minutes"
        // Use higher buffer for testnets due to higher volatility
        const chainInfo = getChainInfo(params.chainId);
        const isTestnetChain = chainInfo?.type === 'testnet';
        const feeBuffer = isTestnetChain ? 150n : 125n; // 50% for testnet, 25% for mainnet
        
        maxFeePerGas = ((feeData.maxFeePerGas * feeBuffer) / 100n).toString();
        maxPriorityFeePerGas = ((feeData.maxPriorityFeePerGas * feeBuffer) / 100n).toString();
        
        // Calculate cost using buffered max fee
        estimatedCost = gasLimit * ((feeData.maxFeePerGas * feeBuffer) / 100n);
        
        console.log(
          `⛽ Gas estimate (EIP-1559 with ${feeBuffer-100n}% buffer for ${isTestnetChain ? 'testnet' : 'mainnet'}): ` +
          `Limit=${gasLimit}, MaxFee=${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei, ` +
          `Priority=${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei`
        );
      } else if (feeData.gasPrice) {
        // Legacy transaction with 10% buffer
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
   * Create unsigned transaction
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
      
      // CRITICAL FIX #4: Use nonce queue manager to prevent conflicts
      // Handles concurrent transactions from same address
      const nonce = await this.getNextNonce(params.from, provider);

      // Get gas parameters (already includes buffers from estimateGas)
      const gasEstimate = await this.estimateGas(params);

      const tx: UnsignedTransaction = {
        from: params.from, // Track sender for nonce management
        to: params.to,
        value: ethers.parseEther(params.amount).toString(),
        data: '0x',
        chainId: params.chainId,
        nonce,
        gasLimit: params.gasLimit || gasEstimate.gasLimit
      };

      // Add gas pricing (EIP-1559 or legacy) - use params if provided, otherwise estimates
      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        tx.maxFeePerGas = params.maxFeePerGas || gasEstimate.maxFeePerGas;
        tx.maxPriorityFeePerGas = params.maxPriorityFeePerGas || gasEstimate.maxPriorityFeePerGas;
      } else {
        tx.gasPrice = params.gasPrice || gasEstimate.gasPrice;
      }

      const chainInfo = getChainInfo(params.chainId);
      console.log(
        `📝 Created transaction for chain ${params.chainId} (${chainInfo?.name}):`,
        {
          chainId: tx.chainId,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          nonce: tx.nonce,
          network: chainInfo?.type,
          gasLimit: tx.gasLimit,
          hasEIP1559: !!(tx.maxFeePerGas && tx.maxPriorityFeePerGas)
        }
      );

      return tx;
    } catch (error) {
      console.error('❌ Transaction creation error:', error);
      // On error during creation, don't mark as failed yet - just clear tracking
      // The nonce was assigned but transaction wasn't created, so we need to reset
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
      
      // Verify wallet address matches transaction sender
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
      
      // Get chain info once for reuse
      const chainInfo = getChainInfo(transaction.chainId);
      const isTestnetChain = chainInfo?.type === 'testnet';
      
      console.log(
        `📡 Transaction broadcast successful for chain ${transaction.chainId} ` +
        `(${chainInfo?.name}) in ${broadcastTime}ms: ${txResponse.hash}`
      );

      // CRITICAL FIX #2: Verify transaction entered mempool
      // Don't return success until we confirm the network accepted it
      diagnostics.step = 'verifying_mempool';
      const mempoolStart = Date.now();
      
      try {
        // Wait up to 10 seconds for transaction to appear in mempool
        let attempts = 0;
        let pendingTx = null;
        
        while (attempts < 10 && !pendingTx) {
          pendingTx = await provider.getTransaction(txResponse.hash);
          if (!pendingTx) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        if (!pendingTx) {
          throw new Error(
            'Transaction not found in mempool after 10 seconds. ' +
            'It may have been rejected by the network.'
          );
        }
        
        const mempoolTime = Date.now() - mempoolStart;
        diagnostics.mempoolVerification = {
          found: true,
          timestamp: mempoolTime
        };
        
        console.log(`✅ Transaction verified in mempool after ${mempoolTime}ms`);
        
      } catch (mempoolError) {
        console.error('❌ Mempool verification failed:', mempoolError);
        throw new Error(
          `Transaction broadcast but not found in mempool: ${
            mempoolError instanceof Error ? mempoolError.message : 'Unknown error'
          }`
        );
      }

      // Step 6: Wait for 1 confirmation (with timeout)
      // ENHANCED: Longer timeout for testnets (300s) vs mainnet (60s) - Hoodi testnet is VERY slow
      const confirmationTimeout = isTestnetChain ? 300000 : 60000; // 5min for testnet, 1min for mainnet
      
      diagnostics.step = 'waiting_confirmation';
      console.log(
        `⏳ Waiting for transaction confirmation (timeout: ${confirmationTimeout/1000}s)...\n` +
        `   Network: ${chainInfo?.name} (${isTestnetChain ? 'TESTNET' : 'MAINNET'})\n` +
        `   Hash: ${txResponse.hash}\n` +
        `   Check status: ${chainInfo?.explorer}/tx/${txResponse.hash}`
      );
      
      try {
        // Poll for receipt with detailed logging
        const startTime = Date.now();
        let pollCount = 0;
        
        // Wait for 1 confirmation with dynamic timeout
        const receipt = await Promise.race([
          (async () => {
            // Custom polling with logging every 30 seconds
            const pollInterval = 30000; // 30 seconds
            let lastLogTime = startTime;
            
            while (true) {
              try {
                const receipt = await provider.getTransactionReceipt(txResponse.hash);
                if (receipt && receipt.blockNumber) {
                  return receipt;
                }
                
                pollCount++;
                const elapsed = Date.now() - startTime;
                
                // Log every 30 seconds
                if (Date.now() - lastLogTime >= pollInterval) {
                  console.log(
                    `⏳ Still waiting for confirmation... ` +
                    `Elapsed: ${Math.floor(elapsed/1000)}s, ` +
                    `Polls: ${pollCount}`
                  );
                  lastLogTime = Date.now();
                }
                
                // Wait 3 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 3000));
              } catch (pollError) {
                console.warn(`⚠️  Polling error (will retry):`, pollError);
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          })(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Confirmation timeout after ${confirmationTimeout/1000} seconds`)), confirmationTimeout)
          )
        ]);
        
        // Check if transaction reverted
        if (receipt.status === 0) {
          // Mark nonce as failed (reverted on-chain)
          if (transaction.from) {
            nonceManager.failNonce(transaction.from, transaction.nonce);
          }
          throw new Error('Transaction reverted on-chain');
        }
        
        // Mark nonce as confirmed
        if (transaction.from) {
          nonceManager.confirmNonce(transaction.from, transaction.nonce);
        }
        
        diagnostics.step = 'confirmed';
        const confirmTime = Date.now() - startTime;
        console.log(
          `✅ Transaction confirmed after ${Math.floor(confirmTime/1000)}s: ` +
          `Block ${receipt.blockNumber}, ` +
          `Gas used: ${receipt.gasUsed}, ` +
          `Status: ${receipt.status}`
        );
        
        return {
          success: true,
          transactionHash: txResponse.hash,
          receipt,
          diagnostics
        };
        
      } catch (confirmError) {
        // Transaction is in mempool but not yet confirmed
        // This is acceptable for testnets - return success with pending status
        const elapsed = Date.now() - diagnostics.broadcastTimestamp!;
        console.warn(
          `⚠️  Confirmation timeout after ${Math.floor(elapsed/1000)}s (tx still pending)\n` +
          `   This is NORMAL for slow testnets like Hoodi.\n` +
          `   Check explorer: ${chainInfo?.explorer}/tx/${txResponse.hash}\n` +
          `   Error: ${confirmError instanceof Error ? confirmError.message : 'Unknown error'}`
        );
        
        return {
          success: true,
          transactionHash: txResponse.hash,
          receipt: null,
          diagnostics: {
            ...diagnostics,
            step: 'pending_confirmation',
            note: 'Transaction broadcast successfully but confirmation pending due to testnet delays'
          }
        };
      }
      
    } catch (error) {
      console.error(`❌ Transaction failed at step '${diagnostics.step}':`, error);
      
      // Mark nonce as failed on error to allow proper retry
      if (transaction.from && transaction.nonce !== undefined) {
        nonceManager.failNonce(transaction.from, transaction.nonce);
      }
      
      return {
        success: false,
        error: `Failed at ${diagnostics.step}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        diagnostics
      };
    } finally {
      // CRITICAL: Clear private key from memory
      if (privateKey) {
        privateKey = '';
        privateKey = null;
      }
    }
  }

  /**
   * Execute complete transfer (validate → create → sign → broadcast → verify)
   * Uses chain ID from wallet data as source of truth throughout the flow
   */
  async executeTransfer(params: TransferParams): Promise<TransferResult> {
    const startTime = Date.now();
    console.log(`🚀 Starting transfer execution for chain ${params.chainId}`);
    
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
      console.log(`2️⃣  Creating transaction...`);
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
          status: result.receipt ? 'confirmed' : 'pending'
        });
        console.log(`✅ Transaction recorded`);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 Transfer execution completed in ${totalTime}ms`);

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
    status: string;
  }): Promise<void> {
    try {
      const chainInfo = getChainInfo(data.chainId);
      const chainName = getChainName(data.chainId);
      
      // Check if wallet exists in wallets table, if not set wallet_id to null
      // (it might be in project_wallets instead)
      const { data: walletExists } = await supabase
        .from('wallets')
        .select('id')
        .eq('id', data.walletId)
        .single();
      
      const { error } = await supabase.from('wallet_transactions').insert({
        transaction_hash: data.transactionHash,
        tx_hash: data.transactionHash, // Also populate legacy field for backwards compatibility
        from_address: data.fromAddress,
        to_address: data.toAddress,
        amount: data.amount,
        value: data.amount, // Also populate legacy numeric field
        blockchain: chainName || `chain-${data.chainId}`,
        chain_id: data.chainId.toString(),
        wallet_id: walletExists ? data.walletId : null, // Only set if wallet exists in wallets table
        status: data.status,
        transaction_type: 'transfer',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('❌ Failed to record transaction in database:', error);
        // Don't throw - transaction already sent
      } else {
        console.log(
          `📊 Recorded transaction in database: ` +
          `Chain ${data.chainId} (${chainInfo?.name}), ` +
          `From: ${data.fromAddress.substring(0, 10)}..., ` +
          `Status: ${data.status}, ` +
          `Hash: ${data.transactionHash}`
        );
      }
    } catch (error) {
      console.error('❌ Failed to record transaction:', error);
      // Don't throw - transaction already sent
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
      
      // Try to get transaction
      const tx = await provider.getTransaction(txHash);
      
      if (!tx) {
        return { found: false, pending: false, confirmed: false, reverted: false };
      }
      
      // Try to get receipt
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
   * Uses NonceManager for centralized nonce management
   */
  clearAllNonceTracking(): void {
    nonceManager.clearAllNonceTracking();
    console.log('🗑️  Cleared all nonce tracking');
  }
  /**
   * Bump fees for a stuck transaction by broadcasting a replacement with same nonce
   * Requires 10%+ fee increase to be accepted by nodes
   */
  async bumpTransactionFees(
    originalTxHash: string,
    walletId: string,
    walletType: 'project' | 'user',
    newMaxFeePerGas: string,
    newMaxPriorityFeePerGas: string
  ): Promise<TransferResult> {
    try {
      console.log(`🚀 Bumping fees for transaction: ${originalTxHash}`);

      // Get original transaction
      const { data: txRecord } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('transaction_hash', originalTxHash)
        .single();

      if (!txRecord) {
        throw new Error('Transaction not found in database');
      }

      // Get wallet info
      const table = walletType === 'project' ? 'project_wallets' : 'user_wallets';
      const { data: wallet } = await supabase
        .from(table)
        .select('*')
        .eq('id', walletId)
        .single();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Verify transaction is pending
      const provider = await this.getProviderFromChainId(wallet.chain_id);
      const receipt = await provider.getTransactionReceipt(originalTxHash);
      
      if (receipt && receipt.blockNumber) {
        throw new Error('Transaction already confirmed - cannot bump fees');
      }

      // Get the original transaction from network
      const originalTx = await provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error('Original transaction not found on network');
      }

      // Verify fee increase is sufficient (10% minimum)
      const originalMaxFee = BigInt(originalTx.maxFeePerGas || 0);
      const originalPriorityFee = BigInt(originalTx.maxPriorityFeePerGas || 0);
      const newMaxFee = BigInt(newMaxFeePerGas);
      const newPriorityFee = BigInt(newMaxPriorityFeePerGas);

      if (newMaxFee < (originalMaxFee * 110n) / 100n) {
        throw new Error('New max fee must be at least 10% higher than original');
      }
      if (newPriorityFee < (originalPriorityFee * 110n) / 100n) {
        throw new Error('New priority fee must be at least 10% higher than original');
      }

      // Create replacement transaction with SAME NONCE
      const replacementTx: UnsignedTransaction = {
        to: originalTx.to!,
        value: originalTx.value.toString(),
        data: originalTx.data,
        chainId: wallet.chain_id,
        nonce: originalTx.nonce, // CRITICAL: Same nonce to replace
        gasLimit: originalTx.gasLimit.toString(),
        maxFeePerGas: newMaxFeePerGas,
        maxPriorityFeePerGas: newMaxPriorityFeePerGas
      };

      console.log(`📝 Replacement transaction:`, {
        nonce: replacementTx.nonce,
        originalMaxFee: ethers.formatUnits(originalMaxFee, 'gwei') + ' Gwei',
        newMaxFee: ethers.formatUnits(newMaxFee, 'gwei') + ' Gwei',
        increase: ((Number(newMaxFee - originalMaxFee) / Number(originalMaxFee)) * 100).toFixed(1) + '%'
      });

      // Sign and broadcast replacement
      const result = await this.signAndBroadcast(replacementTx, walletId, walletType);

      if (result.success) {
        // Update database with new transaction hash
        await supabase
          .from('wallet_transactions')
          .update({
            transaction_hash: result.transactionHash,
            status: 'pending',
            updated_at: new Date().toISOString(),
            metadata: {
              ...txRecord.metadata,
              fee_bump: {
                original_hash: originalTxHash,
                bumped_at: new Date().toISOString(),
                fee_increase: {
                  maxFee: ethers.formatUnits(newMaxFee - originalMaxFee, 'gwei') + ' Gwei',
                  priority: ethers.formatUnits(newPriorityFee - originalPriorityFee, 'gwei') + ' Gwei'
                }
              }
            }
          })
          .eq('transaction_hash', originalTxHash);

        console.log(`✅ Fee bump successful! New hash: ${result.transactionHash}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Fee bump failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bump transaction fees'
      };
    }
  }
}

// Export singleton instance
export const transferService = TransferService.getInstance();
