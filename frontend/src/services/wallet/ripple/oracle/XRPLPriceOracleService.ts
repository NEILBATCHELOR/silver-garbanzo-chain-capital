/**
 * XRPL Price Oracle Service
 * Phase 6: Oracle & Price Feeds
 * 
 * Manages on-chain price oracles on the XRP Ledger
 * 
 * IMPORTANT: Flow: Blockchain first → Database second (for audit trail and querying)
 * All methods now require projectId for multi-tenant isolation.
 * 
 * Based on: /Users/neilbatchelor/Downloads/xrpl-dev-portal-master/_code-samples/price_oracles/
 */

import { Client, Wallet } from 'xrpl';
import {
  XRPLPriceOracleDatabaseService,
  PriceOracleRecord,
  OraclePriceDataRecord
} from './XRPLPriceOracleDatabaseService';
import type {
  PriceDataPoint,
  OracleSetParams,
  OracleSetResult,
  OracleDeleteResult,
  OracleDetails,
  AccountOracleSummary
} from '../types/oracle';

export class XRPLPriceOracleService {
  constructor(private client: Client) {}

  /**
   * Get current network for explorer URLs
   */
  private getNetwork(): string {
    const url = this.client.connection.getUrl();
    if (url.includes('altnet')) return 'TESTNET';
    if (url.includes('devnet')) return 'DEVNET';
    return 'MAINNET';
  }

  /**
   * Convert string to hex for XRPL
   */
  private convertStringToHex(str: string): string {
    return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
  }

  /**
   * Create or update price oracle on XRPL
   * 1. Sets oracle data on blockchain
   * 2. Creates/updates oracle record in database with project_id
   * 3. Records price data points for historical tracking
   */
  async setOracle(
    projectId: string,
    params: OracleSetParams
  ): Promise<OracleSetResult> {
    // Convert strings to hex as required by XRPL
    const providerHex = this.convertStringToHex(params.provider);
    const uriHex = this.convertStringToHex(params.uri);
    const assetClassHex = this.convertStringToHex(params.assetClass);

    // Convert price data to XRPL format
    const priceDataArray = params.priceDataSeries.map(pd => ({
      BaseAsset: pd.baseAsset,
      QuoteAsset: pd.quoteAsset,
      AssetPrice: pd.assetPrice,
      Scale: pd.scale
    }));

    // 1. BLOCKCHAIN OPERATION
    const tx: any = {
      TransactionType: 'OracleSet',
      Account: params.oracleWallet.address,
      OracleDocumentID: params.oracleDocumentId,
      Provider: providerHex,
      URI: uriHex,
      LastUpdateTime: params.lastUpdateTime,
      AssetClass: assetClassHex,
      PriceDataSeries: priceDataArray
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: params.oracleWallet,
      autofill: true
    });

    const meta = response.result.meta as any;
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Oracle set failed: ${meta?.TransactionResult}`);
    }

    // 2. DATABASE OPERATIONS
    // Check if oracle already exists
    const existingOracle = await XRPLPriceOracleDatabaseService.getOracle(
      projectId,
      params.oracleWallet.address,
      params.oracleDocumentId
    );

    if (existingOracle) {
      // Update existing oracle
      await XRPLPriceOracleDatabaseService.updateOracleLastUpdate(
        projectId,
        params.oracleWallet.address,
        params.oracleDocumentId,
        params.lastUpdateTime
      );
    } else {
      // Create new oracle record
      const oracleRecord: PriceOracleRecord = {
        project_id: projectId,
        oracle_address: params.oracleWallet.address,
        oracle_document_id: params.oracleDocumentId,
        provider: params.provider,
        uri: params.uri,
        asset_class: params.assetClass,
        last_update_time: params.lastUpdateTime,
        status: 'active'
      };

      await XRPLPriceOracleDatabaseService.createOracle(oracleRecord);
    }

    // 3. Record price data points for historical tracking
    const oracleId = existingOracle?.id || 
      (await XRPLPriceOracleDatabaseService.getOracle(
        projectId,
        params.oracleWallet.address,
        params.oracleDocumentId
      ))?.id;

    if (oracleId) {
      for (const priceData of params.priceDataSeries) {
        const priceDataRecord: OraclePriceDataRecord = {
          project_id: projectId,
          oracle_id: oracleId,
          base_asset: priceData.baseAsset,
          quote_asset: priceData.quoteAsset,
          asset_price: priceData.assetPrice,
          scale: priceData.scale
        };

        await XRPLPriceOracleDatabaseService.recordPriceData(priceDataRecord);
      }
    }

    return {
      oracleDocumentId: params.oracleDocumentId,
      transactionHash: response.result.hash
    };
  }

  /**
   * Delete price oracle from XRPL
   * 1. Deletes oracle on blockchain
   * 2. Updates oracle status in database
   */
  async deleteOracle(
    projectId: string,
    oracleWallet: Wallet,
    oracleDocumentId: number
  ): Promise<OracleDeleteResult> {
    // 1. BLOCKCHAIN OPERATION
    const tx: any = {
      TransactionType: 'OracleDelete',
      Account: oracleWallet.address,
      OracleDocumentID: oracleDocumentId
    };

    const response = await this.client.submitAndWait(tx, {
      wallet: oracleWallet,
      autofill: true
    });

    const meta = response.result.meta as any;
    if (meta?.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Oracle deletion failed: ${meta?.TransactionResult}`);
    }

    // 2. DATABASE OPERATION
    await XRPLPriceOracleDatabaseService.updateOracleStatus(
      projectId,
      oracleWallet.address,
      oracleDocumentId,
      'deleted'
    );

    return {
      transactionHash: response.result.hash
    };
  }

  /**
   * Get price data from oracle on XRPL (blockchain only)
   */
  async getOraclePriceData(
    oracleAddress: string,
    oracleDocumentId: number
  ): Promise<OracleDetails> {
    const response: any = await this.client.request({
      command: 'ledger_entry',
      oracle: {
        account: oracleAddress,
        oracle_document_id: oracleDocumentId
      },
      ledger_index: 'validated'
    });

    const oracle = response.result.node;

    return {
      provider: Buffer.from(oracle.Provider, 'hex').toString('utf8'),
      uri: Buffer.from(oracle.URI, 'hex').toString('utf8'),
      lastUpdateTime: oracle.LastUpdateTime,
      assetClass: Buffer.from(oracle.AssetClass, 'hex').toString('utf8'),
      priceData: oracle.PriceDataSeries.map((pd: any) => ({
        baseAsset: pd.BaseAsset,
        quoteAsset: pd.QuoteAsset,
        assetPrice: pd.AssetPrice,
        scale: pd.Scale
      }))
    };
  }

  /**
   * Get all oracles owned by an account (blockchain only)
   */
  async getAccountOracles(address: string): Promise<AccountOracleSummary[]> {
    const response: any = await this.client.request({
      command: 'account_objects',
      account: address,
      type: 'oracle',
      ledger_index: 'validated'
    });

    return response.result.account_objects.map((oracle: any) => ({
      oracleDocumentId: oracle.OracleDocumentID,
      provider: Buffer.from(oracle.Provider, 'hex').toString('utf8'),
      assetClass: Buffer.from(oracle.AssetClass, 'hex').toString('utf8'),
      lastUpdateTime: oracle.LastUpdateTime
    }));
  }

  /**
   * Update oracle with latest prices (convenience method)
   * Fetches current oracle config and updates with new prices
   */
  async updatePrices(
    projectId: string,
    oracleWallet: Wallet,
    oracleDocumentId: number,
    priceUpdates: PriceDataPoint[]
  ): Promise<OracleSetResult> {
    // Get current oracle data to preserve settings
    const currentOracle = await this.getOraclePriceData(
      oracleWallet.address,
      oracleDocumentId
    );

    // Update with new timestamp and prices
    return this.setOracle(projectId, {
      oracleWallet,
      oracleDocumentId,
      provider: currentOracle.provider,
      uri: currentOracle.uri,
      lastUpdateTime: Math.floor(Date.now() / 1000),
      assetClass: currentOracle.assetClass,
      priceDataSeries: priceUpdates
    });
  }
}
