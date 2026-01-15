import {
  Client,
  Wallet,
  EscrowCreate,
  EscrowFinish,
  EscrowCancel,
  convertStringToHex,
  TxResponse
} from 'xrpl'
import * as crypto from 'crypto'

export interface EscrowCreateParams {
  wallet: Wallet
  destination: string
  amount: string
  finishAfter?: number // Unix timestamp
  cancelAfter?: number // Unix timestamp
  condition?: string // Hex-encoded condition
  destinationTag?: number
}

export class XRPLEscrowService {
  constructor(private client: Client) {}

  /**
   * Create time-based escrow
   */
  async createTimedEscrow(params: EscrowCreateParams): Promise<{
    sequence: number
    transactionHash: string
  }> {
    const tx: EscrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: params.wallet.address,
      Destination: params.destination,
      Amount: params.amount,
      FinishAfter: params.finishAfter,
      CancelAfter: params.cancelAfter,
      DestinationTag: params.destinationTag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    }) as TxResponse<EscrowCreate>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow creation failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      sequence: response.result.tx_json.Sequence!,
      transactionHash: response.result.hash
    }
  }

  /**
   * Create conditional escrow (with crypto-condition)
   */
  async createConditionalEscrow(
    params: EscrowCreateParams & { condition: string }
  ): Promise<{
    sequence: number
    transactionHash: string
    fulfillment: string // Return fulfillment for later use
  }> {
    const tx: EscrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: params.wallet.address,
      Destination: params.destination,
      Amount: params.amount,
      Condition: params.condition,
      CancelAfter: params.cancelAfter,
      DestinationTag: params.destinationTag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.wallet,
      autofill: true
    }) as TxResponse<EscrowCreate>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow creation failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      sequence: response.result.tx_json.Sequence!,
      transactionHash: response.result.hash,
      fulfillment: '' // Would be generated alongside condition
    }
  }

  /**
   * Finish escrow
   */
  async finishEscrow(
    wallet: Wallet,
    owner: string,
    sequence: number,
    condition?: string,
    fulfillment?: string
  ): Promise<{ transactionHash: string }> {
    const tx: EscrowFinish = {
      TransactionType: 'EscrowFinish',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: sequence,
      Condition: condition,
      Fulfillment: fulfillment
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<EscrowFinish>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow finish failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow finish failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Cancel escrow
   */
  async cancelEscrow(
    wallet: Wallet,
    owner: string,
    sequence: number
  ): Promise<{ transactionHash: string }> {
    const tx: EscrowCancel = {
      TransactionType: 'EscrowCancel',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: sequence
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<EscrowCancel>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Escrow cancellation failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow cancellation failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Generate crypto-condition and fulfillment
   */
  generateConditionAndFulfillment(preimage?: string): {
    condition: string
    fulfillment: string
  } {
    // Generate random preimage if not provided
    const actualPreimage = preimage || crypto.randomBytes(32).toString('hex')

    // Hash the preimage to create condition (using SHA-256)
    const conditionHash = crypto
      .createHash('sha256')
      .update(Buffer.from(actualPreimage, 'hex'))
      .digest('hex')

    // Create PREIMAGE-SHA-256 condition (simplified)
    const condition = 'A0258020' + conditionHash + '810102'
    const fulfillment = 'A0228020' + actualPreimage

    return {
      condition: condition.toUpperCase(),
      fulfillment: fulfillment.toUpperCase()
    }
  }

  /**
   * Get account escrows
   */
  async getAccountEscrows(address: string): Promise<Array<{
    account: string
    destination: string
    amount: string
    condition?: string
    finishAfter?: number
    cancelAfter?: number
    sequence: number
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'escrow',
      ledger_index: 'validated'
    })

    return response.result.account_objects.map((escrow: any) => ({
      account: escrow.Account,
      destination: escrow.Destination,
      amount: escrow.Amount,
      condition: escrow.Condition,
      finishAfter: escrow.FinishAfter,
      cancelAfter: escrow.CancelAfter,
      sequence: escrow.Sequence
    }))
  }
}
