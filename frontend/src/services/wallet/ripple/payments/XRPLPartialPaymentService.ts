import { Client, Wallet, Payment, PaymentFlags, TxResponse } from 'xrpl'

export class XRPLPartialPaymentService {
  constructor(private client: Client) {}

  /**
   * Send partial payment
   * Allows sending less than requested if full amount unavailable
   */
  async sendPartialPayment(
    sender: Wallet,
    destination: string,
    amount: string | { currency: string; issuer: string; value: string },
    deliverMin?: string | { currency: string; issuer: string; value: string }
  ): Promise<{
    transactionHash: string
    delivered: string | object
  }> {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: sender.address,
      Destination: destination,
      Amount: amount,
      DeliverMin: deliverMin,
      Flags: PaymentFlags.tfPartialPayment
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: sender,
      autofill: true
    }) as TxResponse<Payment>

    // Type guard for meta
    if (typeof response.result.meta === 'string') {
      throw new Error(`Partial payment failed: ${response.result.meta}`)
    }

    if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Partial payment failed: ${response.result.meta.TransactionResult}`)
    }

    // Extract actual delivered amount from metadata
    const delivered = (response.result.meta as any).delivered_amount || amount

    return {
      transactionHash: response.result.hash,
      delivered
    }
  }

  /**
   * Verify partial payment (important to check delivered amount!)
   */
  verifyDeliveredAmount(
    meta: any,
    expectedMinimum: string
  ): {
    wasPartial: boolean
    delivered: string
    meetsMinimum: boolean
  } {
    const deliveredAmount = meta.delivered_amount || '0'
    const isPartial = !!meta.DeliveredAmount

    return {
      wasPartial: isPartial,
      delivered: deliveredAmount,
      meetsMinimum: parseFloat(deliveredAmount) >= parseFloat(expectedMinimum)
    }
  }
}
