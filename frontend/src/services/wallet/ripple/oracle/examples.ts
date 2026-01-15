/**
 * XRPL Price Oracle Usage Examples
 * Phase 6: Oracle & Price Feeds
 * 
 * This file demonstrates how to use the XRPLPriceOracleService
 */

import { Client, Wallet } from 'xrpl';
import { XRPLPriceOracleService } from './XRPLPriceOracleService';
import type { PriceDataPoint } from '../types/oracle';

/**
 * Example 1: Create a new price oracle for crypto prices
 */
async function createCryptoPriceOracle() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const oracleService = new XRPLPriceOracleService(client);
  const oracleWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'); // Your oracle wallet seed

  const priceData: PriceDataPoint[] = [
    {
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      assetPrice: 45000.50,
      scale: 2 // 2 decimal places
    },
    {
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      assetPrice: 2500.75,
      scale: 2
    },
    {
      baseAsset: 'XRP',
      quoteAsset: 'USD',
      assetPrice: 0.52,
      scale: 4 // More precision for smaller values
    }
  ];

  const result = await oracleService.setOracle({
    oracleWallet,
    oracleDocumentId: 1,
    provider: 'CryptoExchange',
    uri: 'https://api.exchange.com/prices',
    lastUpdateTime: Math.floor(Date.now() / 1000),
    assetClass: 'currency',
    priceDataSeries: priceData
  });

  console.log('Oracle created:', result);
  await client.disconnect();
}

/**
 * Example 2: Update existing oracle with new prices
 */
async function updateOraclePrices() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const oracleService = new XRPLPriceOracleService(client);
  const oracleWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

  const updatedPrices: PriceDataPoint[] = [
    {
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      assetPrice: 46200.00,
      scale: 2
    },
    {
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      assetPrice: 2600.00,
      scale: 2
    }
  ];

  const result = await oracleService.updatePrices(
    oracleWallet,
    1, // oracleDocumentId
    updatedPrices
  );

  console.log('Oracle updated:', result);
  await client.disconnect();
}

/**
 * Example 3: Read price data from oracle
 */
async function readOraclePrices() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const oracleService = new XRPLPriceOracleService(client);

  const priceData = await oracleService.getOraclePriceData(
    'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Oracle address
    1 // oracleDocumentId
  );

  console.log('Current prices:');
  priceData.priceData.forEach(price => {
    console.log(`${price.baseAsset}/${price.quoteAsset}: ${price.assetPrice}`);
  });

  await client.disconnect();
}

/**
 * Example 4: Get all oracles owned by an account
 */
async function listAccountOracles() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const oracleService = new XRPLPriceOracleService(client);

  const oracles = await oracleService.getAccountOracles(
    'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // Account address
  );

  console.log('Account oracles:');
  oracles.forEach(oracle => {
    console.log(`- Document ID: ${oracle.oracleDocumentId}`);
    console.log(`  Provider: ${oracle.provider}`);
    console.log(`  Asset Class: ${oracle.assetClass}`);
    console.log(`  Last Update: ${new Date(oracle.lastUpdateTime * 1000).toISOString()}`);
  });

  await client.disconnect();
}

/**
 * Example 5: Delete an oracle
 */
async function deleteOracle() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const oracleService = new XRPLPriceOracleService(client);
  const oracleWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

  const result = await oracleService.deleteOracle(
    oracleWallet,
    1 // oracleDocumentId
  );

  console.log('Oracle deleted:', result);
  await client.disconnect();
}

// Export examples for documentation
export const oracleExamples = {
  createCryptoPriceOracle,
  updateOraclePrices,
  readOraclePrices,
  listAccountOracles,
  deleteOracle
};
