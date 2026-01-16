/**
 * XRPL Account Configuration Service (SDK Compliant)
 * Comprehensive account settings and flags management
 */

import { 
  Client, 
  Wallet, 
  AccountSet,
  AccountSetAsfFlags as XRPLFlags, 
  convertStringToHex,
  SignerListSet,
  SetRegularKey
} from 'xrpl'
import type { TxResponse } from 'xrpl'
import {
  AccountFlags,
  AccountSettings,
  AccountSetAsfFlags,
  BlackholeAccountParams,
  SignerEntry,
  getTransactionResult,
  hasTransactionResult
} from './types'

// SignerList ledger entry type (not exported by SDK)
interface SignerListLedgerEntry {
  LedgerEntryType: 'SignerList'
  SignerQuorum: number
  SignerEntries: Array<{
    SignerEntry: {
      Account: string
      SignerWeight: number
    }
  }>
  [key: string]: any
}

export class XRPLAccountConfigurationService {
  private readonly BLACKHOLE_ADDRESS = 'rrrrrrrrrrrrrrrrrrrrBZbvji'

  constructor(private client: Client) {}

  /**
   * Set account flag
   */
  async setAccountFlag(
    wallet: Wallet,
    flag: AccountSetAsfFlags
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      SetFlag: flag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Flag set failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Clear account flag
   */
  async clearAccountFlag(
    wallet: Wallet,
    flag: AccountSetAsfFlags
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      ClearFlag: flag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Flag clear failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Configure multiple account flags at once
   */
  async configureAccountFlags(
    wallet: Wallet,
    currentFlags: AccountFlags,
    newFlags: Partial<AccountFlags>
  ): Promise<{
    transactionHashes: string[]
    flagsChanged: string[]
  }> {
    const transactionHashes: string[] = []
    const flagsChanged: string[] = []

    const flagMappings: Array<[keyof AccountFlags, AccountSetAsfFlags]> = [
      ['requireDestinationTag', AccountSetAsfFlags.asfRequireDest],
      ['requireAuthorization', AccountSetAsfFlags.asfRequireAuth],
      ['disallowIncomingXRP', AccountSetAsfFlags.asfDisallowXRP],
      ['disableMasterKey', AccountSetAsfFlags.asfDisableMaster],
      ['noFreeze', AccountSetAsfFlags.asfNoFreeze],
      ['globalFreeze', AccountSetAsfFlags.asfGlobalFreeze],
      ['defaultRipple', AccountSetAsfFlags.asfDefaultRipple],
      ['depositAuth', AccountSetAsfFlags.asfDepositAuth],
      ['disallowIncomingNFTokenOffer', AccountSetAsfFlags.asfDisallowIncomingNFTokenOffer],
      ['disallowIncomingCheck', AccountSetAsfFlags.asfDisallowIncomingCheck],
      ['disallowIncomingPayChan', AccountSetAsfFlags.asfDisallowIncomingPayChan],
      ['disallowIncomingTrustline', AccountSetAsfFlags.asfDisallowIncomingTrustline],
      ['allowTrustLineClawback', AccountSetAsfFlags.asfAllowTrustLineClawback]
    ]

    for (const [flagName, flagValue] of flagMappings) {
      if (newFlags[flagName] !== undefined && newFlags[flagName] !== currentFlags[flagName]) {
        if (newFlags[flagName]) {
          const result = await this.setAccountFlag(wallet, flagValue)
          transactionHashes.push(result.transactionHash)
        } else {
          const result = await this.clearAccountFlag(wallet, flagValue)
          transactionHashes.push(result.transactionHash)
        }
        flagsChanged.push(flagName)
      }
    }

    return { transactionHashes, flagsChanged }
  }

  /**
   * Set account settings (domain, email hash, etc.)
   */
  async setAccountSettings(
    wallet: Wallet,
    settings: AccountSettings
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      ...(settings.domain && { Domain: convertStringToHex(settings.domain) }),
      ...(settings.emailHash && { EmailHash: settings.emailHash }),
      ...(settings.messageKey && { MessageKey: settings.messageKey }),
      ...(settings.tickSize && { TickSize: settings.tickSize }),
      ...(settings.transferRate && { TransferRate: settings.transferRate })
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Settings update failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Set signer list for multi-signature
   */
  async setSignerList(
    wallet: Wallet,
    signerQuorum: number,
    signers: SignerEntry[]
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx: SignerListSet = {
      TransactionType: 'SignerListSet',
      Account: wallet.address,
      SignerQuorum: signerQuorum,
      SignerEntries: signers.map(signer => ({
        SignerEntry: {
          Account: signer.Account,
          SignerWeight: signer.SignerWeight
        }
      }))
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Signer list setup failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Get account information including flags and settings
   */
  async getAccountInfo(address: string): Promise<{
    flags: AccountFlags
    settings: AccountSettings
    signerQuorum: number
    signerList: SignerEntry[]
  }> {
    const response = await this.client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    })

    const accountData = response.result.account_data
    const accountFlags = response.result.account_flags

    // Extract flags
    const flags: AccountFlags = {
      requireDestinationTag: accountFlags.requireDestinationTag || false,
      requireAuthorization: accountFlags.requireAuthorization || false,
      disallowIncomingXRP: accountFlags.disallowIncomingXRP || false,
      disableMasterKey: accountFlags.disableMasterKey || false,
      noFreeze: accountFlags.noFreeze || false,
      globalFreeze: accountFlags.globalFreeze || false,
      defaultRipple: accountFlags.defaultRipple || false,
      depositAuth: accountFlags.depositAuth || false,
      disallowIncomingNFTokenOffer: accountFlags.disallowIncomingNFTokenOffer || false,
      disallowIncomingCheck: accountFlags.disallowIncomingCheck || false,
      disallowIncomingPayChan: accountFlags.disallowIncomingPayChan || false,
      disallowIncomingTrustline: accountFlags.disallowIncomingTrustline || false,
      allowTrustLineClawback: accountFlags.allowTrustLineClawback || false
    }

    // Extract settings
    const settings: AccountSettings = {
      domain: accountData.Domain ? Buffer.from(accountData.Domain, 'hex').toString('utf8') : undefined,
      emailHash: accountData.EmailHash,
      messageKey: accountData.MessageKey,
      tickSize: accountData.TickSize,
      transferRate: accountData.TransferRate
    }

    // Extract signer list from account_objects (separate query)
    let signerQuorum = 0
    let signerList: SignerEntry[] = []

    try {
      const signerListResponse = await this.client.request({
        command: 'account_objects',
        account: address,
        type: 'signer_list',
        ledger_index: 'validated'
      })

      if (signerListResponse.result.account_objects.length > 0) {
        // Cast to SignerListLedgerEntry since SDK doesn't export this type
        const signerListData = signerListResponse.result.account_objects[0] as SignerListLedgerEntry
        signerQuorum = signerListData.SignerQuorum
        signerList = signerListData.SignerEntries.map((entry) => ({
          Account: entry.SignerEntry.Account,
          SignerWeight: entry.SignerEntry.SignerWeight
        }))
      }
    } catch (error) {
      // No signer list found, use defaults
    }

    return {
      flags,
      settings,
      signerQuorum,
      signerList
    }
  }

  /**
   * Set regular key for account
   */
  async setRegularKey(
    masterWallet: Wallet,
    regularKeyAddress: string
  ): Promise<{
    transactionHash: string
    ledgerIndex: number
  }> {
    const tx: SetRegularKey = {
      TransactionType: 'SetRegularKey',
      Account: masterWallet.address,
      RegularKey: regularKeyAddress
    }

    const response = await this.client.submitAndWait(tx, {
      wallet: masterWallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Regular key setup failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash,
      ledgerIndex: response.result.ledger_index || 0
    }
  }

  /**
   * Blackhole an account (irreversible!)
   * Sets regular key to blackhole address and disables master key
   */
  async blackholeAccount(
    wallet: Wallet,
    params: BlackholeAccountParams
  ): Promise<{
    setRegularKeyHash: string
    disableMasterKeyHash: string
    blackholedAt: Date
  }> {
    // Step 1: Set regular key to blackhole address
    const regularKeyResult = await this.setRegularKey(wallet, this.BLACKHOLE_ADDRESS)

    // Step 2: Disable master key
    const disableMasterResult = await this.setAccountFlag(wallet, AccountSetAsfFlags.asfDisableMaster)

    return {
      setRegularKeyHash: regularKeyResult.transactionHash,
      disableMasterKeyHash: disableMasterResult.transactionHash,
      blackholedAt: new Date()
    }
  }

  /**
   * Remove signer list
   */
  async removeSignerList(wallet: Wallet): Promise<{
    transactionHash: string
  }> {
    const tx: SignerListSet = {
      TransactionType: 'SignerListSet',
      Account: wallet.address,
      SignerQuorum: 0
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    })

    const txResult = getTransactionResult(response)
    if (txResult !== 'tesSUCCESS') {
      throw new Error(`Signer list removal failed: ${txResult}`)
    }

    return {
      transactionHash: response.result.hash
    }
  }
}
