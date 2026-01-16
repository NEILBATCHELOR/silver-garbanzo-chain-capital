/**
 * XRPL Key Rotation Service
 * Phase 14.2: Regular Key Management
 * Handles regular key setup, rotation, and master key management
 */

import { Client, Wallet, SetRegularKey, AccountSet, AccountSetAsfFlags } from 'xrpl'
import {
  KeyRotationParams,
  KeyRotationResult,
  KeyConfiguration,
  RotationType
} from './key-rotation-types'

export class XRPLKeyRotationService {
  constructor(private client: Client) {}

  /**
   * Set regular key for account
   * This allows the account to be controlled by the regular key
   * while keeping the master key offline
   */
  async setRegularKey(
    masterWallet: Wallet,
    params: KeyRotationParams
  ): Promise<KeyRotationResult> {
    const tx: SetRegularKey = {
      TransactionType: 'SetRegularKey',
      Account: masterWallet.address,
      RegularKey: params.regularKey
    }

    const prepared = await this.client.autofill(tx)
    const signed = masterWallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Regular key setup failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    return {
      transactionHash: response.result.hash,
      newRegularKey: params.regularKey,
      rotationType: 'set_regular'
    }
  }

  /**
   * Rotate regular key to a new key
   * Can be signed by either master key or current regular key
   */
  async rotateRegularKey(
    signingWallet: Wallet,
    newRegularKey: string,
    oldRegularKey?: string
  ): Promise<KeyRotationResult> {
    const tx: SetRegularKey = {
      TransactionType: 'SetRegularKey',
      Account: signingWallet.address,
      RegularKey: newRegularKey
    }

    const prepared = await this.client.autofill(tx)
    const signed = signingWallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Key rotation failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    return {
      transactionHash: response.result.hash,
      newRegularKey,
      oldRegularKey,
      rotationType: 'rotate'
    }
  }

  /**
   * Remove regular key (requires master key or current regular key)
   * This reverts the account to master key only control
   */
  async removeRegularKey(wallet: Wallet): Promise<KeyRotationResult> {
    const tx: SetRegularKey = {
      TransactionType: 'SetRegularKey',
      Account: wallet.address
      // No RegularKey field = remove regular key
    }

    const prepared = await this.client.autofill(tx)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Regular key removal failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    return {
      transactionHash: response.result.hash,
      rotationType: 'remove'
    }
  }

  /**
   * Disable master key (CRITICAL: Must have regular key set first!)
   * This makes the account rely solely on the regular key
   * Master key can still be re-enabled by the regular key
   */
  async disableMasterKey(wallet: Wallet): Promise<KeyRotationResult> {
    // First verify regular key is set
    const config = await this.getKeyConfiguration(wallet.address)
    if (!config.regularKey) {
      throw new Error('Cannot disable master key without a regular key set')
    }

    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      SetFlag: AccountSetAsfFlags.asfDisableMaster
    }

    const prepared = await this.client.autofill(tx)
    const signed = wallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Master key disable failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    return {
      transactionHash: response.result.hash,
      rotationType: 'disable_master'
    }
  }

  /**
   * Enable master key (can only be done by regular key)
   * This restores master key functionality
   */
  async enableMasterKey(regularWallet: Wallet): Promise<KeyRotationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: regularWallet.address,
      ClearFlag: AccountSetAsfFlags.asfDisableMaster
    }

    const prepared = await this.client.autofill(tx)
    const signed = regularWallet.sign(prepared)
    const response = await this.client.submitAndWait(signed.tx_blob)

    if (response.result.meta && typeof response.result.meta !== 'string') {
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(
          `Master key enable failed: ${response.result.meta.TransactionResult}`
        )
      }
    }

    return {
      transactionHash: response.result.hash,
      rotationType: 'enable_master'
    }
  }

  /**
   * Get current key configuration for an account
   */
  async getKeyConfiguration(address: string): Promise<KeyConfiguration> {
    const response = await this.client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })

    const accountData = response.result.account_data

    return {
      regularKey: accountData.RegularKey,
      masterKeyDisabled:
        (accountData.Flags & AccountSetAsfFlags.asfDisableMaster) !== 0
    }
  }

  /**
   * Verify if a wallet can sign for an account
   * Checks both master key and regular key
   */
  async canWalletSignForAccount(
    wallet: Wallet,
    accountAddress: string
  ): Promise<{ canSign: boolean; reason: string }> {
    // Check if wallet is the account itself (master key)
    if (wallet.address === accountAddress) {
      const config = await this.getKeyConfiguration(accountAddress)
      if (config.masterKeyDisabled) {
        return {
          canSign: false,
          reason: 'Master key is disabled for this account'
        }
      }
      return { canSign: true, reason: 'Master key can sign' }
    }

    // Check if wallet is the regular key
    const config = await this.getKeyConfiguration(accountAddress)
    if (config.regularKey === wallet.address) {
      return { canSign: true, reason: 'Regular key can sign' }
    }

    return {
      canSign: false,
      reason: 'Wallet is neither master nor regular key'
    }
  }

  /**
   * Get recommended rotation interval based on security level
   */
  getRecommendedRotationInterval(securityLevel: 'low' | 'medium' | 'high'): number {
    switch (securityLevel) {
      case 'high':
        return 30 // 30 days
      case 'medium':
        return 90 // 90 days
      case 'low':
        return 180 // 180 days
      default:
        return 90
    }
  }
}
