import {
  Client,
  Wallet,
  CheckCreate,
  CheckCash,
  CheckCancel,
  TxResponse
} from 'xrpl'

export interface CheckCreateParams {
  sender: Wallet
  destination: string
  sendMax: string | { currency: string; issuer: string; value: string }
  destinationTag?: number
  expiration?: number
  invoiceID?: string
}

export class XRPLCheckService {
  constructor(private client: Client) {}

  /**
   * Create check
   */
  async createCheck(params: CheckCreateParams): Promise<{
    checkId: string
    transactionHash: string
  }> {
    const tx: CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: params.sender.address,
      Destination: params.destination,
      SendMax: params.sendMax,
      DestinationTag: params.destinationTag,
      Expiration: params.expiration,
      InvoiceID: params.invoiceID
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.sender,
      autofill: true
    }) as TxResponse<CheckCreate>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Check creation failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check creation failed: ${response.result.meta.TransactionResult}`)
    }

    const checkId = this.extractCheckId(response.result.meta)

    return {
      checkId,
      transactionHash: response.result.hash
    }
  }

  /**
   * Cash check with exact amount
   */
  async cashCheckExact(
    destination: Wallet,
    checkId: string,
    amount: string | { currency: string; issuer: string; value: string }
  ): Promise<{ transactionHash: string }> {
    const tx: CheckCash = {
      TransactionType: 'CheckCash',
      Account: destination.address,
      CheckID: checkId,
      Amount: amount
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: destination,
      autofill: true
    }) as TxResponse<CheckCash>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Check cashing failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check cashing failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Cash check with delivery amount
   */
  async cashCheckFlexible(
    destination: Wallet,
    checkId: string,
    deliverMin: string | { currency: string; issuer: string; value: string }
  ): Promise<{ transactionHash: string }> {
    const tx: CheckCash = {
      TransactionType: 'CheckCash',
      Account: destination.address,
      CheckID: checkId,
      DeliverMin: deliverMin
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: destination,
      autofill: true
    }) as TxResponse<CheckCash>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Check cashing failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check cashing failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Cancel check
   */
  async cancelCheck(
    wallet: Wallet,
    checkId: string
  ): Promise<{ transactionHash: string }> {
    const tx: CheckCancel = {
      TransactionType: 'CheckCancel',
      Account: wallet.address,
      CheckID: checkId
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<CheckCancel>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Check cancellation failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check cancellation failed: ${response.result.meta.TransactionResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Get account checks
   */
  async getAccountChecks(address: string): Promise<Array<{
    checkId: string
    account: string
    destination: string
    sendMax: string | object
    expiration?: number
    invoiceID?: string
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'check',
      ledger_index: 'validated'
    })

    return response.result.account_objects.map((check: any) => ({
      checkId: check.index,
      account: check.Account,
      destination: check.Destination,
      sendMax: check.SendMax,
      expiration: check.Expiration,
      invoiceID: check.InvoiceID
    }))
  }

  private extractCheckId(meta: any): string {
    const createdNode = meta.AffectedNodes?.find(
      (node: any) => node.CreatedNode?.LedgerEntryType === 'Check'
    )
    return createdNode?.CreatedNode?.LedgerIndex || ''
  }
}
