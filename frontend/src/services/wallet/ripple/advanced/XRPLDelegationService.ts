/**
 * XRPL Delegation Service (SDK Compliant)
 * Account delegation and permission management
 * 
 * Note: DelegateSet (XLS-46d) is a draft standard and may not be available on all networks.
 * This implementation uses type assertions to work with the draft specification.
 */

import { Client, Wallet } from 'xrpl'
import type { TxResponse } from 'xrpl'
import {
  DelegatePermission,
  DelegateSetParams,
  getTransactionResult
} from './types'

export class XRPLDelegationService {
  constructor(private client: Client) {}

  /**
   * Authorize delegate for account
   * Note: XLS-46d DelegateSet is a draft standard
   */
  async authorizeDelegate(
    wallet: Wallet,
    delegateAddress: string,
    permissions: DelegatePermission[]
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    // DelegateSet transaction (XLS-46d draft) - cast to any since it's not in SDK yet
    const tx = {
      TransactionType: 'DelegateSet',
      Account: wallet.address,
      Authorize: delegateAddress,
      Permissions: permissions
    } as any

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<any>

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Delegate authorization failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Revoke delegate authorization
   */
  async revokeDelegate(
    wallet: Wallet,
    delegateAddress: string
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx = {
      TransactionType: 'DelegateSet',
      Account: wallet.address,
      Unauthorize: delegateAddress
    } as any

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    }) as TxResponse<any>

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Delegate revocation failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Get delegates for account
   * Note: This queries account_objects for delegate entries
   */
  async getDelegates(address: string): Promise<Array<{
    delegateAddress: string
    permissions: DelegatePermission[]
  }>> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'delegate' as any, // Cast since delegate type may not be in SDK yet
      ledger_index: 'validated'
    })

    return response.result.account_objects.map((obj: any) => ({
      delegateAddress: obj.Authorize,
      permissions: obj.Permissions || []
    }))
  }

  /**
   * Check if address is authorized delegate
   */
  async isAuthorizedDelegate(
    accountAddress: string,
    delegateAddress: string
  ): Promise<boolean> {
    const delegates = await this.getDelegates(accountAddress)
    return delegates.some(d => d.delegateAddress === delegateAddress)
  }
}
