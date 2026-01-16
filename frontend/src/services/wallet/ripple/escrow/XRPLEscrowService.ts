import {
  Client,
  Wallet,
  EscrowCreate,
  EscrowFinish,
  EscrowCancel,
  convertStringToHex,
  TxResponse
} from 'xrpl';
import * as crypto from 'crypto';
import {
  XRPLEscrowDatabaseService,
  EscrowRecord
} from './XRPLEscrowDatabaseService';

export interface EscrowCreateParams {
  projectId: string; // REQUIRED for database tracking
  wallet: Wallet;
  destination: string;
  amount: string;
  finishAfter?: number; // Unix timestamp
  cancelAfter?: number; // Unix timestamp
  condition?: string; // Hex-encoded condition
  destinationTag?: number;
}

/**
 * XRPL Escrow Service
 * 
 * Manages escrow transactions for time-based and conditional payments.
 * 
 * IMPORTANT: Flow: Blockchain first → Database second (for audit trail and querying)
 * All methods now require projectId for multi-tenant isolation.
 */
export class XRPLEscrowService {
  constructor(private client: Client) {}

  /**
   * Create time-based escrow
   * 1. Creates escrow on blockchain
   * 2. Saves escrow to database with project_id
   */
  async createTimedEscrow(params: EscrowCreateParams): Promise<{
    sequence: number;
    transactionHash: string;
  }> {
    // 1. BLOCKCHAIN OPERATION
    const tx: EscrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: params.wallet.address,
      Destination: params.destination,
      Amount: params.amount,
      FinishAfter: params.finishAfter,
      CancelAfter: params.cancelAfter,
      DestinationTag: params.destinationTag
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    }) as TxResponse<EscrowCreate>;

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow creation failed: ${response.result.meta}`);
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${response.result.meta.TransactionResult}`);
    }

    const sequence = response.result.tx_json.Sequence!;

    // 2. DATABASE OPERATION
    const escrowRecord: EscrowRecord = {
      project_id: params.projectId,
      owner_address: params.wallet.address,
      destination_address: params.destination,
      amount: params.amount,
      sequence,
      finish_after: params.finishAfter ? new Date(params.finishAfter * 1000).toISOString() : undefined,
      cancel_after: params.cancelAfter ? new Date(params.cancelAfter * 1000).toISOString() : undefined,
      destination_tag: params.destinationTag,
      status: 'active',
      creation_transaction_hash: response.result.hash
    };

    await XRPLEscrowDatabaseService.createEscrow(escrowRecord);

    return {
      sequence,
      transactionHash: response.result.hash
    };
  }

  /**
   * Create conditional escrow (with crypto-condition)
   * 1. Creates conditional escrow on blockchain
   * 2. Saves escrow to database with project_id and fulfillment
   */
  async createConditionalEscrow(
    params: EscrowCreateParams & { condition: string }
  ): Promise<{
    sequence: number;
    transactionHash: string;
    fulfillment: string; // Return fulfillment for later use
  }> {
    // 1. BLOCKCHAIN OPERATION
    const tx: EscrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: params.wallet.address,
      Destination: params.destination,
      Amount: params.amount,
      Condition: params.condition,
      CancelAfter: params.cancelAfter,
      DestinationTag: params.destinationTag
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    }) as TxResponse<EscrowCreate>;

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow creation failed: ${response.result.meta}`);
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${response.result.meta.TransactionResult}`);
    }

    const sequence = response.result.tx_json.Sequence!;

    // Generate fulfillment (would be done before creating the condition in real usage)
    const fulfillment = ''; // Would be provided alongside condition

    // 2. DATABASE OPERATION
    const escrowRecord: EscrowRecord = {
      project_id: params.projectId,
      owner_address: params.wallet.address,
      destination_address: params.destination,
      amount: params.amount,
      sequence,
      condition: params.condition,
      fulfillment, // Store for reference
      cancel_after: params.cancelAfter ? new Date(params.cancelAfter * 1000).toISOString() : undefined,
      destination_tag: params.destinationTag,
      status: 'active',
      creation_transaction_hash: response.result.hash
    };

    await XRPLEscrowDatabaseService.createEscrow(escrowRecord);

    return {
      sequence,
      transactionHash: response.result.hash,
      fulfillment
    };
  }

  /**
   * Finish escrow
   * 1. Finishes escrow on blockchain
   * 2. Updates escrow status in database
   */
  async finishEscrow(
    projectId: string,
    wallet: Wallet,
    owner: string,
    sequence: number,
    condition?: string,
    fulfillment?: string
  ): Promise<{ transactionHash: string }> {
    // 1. BLOCKCHAIN OPERATION
    const tx: EscrowFinish = {
      TransactionType: 'EscrowFinish',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: sequence,
      Condition: condition,
      Fulfillment: fulfillment
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<EscrowFinish>;

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow finish failed: ${response.result.meta}`);
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow finish failed: ${response.result.meta.TransactionResult}`);
    }

    // 2. DATABASE OPERATION
    await XRPLEscrowDatabaseService.updateEscrowStatus(
      projectId,
      owner,
      sequence,
      'finished',
      response.result.hash
    );

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Cancel escrow
   * 1. Cancels escrow on blockchain
   * 2. Updates escrow status in database
   */
  async cancelEscrow(
    projectId: string,
    wallet: Wallet,
    owner: string,
    sequence: number
  ): Promise<{ transactionHash: string }> {
    // 1. BLOCKCHAIN OPERATION
    const tx: EscrowCancel = {
      TransactionType: 'EscrowCancel',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: sequence
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<EscrowCancel>;

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow cancellation failed: ${response.result.meta}`);
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow cancellation failed: ${response.result.meta.TransactionResult}`);
    }

    // 2. DATABASE OPERATION
    await XRPLEscrowDatabaseService.updateEscrowStatus(
      projectId,
      owner,
      sequence,
      'canceled',
      response.result.hash
    );

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Generate crypto-condition and fulfillment
   */
  generateConditionAndFulfillment(preimage?: string): {
    condition: string;
    fulfillment: string;
  } {
    // Generate random preimage if not provided
    const actualPreimage = preimage || crypto.randomBytes(32).toString('hex');

    // Hash the preimage to create condition (using SHA-256)
    const conditionHash = crypto
      .createHash('sha256')
      .update(Buffer.from(actualPreimage, 'hex'))
      .digest('hex');

    // Create PREIMAGE-SHA-256 condition (simplified)
    const condition = 'A0258020' + conditionHash + '810102';
    const fulfillment = 'A0228020' + actualPreimage;

    return {
      condition: condition.toUpperCase(),
      fulfillment: fulfillment.toUpperCase()
    };
  }

  /**
   * Get account escrows (blockchain only)
   */
  async getAccountEscrows(address: string): Promise<Array<{
    account: string;
    destination: string;
    amount: string;
    condition?: string;
    finishAfter?: number;
    cancelAfter?: number;
    sequence: number;
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'escrow',
      ledger_index: 'validated'
    });

    return response.result.account_objects.map((escrow: any) => ({
      account: escrow.Account,
      destination: escrow.Destination,
      amount: escrow.Amount,
      condition: escrow.Condition,
      finishAfter: escrow.FinishAfter,
      cancelAfter: escrow.CancelAfter,
      sequence: escrow.Sequence
    }));
  }
}
