/**
 * Stellar Transaction Builder
 * Handles transaction construction and signing for Stellar network
 */

import * as StellarSdk from '@stellar/stellar-sdk';

export interface StellarTransactionParams {
  from: string;
  to: string;
  amount: string;
  memo?: string;
  assetCode?: string;
  assetIssuer?: string;
  networkPassphrase?: string;
  horizonUrl?: string;
}

export interface StellarSignedTransaction {
  xdr: string;
  hash: string;
}

export class StellarTransactionBuilder {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor(
    horizonUrl: string = 'https://horizon.stellar.org',
    network: 'mainnet' | 'testnet' = 'mainnet'
  ) {
    this.server = new StellarSdk.Horizon.Server(horizonUrl);
    this.networkPassphrase = network === 'mainnet' 
      ? StellarSdk.Networks.PUBLIC 
      : StellarSdk.Networks.TESTNET;
  }

  /**
   * Build a payment transaction (native XLM or custom asset)
   */
  async buildTransaction(params: StellarTransactionParams): Promise<string> {
    try {
      const sourceAccount = await this.server.loadAccount(params.from);
      
      // Determine the asset
      let asset: StellarSdk.Asset;
      if (params.assetCode && params.assetIssuer) {
        asset = new StellarSdk.Asset(params.assetCode, params.assetIssuer);
      } else {
        asset = StellarSdk.Asset.native();
      }
      
      // Build the transaction
      const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });
      
      // Add payment operation
      transactionBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: params.to,
          asset: asset,
          amount: params.amount,
        })
      );
      
      // Add memo if provided
      if (params.memo) {
        transactionBuilder.addMemo(StellarSdk.Memo.text(params.memo));
      }
      
      // Set timeout to 3 minutes
      const transaction = transactionBuilder
        .setTimeout(180)
        .build();
      
      // Return the transaction XDR for signing
      return transaction.toEnvelope().toXDR('base64');
    } catch (error) {
      throw new Error(`Failed to build Stellar transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sign a transaction with a private key
   */
  signTransaction(transactionXdr: string, privateKey: string): StellarSignedTransaction {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(privateKey);
      const transaction = new StellarSdk.Transaction(
        transactionXdr,
        this.networkPassphrase
      );
      
      transaction.sign(keypair);
      
      return {
        xdr: transaction.toEnvelope().toXDR('base64'),
        hash: transaction.hash().toString('hex')
      };
    } catch (error) {
      throw new Error(`Failed to sign Stellar transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit a signed transaction to the network
   */
  async submitTransaction(signedXdr: string): Promise<string> {
    try {
      const transaction = new StellarSdk.Transaction(
        signedXdr,
        this.networkPassphrase
      );
      
      const result = await this.server.submitTransaction(transaction);
      return result.hash;
    } catch (error) {
      throw new Error(`Failed to submit Stellar transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(): Promise<string> {
    // Stellar uses a base fee that can be retrieved from the network
    try {
      const feeStats = await this.server.feeStats();
      return feeStats.last_ledger_base_fee;
    } catch {
      // Return default base fee if unable to fetch
      return StellarSdk.BASE_FEE;
    }
  }

  /**
   * Validate Stellar address
   */
  isValidAddress(address: string): boolean {
    try {
      StellarSdk.Keypair.fromPublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    timestamp?: number;
  }> {
    try {
      const transaction = await this.server.transactions().transaction(txHash).call();
      return {
        status: transaction.successful ? 'confirmed' : 'failed',
        confirmations: transaction.successful ? 1 : 0,
        timestamp: new Date(transaction.created_at).getTime()
      };
    } catch {
      return {
        status: 'pending',
        confirmations: 0
      };
    }
  }

  /**
   * Create a multi-signature account setup transaction
   */
  async buildMultiSigSetup(
    masterAccount: string,
    signers: Array<{ publicKey: string; weight: number }>,
    thresholds: {
      masterWeight: number;
      low: number;
      medium: number;
      high: number;
    }
  ): Promise<string> {
    try {
      const sourceAccount = await this.server.loadAccount(masterAccount);
      
      const transactionBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });
      
      // Add signers
      for (const signer of signers) {
        transactionBuilder.addOperation(
          StellarSdk.Operation.setOptions({
            signer: {
              ed25519PublicKey: signer.publicKey,
              weight: signer.weight
            }
          })
        );
      }
      
      // Set thresholds
      transactionBuilder.addOperation(
        StellarSdk.Operation.setOptions({
          masterWeight: thresholds.masterWeight,
          lowThreshold: thresholds.low,
          medThreshold: thresholds.medium,
          highThreshold: thresholds.high
        })
      );
      
      const transaction = transactionBuilder
        .setTimeout(180)
        .build();
      
      return transaction.toEnvelope().toXDR('base64');
    } catch (error) {
      throw new Error(`Failed to build Stellar multi-sig setup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
