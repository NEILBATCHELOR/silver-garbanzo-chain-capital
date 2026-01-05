/**
 * Transaction Analyzer
 * 
 * Comprehensive analysis of deployment transactions:
 * - Identifies transaction types (contract creation, method calls, transfers)
 * - Decodes method signatures and parameters
 * - Tracks token transfers via events
 * - Analyzes transaction flow and sequence
 */

import { ethers } from 'ethers';

/**
 * Transaction types
 */
export enum TransactionType {
  CONTRACT_CREATION = 'CONTRACT_CREATION',
  METHOD_CALL = 'METHOD_CALL',
  TOKEN_TRANSFER = 'TOKEN_TRANSFER',
  NATIVE_TRANSFER = 'NATIVE_TRANSFER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Decoded method call
 */
export interface DecodedMethod {
  signature: string;
  name: string;
  params: Array<{
    name: string;
    type: string;
    value: any;
  }>;
}

/**
 * Token transfer event
 */
export interface TokenTransferEvent {
  token: string;
  from: string;
  to: string;
  amount: string;
  tokenId?: string; // For NFTs
}

/**
 * Transaction analysis result
 */
export interface TransactionAnalysis {
  hash: string;
  type: TransactionType;
  from: string;
  to: string | null;
  value: string;
  blockNumber: number;
  timestamp: number;
  gasUsed: string;
  
  // For contract creation
  deployedContract?: string;
  
  // For method calls
  methodSignature?: string;
  decodedMethod?: DecodedMethod;
  
  // Events - use readonly to match ethers types
  logs: readonly any[];
  tokenTransfers: TokenTransferEvent[];
  
  // Status
  success: boolean;
  error?: string;
}

/**
 * Transaction sequence analysis
 */
export interface SequenceAnalysis {
  transactions: TransactionAnalysis[];
  contractsDeployed: string[];
  methodsCalled: string[];
  tokensTransferred: number;
  totalGasUsed: string;
  timespan: number; // seconds between first and last
}

/**
 * Common method signatures for quick identification
 */
const COMMON_SIGNATURES = {
  // ERC20
  'transfer(address,uint256)': '0xa9059cbb',
  'transferFrom(address,address,uint256)': '0x23b872dd',
  'approve(address,uint256)': '0x095ea7b3',
  
  // Module linkage
  'setFeesModule(address)': '0x...',
  'setVestingModule(address)': '0x...',
  
  // Module configuration
  'setTransferFee(uint256)': '0x...',
  'setFeeRecipient(address)': '0x...',
  
  // Add more as needed
};

/**
 * Event signatures
 */
const EVENT_SIGNATURES = {
  Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  Approval: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
};

/**
 * Transaction Analyzer Service
 */
export class TransactionAnalyzer {
  private provider: ethers.JsonRpcProvider;
  private methodNameCache: Map<string, string>;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
    this.methodNameCache = new Map();
  }

  /**
   * Analyze a single transaction
   */
  async analyzeTransaction(txHash: string): Promise<TransactionAnalysis> {
    // Fetch transaction and receipt
    const [tx, receipt] = await Promise.all([
      this.provider.getTransaction(txHash),
      this.provider.getTransactionReceipt(txHash)
    ]);

    if (!tx || !receipt) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    // Determine transaction type
    const type = this.determineTransactionType(tx, receipt);

    // Base analysis
    const analysis: TransactionAnalysis = {
      hash: txHash,
      type,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      blockNumber: receipt.blockNumber,
      timestamp: 0, // Will fetch separately
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs,
      tokenTransfers: [],
      success: receipt.status === 1
    };

    // Get timestamp
    const block = await this.provider.getBlock(receipt.blockNumber);
    if (block) {
      analysis.timestamp = block.timestamp;
    }

    // Analyze based on type
    if (type === TransactionType.CONTRACT_CREATION) {
      analysis.deployedContract = receipt.contractAddress || undefined;
    } else if (type === TransactionType.METHOD_CALL) {
      analysis.methodSignature = tx.data.substring(0, 10);
      analysis.decodedMethod = await this.decodeMethodCall(tx.data, tx.to);
    }

    // Extract token transfers from logs
    analysis.tokenTransfers = this.extractTokenTransfers(receipt.logs);

    // Extract error if failed
    if (!analysis.success) {
      analysis.error = 'Transaction reverted';
      // Could fetch revert reason here
    }

    return analysis;
  }

  /**
   * Analyze multiple transactions as a sequence
   */
  async analyzeSequence(txHashes: string[]): Promise<SequenceAnalysis> {
    const transactions = await Promise.all(
      txHashes.map(hash => this.analyzeTransaction(hash))
    );

    // Sort by block number and index
    transactions.sort((a, b) => a.blockNumber - b.blockNumber);

    // Aggregate data
    const contractsDeployed = transactions
      .filter(tx => tx.type === TransactionType.CONTRACT_CREATION && tx.deployedContract)
      .map(tx => tx.deployedContract!);

    const methodsCalled = transactions
      .filter(tx => tx.decodedMethod)
      .map(tx => tx.decodedMethod!.name);

    const tokensTransferred = transactions.reduce(
      (sum, tx) => sum + tx.tokenTransfers.length,
      0
    );

    const totalGasUsed = transactions.reduce(
      (sum, tx) => sum + BigInt(tx.gasUsed),
      BigInt(0)
    ).toString();

    const timespan = transactions.length > 1
      ? transactions[transactions.length - 1].timestamp - transactions[0].timestamp
      : 0;

    return {
      transactions,
      contractsDeployed,
      methodsCalled,
      tokensTransferred,
      totalGasUsed,
      timespan
    };
  }

  /**
   * Determine transaction type
   */
  private determineTransactionType(
    tx: ethers.TransactionResponse,
    receipt: ethers.TransactionReceipt
  ): TransactionType {
    // Contract creation
    if (tx.to === null && receipt.contractAddress) {
      return TransactionType.CONTRACT_CREATION;
    }

    // Native transfer (no data)
    if (tx.data === '0x' || tx.data === '0x00') {
      return TransactionType.NATIVE_TRANSFER;
    }

    // Check if it's a token transfer method call
    const methodSig = tx.data.substring(0, 10);
    if (
      methodSig === COMMON_SIGNATURES['transfer(address,uint256)'] ||
      methodSig === COMMON_SIGNATURES['transferFrom(address,address,uint256)']
    ) {
      return TransactionType.TOKEN_TRANSFER;
    }

    // Default to method call
    return TransactionType.METHOD_CALL;
  }

  /**
   * Decode method call
   */
  private async decodeMethodCall(
    data: string,
    to: string | null
  ): Promise<DecodedMethod | undefined> {
    if (!to || data.length < 10) {
      return undefined;
    }

    const methodSig = data.substring(0, 10);
    
    // Try to get method name from cache or common signatures
    let methodName = this.methodNameCache.get(methodSig);
    
    if (!methodName) {
      methodName = this.lookupMethodSignature(methodSig);
      if (methodName) {
        this.methodNameCache.set(methodSig, methodName);
      }
    }

    // For now, return basic decoded info
    // Could enhance with ABI decoding if contract ABI is available
    return {
      signature: methodSig,
      name: methodName || 'unknown',
      params: [] // Would need ABI to decode params
    };
  }

  /**
   * Look up method signature
   */
  private lookupMethodSignature(sig: string): string | undefined {
    // Reverse lookup in COMMON_SIGNATURES
    for (const [name, signature] of Object.entries(COMMON_SIGNATURES)) {
      if (signature === sig) {
        return name;
      }
    }

    // Could call external API like 4byte.directory here
    return undefined;
  }

  /**
   * Extract token transfers from logs
   */
  private extractTokenTransfers(logs: readonly any[]): TokenTransferEvent[] {
    const transfers: TokenTransferEvent[] = [];

    for (const log of logs) {
      // Check if it's a Transfer event
      if (log.topics[0] === EVENT_SIGNATURES.Transfer) {
        // Decode Transfer event
        // topics[0] = event signature
        // topics[1] = from (indexed)
        // topics[2] = to (indexed)
        // data = value/tokenId

        const from = ethers.getAddress('0x' + log.topics[1].substring(26));
        const to = ethers.getAddress('0x' + log.topics[2].substring(26));

        // Try to decode value/tokenId from data
        let amount = '0';
        let tokenId: string | undefined;

        if (log.data && log.data !== '0x') {
          try {
            // For fungible tokens
            amount = BigInt(log.data).toString();
          } catch {
            // Might be NFT tokenId
            tokenId = BigInt(log.data).toString();
          }
        }

        transfers.push({
          token: log.address,
          from,
          to,
          amount,
          tokenId
        });
      }
    }

    return transfers;
  }

  /**
   * Format transaction analysis for display
   */
  formatAnalysis(analysis: TransactionAnalysis): string {
    let output = `Transaction: ${analysis.hash}\n`;
    output += `Type: ${analysis.type}\n`;
    output += `From: ${analysis.from}\n`;
    output += `To: ${analysis.to || 'Contract Creation'}\n`;
    output += `Status: ${analysis.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `Gas Used: ${analysis.gasUsed}\n`;

    if (analysis.deployedContract) {
      output += `Deployed Contract: ${analysis.deployedContract}\n`;
    }

    if (analysis.decodedMethod) {
      output += `Method: ${analysis.decodedMethod.name}\n`;
    }

    if (analysis.tokenTransfers.length > 0) {
      output += `Token Transfers: ${analysis.tokenTransfers.length}\n`;
      for (const transfer of analysis.tokenTransfers) {
        output += `  - ${transfer.amount || transfer.tokenId} from ${transfer.from} to ${transfer.to}\n`;
      }
    }

    return output;
  }
}

/**
 * Create transaction analyzer instance
 */
export function createTransactionAnalyzer(
  provider: ethers.JsonRpcProvider
): TransactionAnalyzer {
  return new TransactionAnalyzer(provider);
}
