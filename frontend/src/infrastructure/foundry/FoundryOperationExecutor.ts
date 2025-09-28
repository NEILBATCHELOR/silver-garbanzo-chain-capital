/**
 * FoundryOperationExecutor.ts
 * Executes token operations through Foundry-deployed smart contracts with policy integration
 */

import { ethers } from 'ethers';
import type { TransactionReceipt } from 'ethers';
import type { 
  OperationRequest, 
  TransactionResult,
  GasEstimate 
} from '../gateway/types';

export interface FoundryConfig {
  rpcUrl: string;
  privateKey?: string;
  tokenAddress: string;
  policyEngineAddress: string;
  network?: string;
}

export interface FoundryTransactionResult extends TransactionResult {
  receipt?: TransactionReceipt;
  policyId?: string;
  events?: ethers.EventLog[];
}

// ABI for PolicyProtectedToken contract
const TOKEN_ABI = [
  // Mint function
  "function mint(address to, uint256 amount) public",
  // Burn function  
  "function burn(uint256 amount) public",
  // Transfer function
  "function transfer(address to, uint256 amount) public returns (bool)",
  // Lock functions
  "function lockTokens(uint256 amount, uint256 duration) public",
  "function unlockTokens() public",
  // Block/Unblock functions
  "function blockAddress(address account, string reason) public",
  "function unblockAddress(address account) public",
  // View functions
  "function balanceOf(address account) public view returns (uint256)",
  "function lockedBalances(address account) public view returns (uint256)",
  "function blockedAddresses(address account) public view returns (bool)",
  "function unlockTime(address account) public view returns (uint256)",
  // Events
  "event TokensMinted(address indexed to, uint256 amount, bytes32 policyId)",
  "event TokensBurned(address indexed from, uint256 amount, bytes32 policyId)",
  "event TokensLocked(address indexed account, uint256 amount, uint256 unlockTime)",
  "event TokensUnlocked(address indexed account, uint256 amount)",
  "event AddressBlocked(address indexed account, string reason)",
  "event AddressUnblocked(address indexed account)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// ABI for PolicyEngine contract
const POLICY_ENGINE_ABI = [
  "function validateOperation(address operator, string operation, uint256 amount) public returns (bool)",
  "function getLastPolicyId() public view returns (bytes32)",
  "function createPolicy(string operation, string name, uint256 maxAmount, uint256 dailyLimit, uint256 cooldownPeriod) public",
  "event PolicyValidated(address operator, string operation, bool approved)"
];

export class FoundryOperationExecutor {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private tokenContract: ethers.Contract;
  private policyEngineContract: ethers.Contract;
  private config: FoundryConfig;

  constructor(config: FoundryConfig) {
    this.config = config;
    
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize signer if private key provided
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }
    
    // Initialize contracts
    this.tokenContract = new ethers.Contract(
      config.tokenAddress,
      TOKEN_ABI,
      this.signer || this.provider
    );
    
    this.policyEngineContract = new ethers.Contract(
      config.policyEngineAddress,
      POLICY_ENGINE_ABI,
      this.signer || this.provider
    );
  }

  /**
   * Connect a signer (wallet) to execute transactions
   */
  connectSigner(signer: ethers.Signer): void {
    this.signer = signer;
    this.tokenContract = this.tokenContract.connect(signer) as ethers.Contract;
    this.policyEngineContract = this.policyEngineContract.connect(signer) as ethers.Contract;
  }

  /**
   * Execute mint operation
   */
  async executeMint(
    to: string, 
    amount: bigint
  ): Promise<FoundryTransactionResult> {
    try {
      // Pre-check policy validation
      const signerAddress = await this.signer!.getAddress();
      const isValid = await this.policyEngineContract.validateOperation(
        signerAddress,
        'mint',
        amount
      );

      if (!isValid) {
        throw new Error('Operation violates policy');
      }

      // Execute mint
      const tx = await this.tokenContract.mint(to, amount);
      const receipt = await tx.wait();

      // Get policy ID from events
      const policyId = await this.policyEngineContract.getLastPolicyId();

      return await this.buildTransactionResult(receipt, policyId.toString());
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute burn operation
   */
  async executeBurn(amount: bigint): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.burn(amount);
      const receipt = await tx.wait();
      
      const policyId = await this.policyEngineContract.getLastPolicyId();
      
      return await this.buildTransactionResult(receipt, policyId.toString());
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute transfer operation
   */
  async executeTransfer(
    to: string, 
    amount: bigint
  ): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.transfer(to, amount);
      const receipt = await tx.wait();
      
      return await this.buildTransactionResult(receipt);
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute lock operation
   */
  async executeLock(
    amount: bigint, 
    duration: number
  ): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.lockTokens(amount, duration);
      const receipt = await tx.wait();
      
      return await this.buildTransactionResult(receipt);
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute unlock operation
   */
  async executeUnlock(): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.unlockTokens();
      const receipt = await tx.wait();
      
      return await this.buildTransactionResult(receipt);
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute block address operation
   */
  async executeBlock(
    account: string, 
    reason: string
  ): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.blockAddress(account, reason);
      const receipt = await tx.wait();
      
      return await this.buildTransactionResult(receipt);
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Execute unblock address operation
   */
  async executeUnblock(account: string): Promise<FoundryTransactionResult> {
    try {
      const tx = await this.tokenContract.unblockAddress(account);
      const receipt = await tx.wait();
      
      return await this.buildTransactionResult(receipt);
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.tokenContract.balanceOf(address);
  }

  /**
   * Get locked balance of an address
   */
  async getLockedBalance(address: string): Promise<bigint> {
    return await this.tokenContract.lockedBalances(address);
  }

  /**
   * Check if address is blocked
   */
  async isBlocked(address: string): Promise<boolean> {
    return await this.tokenContract.blockedAddresses(address);
  }

  /**
   * Get unlock time for an address
   */
  async getUnlockTime(address: string): Promise<bigint> {
    return await this.tokenContract.unlockTime(address);
  }

  /**
   * Validate operation against policy engine
   */
  async validateOperation(
    operator: string,
    operation: string,
    amount: bigint
  ): Promise<boolean> {
    try {
      return await this.policyEngineContract.validateOperation(
        operator,
        operation,
        amount
      );
    } catch (error: any) {
      console.error('Policy validation failed:', error);
      return false;
    }
  }

  /**
   * Create a new policy
   */
  async createPolicy(
    operation: string,
    name: string,
    maxAmount: bigint,
    dailyLimit: bigint,
    cooldownPeriod: number
  ): Promise<string> {
    try {
      const tx = await this.policyEngineContract.createPolicy(
        operation,
        name,
        maxAmount,
        dailyLimit,
        cooldownPeriod
      );
      
      const receipt = await tx.wait();
      
      // Extract policy ID from event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === 'PolicyCreated'
      );
      
      return event?.args?.[0] || 'unknown';
      
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Estimate gas for an operation
   */
  async estimateGas(
    operation: string,
    params: any[]
  ): Promise<bigint> {
    try {
      const method = this.tokenContract[operation];
      if (!method) {
        throw new Error(`Unknown operation: ${operation}`);
      }
      
      return await method.estimateGas(...params);
      
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      // Return default gas limit
      return BigInt(300000);
    }
  }

  /**
   * Build transaction result from receipt
   */
  private async buildTransactionResult(
    receipt: TransactionReceipt,
    policyId?: string
  ): Promise<FoundryTransactionResult> {
    const confirmations = await receipt.confirmations();
    
    return {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber || 0,
      gasUsed: receipt.gasUsed,
      status: receipt.status === 1 ? 'success' : 'failed',
      confirmations,
      timestamp: Date.now(),
      receipt,
      policyId,
      events: receipt.logs as ethers.EventLog[]
    };
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any): Error {
    if (error.reason) {
      // Ethers error with reason
      return new Error(`Transaction failed: ${error.reason}`);
    } else if (error.error?.message) {
      // RPC error
      return new Error(`RPC error: ${error.error.message}`);
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      return new Error('Insufficient funds for transaction');
    } else if (error.code === 'NONCE_TOO_LOW') {
      return new Error('Transaction nonce too low');
    } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
      return new Error('Replacement transaction underpriced');
    } else {
      return new Error(`Operation failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get current network information
   */
  async getNetwork(): Promise<ethers.Network> {
    return await this.provider.getNetwork();
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    hash: string,
    confirmations: number = 1
  ): Promise<TransactionReceipt | null> {
    return await this.provider.waitForTransaction(hash, confirmations);
  }
}
