/**
 * XRPL Deposit Pre-Authorization Service
 * Manages deposit authorization for compliance
 * Based on: /Users/neilbatchelor/Downloads/xrpl-dev-portal-master/_code-samples/deposit-preauth/
 */

import { 
  Client, 
  Wallet, 
  DepositPreauth, 
  AccountSet,
  AccountSetTfFlags
} from 'xrpl';
import {
  EnableDepositAuthParams,
  AuthorizeDepositorParams,
  AuthorizeByCredentialParams,
  RevokeAuthorizationParams,
  DepositAuthOperationResult,
  AuthorizedDepositor
} from './deposit-auth-types';

export class XRPLDepositPreAuthService {
  constructor(private client: Client) {}

  /**
   * Enable deposit authorization requirement on account
   * After this, only pre-authorized addresses can send payments
   */
  async enableDepositAuth(
    wallet: Wallet,
    params?: EnableDepositAuthParams
  ): Promise<DepositAuthOperationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      SetFlag: 1 // asfDepositAuth
    };

    if (params?.requireDestinationTag) {
      tx.SetFlag = 2; // asfRequireDestTag
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Deposit auth enable failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Disable deposit authorization
   */
  async disableDepositAuth(wallet: Wallet): Promise<DepositAuthOperationResult> {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: wallet.address,
      ClearFlag: 1 // asfDepositAuth
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Deposit auth disable failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Pre-authorize an address for deposits
   */
  async authorizeDepositor(
    wallet: Wallet,
    params: AuthorizeDepositorParams
  ): Promise<DepositAuthOperationResult> {
    const tx: DepositPreauth = {
      TransactionType: 'DepositPreauth',
      Account: wallet.address,
      Authorize: params.authorizedAddress
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Deposit authorization failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Authorize deposits using credentials
   * Allows any holder of a specific credential to deposit
   */
  async authorizeByCredential(
    wallet: Wallet,
    params: AuthorizeByCredentialParams
  ): Promise<DepositAuthOperationResult> {
    const tx: any = {
      TransactionType: 'DepositPreauth',
      Account: wallet.address,
      AuthorizeCredentials: [{
        Credential: {
          Issuer: params.credentialIssuer,
          CredentialType: params.credentialType
        }
      }]
    };

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Credential authorization failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Remove deposit authorization from an address
   */
  async revokeAuthorization(
    wallet: Wallet,
    params: RevokeAuthorizationParams
  ): Promise<DepositAuthOperationResult> {
    let tx: any = {
      TransactionType: 'DepositPreauth',
      Account: wallet.address
    };

    if (params.unauthorizedAddress) {
      tx.Unauthorize = params.unauthorizedAddress;
    } else if (params.credentialIssuer && params.credentialType) {
      tx.UnauthorizeCredentials = [{
        Credential: {
          Issuer: params.credentialIssuer,
          CredentialType: params.credentialType
        }
      }];
    } else {
      throw new Error('Must provide either unauthorizedAddress or credential info');
    }

    const response = await this.client.submitAndWait(tx, {
      wallet,
      autofill: true
    });

    if (response.result.meta && 
        typeof response.result.meta === 'object' && 
        'TransactionResult' in response.result.meta &&
        response.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(
        `Authorization revocation failed: ${response.result.meta.TransactionResult}`
      );
    }

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Get all authorized depositors for an account
   */
  async getAuthorizedDepositors(address: string): Promise<AuthorizedDepositor[]> {
    const response = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'deposit_preauth',
      ledger_index: 'validated'
    });

    if (!response.result.account_objects) {
      return [];
    }

    return response.result.account_objects.map((obj: any) => ({
      address: obj.Authorize,
      authorizedAt: obj.PreviousTxnLgrSeq 
        ? new Date(obj.PreviousTxnLgrSeq * 1000).toISOString()
        : new Date().toISOString(),
      isActive: true
    }));
  }

  /**
   * Check if an address is authorized to deposit
   */
  async isAuthorized(
    accountAddress: string,
    depositorAddress: string
  ): Promise<boolean> {
    const authorized = await this.getAuthorizedDepositors(accountAddress);
    return authorized.some(auth => auth.address === depositorAddress);
  }

  /**
   * Check if deposit authorization is enabled for an account
   */
  async isDepositAuthEnabled(address: string): Promise<boolean> {
    const response = await this.client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });

    const flags = response.result.account_data.Flags || 0;
    return (flags & 1) !== 0; // asfDepositAuth
  }
}
