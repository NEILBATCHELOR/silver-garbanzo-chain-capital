/**
 * XRPL Freeze Service
 * Manages asset freeze controls for compliance
 * Based on: /Users/neilbatchelor/Downloads/xrpl-dev-portal-master/_code-samples/freeze/
 */

import { 
  Client, 
  Wallet, 
  TrustSet, 
  TrustSetFlags, 
  AccountSet, 
  AccountSetAsfFlags 
} from 'xrpl';
import {
  EnableGlobalFreezeParams,
  DisableGlobalFreezeParams,
  FreezeTrustLineParams,
  UnfreezeTrustLineParams,
  FreezeOperationResult,
  FreezeStatus,
  TrustLineFreezeStatus
} from './freeze-types';

export class XRPLFreezeService {
  constructor(private client: Client) {}

  /**
   * Enable global freeze (freezes all trust lines)
   * IMPORTANT: Use with caution - affects all token holders
   */
  async enableGlobalFreeze(
    issuerWallet: Wallet,
    params?: EnableGlobalFreezeParams
  ): Promise<FreezeOperationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      SetFlag: AccountSetAsfFlags.asfGlobalFreeze
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Global freeze enable failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash,
      warning: 'Global freeze enabled - all trust lines are now frozen'
    };
  }

  /**
   * Disable global freeze
   */
  async disableGlobalFreeze(
    issuerWallet: Wallet,
    params?: DisableGlobalFreezeParams
  ): Promise<FreezeOperationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      ClearFlag: AccountSetAsfFlags.asfGlobalFreeze
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Global freeze disable failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Freeze individual trust line
   * IMPORTANT: Must be done by the issuer
   */
  async freezeTrustLine(
    issuerWallet: Wallet,
    params: FreezeTrustLineParams
  ): Promise<FreezeOperationResult> {
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: issuerWallet.address,
      LimitAmount: {
        currency: params.currency,
        issuer: params.holderAddress,
        value: '0'
      },
      Flags: TrustSetFlags.tfSetFreeze
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Trust line freeze failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Unfreeze individual trust line
   */
  async unfreezeTrustLine(
    issuerWallet: Wallet,
    params: UnfreezeTrustLineParams
  ): Promise<FreezeOperationResult> {
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: issuerWallet.address,
      LimitAmount: {
        currency: params.currency,
        issuer: params.holderAddress,
        value: '0'
      },
      Flags: TrustSetFlags.tfClearFreeze
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Trust line unfreeze failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Enable No Freeze flag (PERMANENT - CANNOT BE UNDONE!)
   * Use this to declare that you will never freeze trust lines
   */
  async enableNoFreeze(issuerWallet: Wallet): Promise<FreezeOperationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: issuerWallet.address,
      SetFlag: AccountSetAsfFlags.asfNoFreeze
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: issuerWallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `No Freeze enable failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash,
      warning: 'No Freeze flag is PERMANENT and cannot be reversed! You can never freeze trust lines again.'
    };
  }

  /**
   * Get freeze status for an account
   */
  async getFreezeStatus(address: string): Promise<FreezeStatus> {
    const response = await this.client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });

    const flags = response.result.account_data.Flags || 0;

    const globalFreezeEnabled = (flags & AccountSetAsfFlags.asfGlobalFreeze) !== 0;
    const noFreezeEnabled = (flags & AccountSetAsfFlags.asfNoFreeze) !== 0;

    return {
      globalFreezeEnabled,
      noFreezeEnabled,
      warning: noFreezeEnabled 
        ? 'No Freeze flag is set - this account can never freeze trust lines'
        : undefined
    };
  }

  /**
   * Check if a specific trust line is frozen
   */
  async getTrustLineFreezeStatus(
    issuerAddress: string,
    holderAddress: string,
    currency: string
  ): Promise<TrustLineFreezeStatus> {
    const response = await this.client.request({
      command: 'account_lines',
      account: holderAddress,
      peer: issuerAddress,
      ledger_index: 'validated'
    });

    const trustLine = response.result.lines.find(
      (line: any) => line.currency === currency && line.account === issuerAddress
    );

    if (!trustLine) {
      throw new Error('Trust line not found');
    }

    return {
      isFrozen: trustLine.freeze === true || trustLine.freeze_peer === true
    };
  }
}
