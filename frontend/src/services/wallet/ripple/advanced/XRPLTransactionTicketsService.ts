/**
 * XRPL Transaction Tickets Service (SDK Compliant)
 * Transaction ticket creation and management for pre-sequenced transactions
 */

import { Client, Wallet, TicketCreate } from 'xrpl'
import type { TxResponse, Transaction, SubmittableTransaction } from 'xrpl'
import {
  TicketCreateParams,
  TicketCreateResult,
  getTransactionResult
} from './types'

export class XRPLTransactionTicketsService {
  constructor(private client: Client) {}

  /**
   * Create transaction tickets
   * Tickets allow pre-sequencing transactions for parallel submission
   */
  async createTickets(
    wallet: Wallet,
    ticketCount: number
  ): Promise<TicketCreateResult> {
    // Get current sequence
    const accountInfo = await this.client.request({
      command: 'account_info',
      account: wallet.address,
      ledger_index: 'validated'
    })

    const currentSequence = accountInfo.result.account_data.Sequence

    const tx: TicketCreate = {
      TransactionType: 'TicketCreate',
      Account: wallet.address,
      TicketCount: ticketCount
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Ticket creation failed: ${txResult}`)
    }

    // Calculate ticket sequences
    // Tickets are assigned sequences from current sequence to current + ticket count
    const firstTicketSequence = currentSequence
    const lastTicketSequence = currentSequence + ticketCount - 1
    const ticketSequences = Array.from(
      { length: ticketCount },
      (_, i) => currentSequence + i
    )

    return {
      transactionHash: response.result.hash,
      ticketSequences,
      firstTicketSequence,
      lastTicketSequence
    }
  }

  /**
   * Get available tickets for account
   */
  async getAvailableTickets(address: string): Promise<Array<{
    ticketSequence: number
    ledgerIndex: number
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'ticket',
      ledger_index: 'validated'
    })

    return response.result.account_objects.map((obj: any) => ({
      ticketSequence: obj.TicketSequence,
      ledgerIndex: obj.LedgerEntryType === 'Ticket' ? obj.PreviousTxnLgrSeq : 0
    }))
  }

  /**
   * Submit transaction using ticket
   * This allows transactions to be submitted out of order
   */
  async submitWithTicket(
    wallet: Wallet,
    transaction: Transaction | Record<string, any>,
    ticketSequence: number
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    // Prepare transaction with ticket
    const tx = {
      ...transaction,
      Account: wallet.address,
      TicketSequence: ticketSequence,
      Sequence: 0 // Must be 0 when using tickets
    }

    const prepared = await this.client.autofill(tx as any)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Ticketed transaction failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Check if ticket is available
   */
  async isTicketAvailable(
    address: string,
    ticketSequence: number
  ): Promise<boolean> {
    const tickets = await this.getAvailableTickets(address)
    return tickets.some(t => t.ticketSequence === ticketSequence)
  }

  /**
   * Get ticket count for account
   */
  async getTicketCount(address: string): Promise<number> {
    const tickets = await this.getAvailableTickets(address)
    return tickets.length
  }

  /**
   * Batch create and use tickets
   * Useful for submitting multiple transactions in parallel
   */
  async batchSubmitWithTickets(
    wallet: Wallet,
    transactions: Array<Transaction | Record<string, any>>
  ): Promise<Array<{
    transactionHash: string
    ledgerIndex: number
    ticketUsed: number
  }>> {
    // Create enough tickets
    const ticketResult = await this.createTickets(wallet, transactions.length)

    // Submit all transactions using tickets
    const results = await Promise.all(
      transactions.map(async (tx, index) => {
        const ticketSequence = ticketResult.ticketSequences[index]
        const result = await this.submitWithTicket(wallet, tx, ticketSequence)
        return {
          ...result,
          ticketUsed: ticketSequence
        }
      })
    )

    return results
  }
}
