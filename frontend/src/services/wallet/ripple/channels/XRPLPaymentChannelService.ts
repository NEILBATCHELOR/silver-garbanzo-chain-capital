import { 
  Client, 
  Wallet, 
  PaymentChannelCreate,
  PaymentChannelFund,
  PaymentChannelClaim,
  hashes,
  TxResponse
} from 'xrpl'

export interface ChannelCreateParams {
  source: Wallet
  destination: string
  amount: string
  settleDelay: number // seconds
  publicKey?: string
  cancelAfter?: number
  destinationTag?: number
}

export class XRPLPaymentChannelService {
  constructor(private client: Client) {}

  /**
   * Create payment channel
   */
  async createChannel(params: ChannelCreateParams): Promise<{
    channelId: string
    transactionHash: string
  }> {
    const tx: PaymentChannelCreate = {
      TransactionType: 'PaymentChannelCreate',
      Account: params.source.address,
      Destination: params.destination,
      Amount: params.amount,
      SettleDelay: params.settleDelay,
      PublicKey: params.publicKey || params.source.publicKey,
      CancelAfter: params.cancelAfter,
      DestinationTag: params.destinationTag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: params.source,
      autofill: true
    }) as TxResponse<PaymentChannelCreate>

    // Type guard for meta
    if (typeof response.result.meta === 'string' || 
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      const result = typeof response.result.meta === 'string' 
        ? response.result.meta 
        : response.result.meta.TransactionResult
      throw new Error(`Channel creation failed: ${result}`)
    }

    // Calculate channel ID
    const channelId = hashes.hashPaymentChannel(
      params.source.address,
      params.destination,
      response.result.tx_json.Sequence!
    )

    return {
      channelId,
      transactionHash: response.result.hash
    }
  }

  /**
   * Fund existing payment channel
   */
  async fundChannel(
    source: Wallet,
    channelId: string,
    amount: string,
    expiration?: number
  ): Promise<{ transactionHash: string }> {
    const tx: PaymentChannelFund = {
      TransactionType: 'PaymentChannelFund',
      Account: source.address,
      Channel: channelId,
      Amount: amount,
      Expiration: expiration
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: source,
      autofill: true
    }) as TxResponse<PaymentChannelFund>

    // Type guard for meta
    if (typeof response.result.meta === 'string' || 
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      const result = typeof response.result.meta === 'string' 
        ? response.result.meta 
        : response.result.meta.TransactionResult
      throw new Error(`Channel funding failed: ${result}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Claim from payment channel
   */
  async claimChannel(
    destination: Wallet,
    channelId: string,
    amount: string,
    signature?: string,
    publicKey?: string
  ): Promise<{ transactionHash: string }> {
    const tx: PaymentChannelClaim = {
      TransactionType: 'PaymentChannelClaim',
      Account: destination.address,
      Channel: channelId,
      Amount: amount,
      Signature: signature,
      PublicKey: publicKey
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: destination,
      autofill: true
    }) as TxResponse<PaymentChannelClaim>

    // Type guard for meta
    if (typeof response.result.meta === 'string' || 
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      const result = typeof response.result.meta === 'string' 
        ? response.result.meta 
        : response.result.meta.TransactionResult
      throw new Error(`Channel claim failed: ${result}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Close payment channel
   */
  async closeChannel(
    wallet: Wallet,
    channelId: string
  ): Promise<{ transactionHash: string }> {
    const tx: PaymentChannelClaim = {
      TransactionType: 'PaymentChannelClaim',
      Account: wallet.address,
      Channel: channelId,
      Flags: 0x00010000 // tfClose
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<PaymentChannelClaim>

    // Type guard for meta
    if (typeof response.result.meta === 'string' || 
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      const result = typeof response.result.meta === 'string' 
        ? response.result.meta 
        : response.result.meta.TransactionResult
      throw new Error(`Channel closing failed: ${result}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }

  /**
   * Generate claim signature for payment channel
   */
  generateClaimSignature(
    wallet: Wallet,
    channelId: string,
    amount: string
  ): string {
    // Create claim message
    const message = channelId + amount

    // Sign the message
    const signature = wallet.sign(message as any)

    return signature.hash || ''
  }

  /**
   * Verify claim signature
   */
  verifyClaimSignature(
    channelId: string,
    amount: string,
    signature: string,
    publicKey: string
  ): boolean {
    // Verification logic would use XRPL's verification methods
    // This is a placeholder for the actual implementation
    return true
  }

  /**
   * Get payment channel details
   */
  async getChannelDetails(channelId: string): Promise<{
    account: string
    destination: string
    amount: string
    balance: string
    settleDelay: number
    publicKey: string
    expiration?: number
    cancelAfter?: number
  }> {
    const response = await this.client.request({
      command: 'ledger_entry',
      paychan: channelId,
      ledger_index: 'validated'
    })

    const channel = response.result.node as any

    return {
      account: channel.Account,
      destination: channel.Destination,
      amount: channel.Amount,
      balance: channel.Balance,
      settleDelay: channel.SettleDelay,
      publicKey: channel.PublicKey,
      expiration: channel.Expiration,
      cancelAfter: channel.CancelAfter
    }
  }

  /**
   * Get account payment channels
   */
  async getAccountChannels(address: string): Promise<Array<{
    channelId: string
    destination: string
    amount: string
    balance: string
  }>> {
    const response = await this.client.request({
      command: 'account_channels',
      account: address,
      ledger_index: 'validated'
    })

    return response.result.channels.map((channel: any) => ({
      channelId: channel.channel_id,
      destination: channel.destination_account,
      amount: channel.amount,
      balance: channel.balance
    }))
  }
}
