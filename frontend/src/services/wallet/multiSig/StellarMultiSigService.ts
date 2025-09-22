/**
 * Stellar Multi-Signature Service
 * Handles multi-signature operations for Stellar network
 */

import * as StellarSdk from '@stellar/stellar-sdk';

export interface StellarMultiSigConfig {
  masterAccount: string;
  signers: Array<{
    publicKey: string;
    weight: number;
  }>;
  thresholds: {
    masterWeight: number;
    low: number;
    medium: number;
    high: number;
  };
}

export interface StellarMultiSigTransaction {
  xdr: string;
  signatures: string[];
  hash: string;
}

export class StellarMultiSigService {
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
   * Create a multi-signature account setup transaction
   */
  async createMultiSigSetup(config: StellarMultiSigConfig): Promise<string> {
    try {
      const account = await this.server.loadAccount(config.masterAccount);
      
      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });
      
      // Add signers
      for (const signer of config.signers) {
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
          masterWeight: config.thresholds.masterWeight,
          lowThreshold: config.thresholds.low,
          medThreshold: config.thresholds.medium,
          highThreshold: config.thresholds.high
        })
      );
      
      const transaction = transactionBuilder
        .setTimeout(180)
        .build();
      
      return transaction.toEnvelope().toXDR('base64');
    } catch (error) {
      throw new Error(`Failed to create multi-sig setup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add a signature to a transaction
   */
  async addSignature(transactionXdr: string, privateKey: string): Promise<StellarMultiSigTransaction> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(privateKey);
      const transaction = new StellarSdk.Transaction(
        transactionXdr,
        this.networkPassphrase
      );
      
      // Sign the transaction
      transaction.sign(keypair);
      
      // Get all signatures
      const signatures = transaction.signatures.map(sig => sig.signature().toString('base64'));
      
      return {
        xdr: transaction.toEnvelope().toXDR('base64'),
        signatures,
        hash: transaction.hash().toString('hex')
      };
    } catch (error) {
      throw new Error(`Failed to add signature: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit a multi-signed transaction
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
      throw new Error(`Failed to submit multi-sig transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account signers and thresholds
   */
  async getAccountSigners(accountId: string): Promise<{
    signers: Array<{ publicKey: string; weight: number }>;
    thresholds: { low: number; medium: number; high: number };
  }> {
    try {
      const account = await this.server.loadAccount(accountId);
      
      const signers = account.signers.map(signer => ({
        publicKey: signer.key,
        weight: signer.weight
      }));
      
      const thresholds = {
        low: account.thresholds.low_threshold,
        medium: account.thresholds.med_threshold,
        high: account.thresholds.high_threshold
      };
      
      return { signers, thresholds };
    } catch (error) {
      throw new Error(`Failed to get account signers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if transaction meets threshold requirements
   */
  async checkThresholdRequirements(
    transactionXdr: string,
    accountId: string
  ): Promise<{
    meetsRequirement: boolean;
    currentWeight: number;
    requiredWeight: number;
  }> {
    try {
      const transaction = new StellarSdk.Transaction(
        transactionXdr,
        this.networkPassphrase
      );
      
      const account = await this.server.loadAccount(accountId);
      
      // Calculate current weight from signatures
      let currentWeight = 0;
      const signatureHashes = transaction.signatures.map(sig => 
        sig.hint().toString('base64')
      );
      
      for (const signer of account.signers) {
        const signerHint = StellarSdk.Keypair.fromPublicKey(signer.key)
          .signatureHint()
          .toString('base64');
        
        if (signatureHashes.includes(signerHint)) {
          currentWeight += signer.weight;
        }
      }
      
      // Determine required threshold based on operations
      // For simplicity, using high threshold (can be more sophisticated)
      const requiredWeight = account.thresholds.high_threshold;
      
      return {
        meetsRequirement: currentWeight >= requiredWeight,
        currentWeight,
        requiredWeight
      };
    } catch (error) {
      throw new Error(`Failed to check threshold requirements: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a signer from an account
   */
  async removeSigner(
    masterAccount: string,
    signerToRemove: string
  ): Promise<string> {
    try {
      const account = await this.server.loadAccount(masterAccount);
      
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: signerToRemove,
            weight: 0 // Setting weight to 0 removes the signer
          }
        })
      )
      .setTimeout(180)
      .build();
      
      return transaction.toEnvelope().toXDR('base64');
    } catch (error) {
      throw new Error(`Failed to remove signer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}