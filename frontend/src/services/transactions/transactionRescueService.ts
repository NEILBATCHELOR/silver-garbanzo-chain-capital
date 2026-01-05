import { ethers } from 'ethers';

/**
 * Transaction Rescue Service
 * 
 * Handles stuck transactions and nonce gaps by:
 * 1. Canceling stuck transactions (replace with 0 ETH transfer at higher gas)
 * 2. Speeding up pending transactions (replace with same transaction at higher gas)
 * 3. Clearing nonce gaps
 */
export class TransactionRescueService {
  /**
   * Cancel a stuck transaction by sending a 0 ETH transfer to yourself
   * with the same nonce but higher gas price
   */
  static async cancelTransaction(
    wallet: ethers.Wallet,
    stuckNonce: number,
    options?: {
      /** Multiplier for gas price increase (default: 1.2 = 20% increase) */
      gasPriceMultiplier?: number;
      /** Manual gas price in gwei */
      manualGasPrice?: string;
    }
  ): Promise<ethers.TransactionResponse> {
    const gasPriceMultiplier = options?.gasPriceMultiplier || 1.2;
    
    console.log(`🚨 [Rescue] Canceling transaction with nonce ${stuckNonce}...`);
    
    // Get current fee data
    const feeData = await wallet.provider.getFeeData();
    
    // Build cancellation transaction (0 ETH to yourself)
    const cancelTx: ethers.TransactionRequest = {
      to: wallet.address,
      value: 0,
      nonce: stuckNonce,
      chainId: (await wallet.provider.getNetwork()).chainId
    };
    
    // Set gas price (increase to ensure replacement)
    if (options?.manualGasPrice) {
      cancelTx.maxFeePerGas = ethers.parseUnits(options.manualGasPrice, 'gwei');
      cancelTx.maxPriorityFeePerGas = ethers.parseUnits(
        (parseFloat(options.manualGasPrice) * 0.1).toString(),
        'gwei'
      );
    } else if (feeData.maxFeePerGas) {
      // EIP-1559 network
      cancelTx.maxFeePerGas = BigInt(Math.floor(Number(feeData.maxFeePerGas) * gasPriceMultiplier));
      cancelTx.maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas || 0) * gasPriceMultiplier));
    } else if (feeData.gasPrice) {
      // Legacy network
      cancelTx.gasPrice = BigInt(Math.floor(Number(feeData.gasPrice) * gasPriceMultiplier));
    }
    
    console.log(`✅ [Rescue] Cancellation transaction prepared:`);
    console.log(`   - Nonce: ${cancelTx.nonce}`);
    console.log(`   - Max Fee: ${cancelTx.maxFeePerGas ? ethers.formatUnits(cancelTx.maxFeePerGas, 'gwei') : 'N/A'} gwei`);
    console.log(`   - Priority Fee: ${cancelTx.maxPriorityFeePerGas ? ethers.formatUnits(cancelTx.maxPriorityFeePerGas, 'gwei') : 'N/A'} gwei`);
    console.log(`   - Gas Price: ${cancelTx.gasPrice ? ethers.formatUnits(cancelTx.gasPrice, 'gwei') : 'N/A'} gwei`);
    
    // Send cancellation transaction
    const tx = await wallet.sendTransaction(cancelTx);
    console.log(`🚀 [Rescue] Cancellation transaction sent: ${tx.hash}`);
    
    return tx;
  }
  
  /**
   * Speed up a pending transaction by replacing it with higher gas
   */
  static async speedUpTransaction(
    wallet: ethers.Wallet,
    stuckTxHash: string,
    options?: {
      /** Multiplier for gas price increase (default: 1.2 = 20% increase) */
      gasPriceMultiplier?: number;
      /** Manual gas price in gwei */
      manualGasPrice?: string;
    }
  ): Promise<ethers.TransactionResponse> {
    const gasPriceMultiplier = options?.gasPriceMultiplier || 1.2;
    
    console.log(`🚨 [Rescue] Speeding up transaction ${stuckTxHash}...`);
    
    // Get the stuck transaction
    const stuckTx = await wallet.provider.getTransaction(stuckTxHash);
    if (!stuckTx) {
      throw new Error(`Transaction ${stuckTxHash} not found`);
    }
    
    // Build replacement transaction with same parameters but higher gas
    const replacementTx: ethers.TransactionRequest = {
      to: stuckTx.to,
      from: stuckTx.from,
      value: stuckTx.value,
      data: stuckTx.data,
      nonce: stuckTx.nonce,
      chainId: stuckTx.chainId
    };
    
    // Set higher gas price
    if (options?.manualGasPrice) {
      replacementTx.maxFeePerGas = ethers.parseUnits(options.manualGasPrice, 'gwei');
      replacementTx.maxPriorityFeePerGas = ethers.parseUnits(
        (parseFloat(options.manualGasPrice) * 0.1).toString(),
        'gwei'
      );
    } else if (stuckTx.maxFeePerGas) {
      // EIP-1559 network
      replacementTx.maxFeePerGas = BigInt(Math.floor(Number(stuckTx.maxFeePerGas) * gasPriceMultiplier));
      replacementTx.maxPriorityFeePerGas = BigInt(Math.floor(Number(stuckTx.maxPriorityFeePerGas || 0) * gasPriceMultiplier));
    } else if (stuckTx.gasPrice) {
      // Legacy network
      replacementTx.gasPrice = BigInt(Math.floor(Number(stuckTx.gasPrice) * gasPriceMultiplier));
    }
    
    console.log(`✅ [Rescue] Replacement transaction prepared:`);
    console.log(`   - Nonce: ${replacementTx.nonce}`);
    console.log(`   - Max Fee: ${replacementTx.maxFeePerGas ? ethers.formatUnits(replacementTx.maxFeePerGas, 'gwei') : 'N/A'} gwei`);
    console.log(`   - Priority Fee: ${replacementTx.maxPriorityFeePerGas ? ethers.formatUnits(replacementTx.maxPriorityFeePerGas, 'gwei') : 'N/A'} gwei`);
    
    // Send replacement transaction
    const tx = await wallet.sendTransaction(replacementTx);
    console.log(`🚀 [Rescue] Replacement transaction sent: ${tx.hash}`);
    
    return tx;
  }
  
  /**
   * Clear all stuck transactions by canceling them in sequence
   */
  static async clearAllStuckTransactions(
    wallet: ethers.Wallet,
    options?: {
      /** Multiplier for gas price increase (default: 1.5 = 50% increase for aggressive clearing) */
      gasPriceMultiplier?: number;
      /** Manual gas price in gwei */
      manualGasPrice?: string;
      /** Force clearing of specific nonces even if blockchain shows no gap */
      forceNonces?: number[];
    }
  ): Promise<ethers.TransactionResponse[]> {
    const gasPriceMultiplier = options?.gasPriceMultiplier || 1.5;
    
    console.log(`🚨 [Rescue] Clearing all stuck transactions for ${wallet.address}...`);
    
    // Get current nonce information
    const latestNonce = await wallet.provider.getTransactionCount(wallet.address, 'latest');
    const pendingNonce = await wallet.provider.getTransactionCount(wallet.address, 'pending');
    
    console.log(`📊 [Rescue] Current nonce status:`);
    console.log(`   - Latest (mined): ${latestNonce}`);
    console.log(`   - Pending: ${pendingNonce}`);
    console.log(`   - Current stuck: ${pendingNonce - latestNonce}`);
    
    // Determine which nonces to clear
    let noncesToClear: number[] = [];
    
    if (options?.forceNonces && options.forceNonces.length > 0) {
      // Use forced nonces from locked UI state
      noncesToClear = options.forceNonces;
      console.log(`🔒 [Rescue] Using forced nonces from UI state: ${noncesToClear.join(', ')}`);
      console.log(`⚠️  [Rescue] Note: Blockchain shows no gap - transactions may have auto-resolved`);
    } else if (pendingNonce > latestNonce) {
      // Use gap detected by blockchain
      noncesToClear = Array.from(
        { length: pendingNonce - latestNonce }, 
        (_, i) => latestNonce + i
      );
      console.log(`📡 [Rescue] Clearing ${noncesToClear.length} stuck nonce(s): ${noncesToClear.join(', ')}`);
    } else {
      console.log(`✅ [Rescue] No stuck transactions found and no forced nonces provided`);
      return [];
    }
    
    // Cancel each stuck nonce
    const cancelTxs: ethers.TransactionResponse[] = [];
    for (const nonce of noncesToClear) {
      console.log(`🚨 [Rescue] Canceling nonce ${nonce}...`);
      
      try {
        const cancelTx = await this.cancelTransaction(wallet, nonce, {
          gasPriceMultiplier,
          manualGasPrice: options?.manualGasPrice
        });
        cancelTxs.push(cancelTx);
        console.log(`✅ [Rescue] Cancellation tx sent for nonce ${nonce}: ${cancelTx.hash}`);
      } catch (error) {
        // If transaction fails (e.g., nonce already used), log but continue
        console.warn(`⚠️  [Rescue] Failed to cancel nonce ${nonce}:`, error instanceof Error ? error.message : error);
        
        // If the error is "nonce too low" or "already known", the transaction resolved itself
        const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
        if (errorMsg.includes('nonce too low') || errorMsg.includes('already known')) {
          console.log(`✅ [Rescue] Nonce ${nonce} already resolved - skipping`);
        }
      }
      
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ [Rescue] Sent ${cancelTxs.length} cancellation transactions (attempted ${noncesToClear.length})`);
    return cancelTxs;
  }
  
  /**
   * Get information about stuck transactions by querying blockchain mempool
   */
  static async getStuckTransactionInfo(
    provider: ethers.Provider | ethers.JsonRpcProvider,
    address: string
  ): Promise<{
    latestNonce: number;
    pendingNonce: number;
    stuckCount: number;
    stuckNonces: number[];
    pendingTxs: Array<{ hash: string | null; nonce: number; }>;
  }> {
    console.log('📡 [TransactionRescueService] Querying blockchain for stuck transactions:', address);
    
    const latestNonce = await provider.getTransactionCount(address, 'latest');
    const pendingNonce = await provider.getTransactionCount(address, 'pending');
    
    const nonceGap = pendingNonce - latestNonce;
    console.log('📊 [TransactionRescueService] Nonce counts:', {
      latestNonce,
      pendingNonce,
      difference: nonceGap
    });
    
    // Primary detection: Use nonce gap (most reliable)
    const stuckNonces: number[] = [];
    const pendingTxs: Array<{ hash: string | null; nonce: number; }> = [];
    
    if (nonceGap > 0) {
      // We have stuck transactions based on nonce gap
      for (let i = latestNonce; i < pendingNonce; i++) {
        stuckNonces.push(i);
        pendingTxs.push({
          hash: null, // Will try to find actual hash below
          nonce: i
        });
      }
      console.log(`🔍 [TransactionRescueService] Detected ${nonceGap} stuck transaction(s) from nonce gap: ${stuckNonces.join(', ')}`);
    }
    
    // Secondary: Try to find actual transaction hashes (optional, may fail)
    try {
      // Cast to JsonRpcProvider to access send method (only available on JsonRpcProvider)
      if (provider instanceof ethers.JsonRpcProvider) {
        const block = await provider.send('eth_getBlockByNumber', ['pending', false]);
        
        if (block && block.transactions && Array.isArray(block.transactions)) {
          console.log(`📡 [TransactionRescueService] Scanning ${block.transactions.length} mempool transactions for ${address}...`);
        
        // Limit scan to prevent rate limiting (max 50 transactions)
        const txHashesToScan = block.transactions.slice(0, 50);
        let foundCount = 0;
        
        for (const txHash of txHashesToScan) {
          if (typeof txHash !== 'string') continue;
          
          try {
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.from.toLowerCase() === address.toLowerCase()) {
              // Found a pending transaction from this address
              const existingEntry = pendingTxs.find(pt => pt.nonce === tx.nonce);
              if (existingEntry) {
                // Update with actual hash
                existingEntry.hash = tx.hash;
                foundCount++;
              } else {
                // Transaction not in nonce gap (shouldn't happen, but handle it)
                console.warn(`⚠️  [TransactionRescueService] Found pending tx with nonce ${tx.nonce} not in gap [${latestNonce}-${pendingNonce}): ${tx.hash}`);
              }
            }
          } catch (err) {
            // Silently skip failed transaction queries (rate limiting, etc.)
            continue;
          }
        }
        
        console.log(`✅ [TransactionRescueService] Found ${foundCount}/${stuckNonces.length} actual transaction hash(es) in mempool`);
      }
      } else {
        console.log('📡 [TransactionRescueService] Provider is not JsonRpcProvider, skipping mempool scan');
      }
    } catch (error) {
      console.log('📡 [TransactionRescueService] Could not scan mempool (provider limitation), using nonce-based detection only');
    }
    
    const result = {
      latestNonce,
      pendingNonce,
      stuckCount: stuckNonces.length,
      stuckNonces,
      pendingTxs
    };
    
    console.log('✅ [TransactionRescueService] Stuck transaction analysis:', {
      stuckCount: result.stuckCount,
      stuckNonces: result.stuckNonces,
      pendingTxHashes: pendingTxs.filter(tx => tx.hash).map(tx => tx.hash)
    });
    
    return result;
  }
}
