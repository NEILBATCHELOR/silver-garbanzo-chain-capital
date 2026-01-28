/**
 * Arweave Upload Service
 * 
 * Handles uploading metadata JSON to Arweave for permanent storage
 * Returns Arweave transaction IDs that can be used as URIs in Token-2022
 */

import Arweave from 'arweave';

export interface ArweaveUploadResult {
  success: boolean;
  transactionId?: string;
  uri?: string;
  gatewayUrl?: string;
  error?: string;
  cost?: number;
}

export interface ArweaveUploadOptions {
  tags?: Array<{ name: string; value: string }>;
  waitForConfirmation?: boolean;
}

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 20000,
  logging: false
});

export class ArweaveUploadService {
  private jwk: any | null = null;

  async initialize(jwkString: string): Promise<void> {
    try {
      this.jwk = JSON.parse(jwkString);
    } catch (error) {
      throw new Error('Invalid Arweave JWK key format');
    }
  }

  isInitialized(): boolean {
    return this.jwk !== null;
  }

  async getAddress(): Promise<string> {
    if (!this.jwk) throw new Error('Not initialized');
    return await arweave.wallets.jwkToAddress(this.jwk);
  }

  async getBalance(): Promise<number> {
    if (!this.jwk) throw new Error('Not initialized');
    const address = await this.getAddress();
    const winston = await arweave.wallets.getBalance(address);
    return parseFloat(arweave.ar.winstonToAr(winston));
  }

  async uploadMetadata(
    metadata: Record<string, any>,
    options: ArweaveUploadOptions = {}
  ): Promise<ArweaveUploadResult> {
    if (!this.jwk) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const jsonData = JSON.stringify(metadata, null, 2);
      const transaction = await arweave.createTransaction(
        { data: Buffer.from(jsonData) },
        this.jwk
      );

      transaction.addTag('Content-Type', 'application/json');
      transaction.addTag('App-Name', 'Chain-Capital');
      transaction.addTag('Type', 'Token-Metadata');

      if (options.tags) {
        options.tags.forEach(tag => transaction.addTag(tag.name, tag.value));
      }

      await arweave.transactions.sign(transaction, this.jwk);
      const cost = parseFloat(arweave.ar.winstonToAr(transaction.reward));

      const uploader = await arweave.transactions.getUploader(transaction);
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }

      const transactionId = transaction.id;
      if (options.waitForConfirmation) {
        await this.waitForConfirmation(transactionId);
      }

      return {
        success: true,
        transactionId,
        uri: `ar://${transactionId}`,
        gatewayUrl: `https://arweave.net/${transactionId}`,
        cost
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  private async waitForConfirmation(
    transactionId: string,
    maxAttempts: number = 20
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await arweave.transactions.getStatus(transactionId);
        if (status.confirmed) return;
      } catch (error) {
        // Keep waiting
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Confirmation timeout');
  }

  async getTransactionStatus(transactionId: string) {
    try {
      const status = await arweave.transactions.getStatus(transactionId);
      return {
        confirmed: status.confirmed !== undefined,
        blockHeight: status.confirmed?.block_height
      };
    } catch (error) {
      return { confirmed: false };
    }
  }

  async retrieveMetadata(transactionId: string): Promise<Record<string, any> | null> {
    try {
      const response = await fetch(`https://arweave.net/${transactionId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async estimateCost(dataSize: number): Promise<number> {
    try {
      const winston = await arweave.transactions.getPrice(dataSize);
      return parseFloat(arweave.ar.winstonToAr(winston));
    } catch (error) {
      return 0;
    }
  }
}

export const arweaveUploadService = new ArweaveUploadService();
