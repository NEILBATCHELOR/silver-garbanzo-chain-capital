/**
 * Foundry Operation Executor
 * Executes token operations through Foundry-deployed smart contracts
 * Integrates with PolicyEngine for on-chain validation
 */

import { ethers } from 'ethers';
import type { SupportedChain } from '../web3/adapters/IBlockchainAdapter';
import type { OperationRequest, TransactionResult, GasEstimate } from '../gateway/types';
import { FoundryPolicyAdapter } from './FoundryPolicyAdapter';

// Token contract ABIs (minimal interfaces)
const ERC20_ABI = [
  'function mint(address to, uint256 amount) external',
  'function burn(uint256 amount) external',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
] as const;

const ENHANCED_TOKEN_ABI = [
  ...ERC20_ABI,
  'function lockTokens(uint256 amount, uint256 duration) external',
  'function unlockTokens() external',
  'function blockAddress(address account, string reason) external',
  'function unblockAddress(address account) external',
  'function pause() external',
  'function unpause() external',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',
  'function lockedBalances(address account) external view returns (uint256)',
  'function unlockTime(address account) external view returns (uint256)',
  'function blockedAddresses(address account) external view returns (bool)',
  'event TokensMinted(address indexed to, uint256 amount, bytes32 policyId)',
  'event TokensBurned(address indexed from, uint256 amount, bytes32 policyId)',
  'event TokensLocked(address indexed account, uint256 amount, uint256 unlockTime)',
  'event TokensUnlocked(address indexed account, uint256 amount)',
  'event AddressBlocked(address indexed account, string reason)',
  'event AddressUnblocked(address indexed account)'
] as const;

export interface FoundryExecutorConfig {
  provider: ethers.Provider;
  signer?: ethers.Signer; // Optional: only required when Foundry validation is enabled
  policyEngineAddress: string;
  defaultGasLimit?: bigint;
}

export class FoundryOperationExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private policyAdapter: FoundryPolicyAdapter;
  private defaultGasLimit: bigint;

  constructor(config: FoundryExecutorConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.defaultGasLimit = config.defaultGasLimit || BigInt(500000);
    
    this.policyAdapter = new FoundryPolicyAdapter({
      policyEngineAddress: config.policyEngineAddress,
      provider: this.provider,
      signer: this.signer
    });
  }

  /**
   * Execute mint operation
   */
  async executeMint(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const to = request.parameters.to;
    const amount = ethers.parseUnits(
      request.parameters.amount?.toString() || '0',
      18
    );

    if (!to) {
      throw new Error('Recipient address required for mint operation');
    }

    // On-chain policy validation happens inside the contract's mint function
    // via the policyCompliant modifier, but we can pre-check here
    const operator = await this.signer.getAddress();
    const preCheck = await this.policyAdapter.canOperate(
      request.tokenAddress,
      operator,
      {
        type: 'mint',
        amount: request.parameters.amount,
        to,
        metadata: request.metadata
      }
    );

    if (!preCheck.approved) {
      throw new Error(`On-chain policy pre-check failed: ${preCheck.reason}`);
    }

    // Execute mint with gas limit
    const tx = await tokenContract.mint(to, amount, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute burn operation
   */
  async executeBurn(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const amount = ethers.parseUnits(
      request.parameters.amount?.toString() || '0',
      18
    );

    const tx = await tokenContract.burn(amount, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute transfer operation
   */
  async executeTransfer(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const to = request.parameters.to;
    const amount = ethers.parseUnits(
      request.parameters.amount?.toString() || '0',
      18
    );

    if (!to) {
      throw new Error('Recipient address required for transfer');
    }

    const tx = await tokenContract.transfer(to, amount, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute lock operation
   */
  async executeLock(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const amount = ethers.parseUnits(
      request.parameters.amount?.toString() || '0',
      18
    );
    const duration = request.parameters.duration || 0;

    if (duration <= 0) {
      throw new Error('Lock duration must be positive');
    }

    const tx = await tokenContract.lockTokens(amount, duration, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute unlock operation
   */
  async executeUnlock(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const tx = await tokenContract.unlockTokens({
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute block address operation
   */
  async executeBlock(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const addressToBlock = request.parameters.to;
    const reason = request.parameters.reason || 'Administrative action';

    if (!addressToBlock) {
      throw new Error('Address to block is required');
    }

    const tx = await tokenContract.blockAddress(addressToBlock, reason, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute unblock address operation
   */
  async executeUnblock(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const addressToUnblock = request.parameters.to;

    if (!addressToUnblock) {
      throw new Error('Address to unblock is required');
    }

    const tx = await tokenContract.unblockAddress(addressToUnblock, {
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute pause operation
   */
  async executePause(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const tx = await tokenContract.pause({
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Execute unpause operation
   */
  async executeUnpause(
    request: OperationRequest,
    gasEstimate: GasEstimate
  ): Promise<TransactionResult> {
    const tokenContract = new ethers.Contract(
      request.tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.signer
    );

    const tx = await tokenContract.unpause({
      gasLimit: gasEstimate.limit || this.defaultGasLimit
    });

    const receipt = await tx.wait();

    return this.buildTransactionResult(receipt, request);
  }

  /**
   * Get account balance
   */
  async getBalance(tokenAddress: string, account: string): Promise<string> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      this.provider
    );

    const balance = await tokenContract.balanceOf(account);
    return ethers.formatUnits(balance, 18);
  }

  /**
   * Get locked balance
   */
  async getLockedBalance(tokenAddress: string, account: string): Promise<string> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.provider
    );

    const locked = await tokenContract.lockedBalances(account);
    return ethers.formatUnits(locked, 18);
  }

  /**
   * Get unlock time
   */
  async getUnlockTime(tokenAddress: string, account: string): Promise<number> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.provider
    );

    const unlockTime = await tokenContract.unlockTime(account);
    return Number(unlockTime);
  }

  /**
   * Check if address is blocked
   */
  async isBlocked(tokenAddress: string, account: string): Promise<boolean> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ENHANCED_TOKEN_ABI,
      this.provider
    );

    return await tokenContract.blockedAddresses(account);
  }

  /**
   * Build transaction result from receipt
   */
  private buildTransactionResult(
    receipt: ethers.TransactionReceipt,
    request: OperationRequest
  ): TransactionResult {
    return {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status === 1 ? 'success' : 'failed',
      confirmations: 1, // Default to 1 confirmation since receipt is already confirmed
      timestamp: Date.now(),
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data
      }))
    };
  }

  /**
   * Get policy adapter for advanced policy operations
   */
  getPolicyAdapter(): FoundryPolicyAdapter {
    return this.policyAdapter;
  }
}
