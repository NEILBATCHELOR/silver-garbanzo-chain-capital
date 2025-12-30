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
    }
  ): Promise<ethers.TransactionResponse[]> {
    const gasPriceMultiplier = options?.gasPriceMultiplier || 1.5;
    
    console.log(`🚨 [Rescue] Clearing all stuck transactions for ${wallet.address}...`);
    
    // Get nonce information
    const latestNonce = await wallet.provider.getTransactionCount(wallet.address, 'latest');
    const pendingNonce = await wallet.provider.getTransactionCount(wallet.address, 'pending');
    
    console.log(`📊 [Rescue] Nonce status:`);
    console.log(`   - Latest (mined): ${latestNonce}`);
    console.log(`   - Pending: ${pendingNonce}`);
    console.log(`   - Stuck transactions: ${pendingNonce - latestNonce}`);
    
    if (pendingNonce === latestNonce) {
      console.log(`✅ [Rescue] No stuck transactions found`);
      return [];
    }
    
    // Cancel each stuck nonce
    const cancelTxs: ethers.TransactionResponse[] = [];
    for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
      console.log(`🚨 [Rescue] Canceling nonce ${nonce}...`);
      const cancelTx = await this.cancelTransaction(wallet, nonce, {
        gasPriceMultiplier,
        manualGasPrice: options?.manualGasPrice
      });
      cancelTxs.push(cancelTx);
      
      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ [Rescue] Sent ${cancelTxs.length} cancellation transactions`);
    return cancelTxs;
  }
  
  /**
   * Get information about stuck transactions
   */
  static async getStuckTransactionInfo(
    provider: ethers.Provider,
    address: string
  ): Promise<{
    latestNonce: number;
    pendingNonce: number;
    stuckCount: number;
    stuckNonces: number[];
  }> {
    const latestNonce = await provider.getTransactionCount(address, 'latest');
    const pendingNonce = await provider.getTransactionCount(address, 'pending');
    const stuckCount = pendingNonce - latestNonce;
    const stuckNonces = Array.from({ length: stuckCount }, (_, i) => latestNonce + i);
    
    return {
      latestNonce,
      pendingNonce,
      stuckCount,
      stuckNonces
    };
  }
}
