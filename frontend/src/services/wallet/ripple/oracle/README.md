# XRPL Price Oracle Service

**Phase 6: Oracle & Price Feeds**

## Overview

The XRPL Price Oracle Service provides a comprehensive interface for managing on-chain price oracles on the XRP Ledger. This allows you to:

- Create and update price oracles with multiple asset pairs
- Read real-time price data from the ledger
- Manage oracle lifecycle (create, update, delete)
- Track oracle update history

## Features

✅ **Multi-Asset Support** - Track prices for multiple asset pairs in a single oracle
✅ **On-Chain Data** - All price data stored directly on XRPL
✅ **Flexible Updates** - Update prices with customizable precision
✅ **Audit Trail** - Complete transaction history of all oracle updates
✅ **Type-Safe** - Full TypeScript support with comprehensive types

## Database Schema

### Tables

1. **xrpl_price_oracles** - Oracle configurations
   - Stores oracle metadata and status
   - Links to projects for multi-tenant support

2. **xrpl_oracle_price_data** - Historical price data
   - Tracks all price points over time
   - Indexed for fast queries by asset pair

3. **xrpl_oracle_updates** - Transaction history
   - Complete audit trail of oracle updates
   - Links to XRPL transactions

## Installation

All required dependencies are already installed:
- `xrpl@^4.4.1`
- `bignumber.js@^9.3.0`

## Usage

### 1. Initialize the Service

```typescript
import { Client } from 'xrpl';
import { XRPLPriceOracleService } from '@/services/wallet/ripple/oracle';

const client = new Client('wss://s.altnet.rippletest.net:51233');
await client.connect();

const oracleService = new XRPLPriceOracleService(client);
```

### 2. Create a Price Oracle

```typescript
import { Wallet } from 'xrpl';

const oracleWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXX');

const result = await oracleService.setOracle({
  oracleWallet,
  oracleDocumentId: 1,
  provider: 'MyPriceProvider',
  uri: 'https://api.example.com/prices',
  lastUpdateTime: Math.floor(Date.now() / 1000),
  assetClass: 'currency',
  priceDataSeries: [
    {
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      assetPrice: 45000.50,
      scale: 2
    },
    {
      baseAsset: 'ETH',
      quoteAsset: 'USD',
      assetPrice: 2500.75,
      scale: 2
    }
  ]
});

console.log('Oracle created:', result.transactionHash);
```

### 3. Update Oracle Prices

```typescript
// Simple update with new prices
const updateResult = await oracleService.updatePrices(
  oracleWallet,
  1, // oracleDocumentId
  [
    {
      baseAsset: 'BTC',
      quoteAsset: 'USD',
      assetPrice: 46200.00,
      scale: 2
    }
  ]
);
```

### 4. Read Oracle Data

```typescript
const priceData = await oracleService.getOraclePriceData(
  'rOracleAddressXXXXXXXXXXXXXXXX',
  1
);

console.log('Provider:', priceData.provider);
console.log('Asset Class:', priceData.assetClass);
console.log('Prices:', priceData.priceData);
```

### 5. List Account Oracles

```typescript
const oracles = await oracleService.getAccountOracles(
  'rAccountAddressXXXXXXXXXXXXXXX'
);

oracles.forEach(oracle => {
  console.log(`Oracle ${oracle.oracleDocumentId}:`);
  console.log(`- Provider: ${oracle.provider}`);
  console.log(`- Asset Class: ${oracle.assetClass}`);
  console.log(`- Last Update: ${new Date(oracle.lastUpdateTime * 1000).toISOString()}`);
});
```

### 6. Delete an Oracle

```typescript
const deleteResult = await oracleService.deleteOracle(
  oracleWallet,
  1 // oracleDocumentId
);

console.log('Oracle deleted:', deleteResult.transactionHash);
```

## API Reference

### XRPLPriceOracleService

#### Methods

**setOracle(params: OracleSetParams): Promise<OracleSetResult>**
- Creates or updates a price oracle
- Parameters:
  - `oracleWallet`: Wallet that owns the oracle
  - `oracleDocumentId`: Unique ID for this oracle (1-4294967295)
  - `provider`: Provider name (e.g., "CoinGecko")
  - `uri`: API endpoint URL
  - `lastUpdateTime`: Unix timestamp of update
  - `assetClass`: Asset classification (e.g., "currency", "commodity")
  - `priceDataSeries`: Array of price data points

**deleteOracle(oracleWallet: Wallet, oracleDocumentId: number): Promise<OracleDeleteResult>**
- Deletes an oracle from the ledger
- Requires oracle owner's wallet

**getOraclePriceData(oracleAddress: string, oracleDocumentId: number): Promise<OracleDetails>**
- Retrieves current oracle configuration and prices
- Read-only operation (no transaction required)

**getAccountOracles(address: string): Promise<AccountOracleSummary[]>**
- Lists all oracles owned by an account
- Returns summary information for each oracle

**updatePrices(oracleWallet: Wallet, oracleDocumentId: number, priceUpdates: PriceDataPoint[]): Promise<OracleSetResult>**
- Convenience method to update only prices
- Preserves existing oracle configuration
- Automatically sets timestamp to current time

## Types

```typescript
interface PriceDataPoint {
  baseAsset: string;      // e.g., "BTC"
  quoteAsset: string;     // e.g., "USD"
  assetPrice: number;     // Price value
  scale: number;          // Decimal places (0-15)
}

interface OracleSetParams {
  oracleWallet: Wallet;
  oracleDocumentId: number;
  provider: string;
  uri: string;
  lastUpdateTime: number;
  assetClass: string;
  priceDataSeries: PriceDataPoint[];
}
```

## Best Practices

### Price Precision

Choose appropriate scale values:
- **Currency pairs**: `scale: 2` (e.g., $45,000.50)
- **Crypto/fiat**: `scale: 4` (e.g., $0.5234)
- **High precision**: `scale: 8` (e.g., satoshi-level precision)

### Update Frequency

- Consider transaction costs when updating
- Batch multiple asset pairs in single update
- Cache prices off-chain between updates
- Use websockets for real-time data consumption

### Security

- Store oracle wallet seeds securely (encrypted)
- Use separate wallets for different oracle purposes
- Implement access controls for price updates
- Log all oracle modifications

### Asset Classes

Common values:
- `currency` - Fiat and crypto currencies
- `commodity` - Gold, silver, oil, etc.
- `equity` - Stock prices
- `index` - Market indices
- `custom` - Domain-specific assets

## Integration with Database

### Storing Oracle Data

```typescript
import { supabase } from '@/lib/supabase';

// After creating oracle
await supabase.from('xrpl_price_oracles').insert({
  project_id: projectId,
  oracle_address: oracleWallet.address,
  oracle_document_id: result.oracleDocumentId,
  provider: 'MyProvider',
  uri: 'https://api.example.com',
  asset_class: 'currency',
  status: 'active',
  last_update_time: Math.floor(Date.now() / 1000)
});
```

### Tracking Price History

```typescript
// Store price data points
for (const price of priceDataSeries) {
  await supabase.from('xrpl_oracle_price_data').insert({
    oracle_id: oracleDbId,
    base_asset: price.baseAsset,
    quote_asset: price.quoteAsset,
    asset_price: price.assetPrice,
    scale: price.scale,
    update_time: Math.floor(Date.now() / 1000)
  });
}
```

### Recording Updates

```typescript
// Log oracle update transaction
await supabase.from('xrpl_oracle_updates').insert({
  oracle_id: oracleDbId,
  transaction_hash: result.transactionHash,
  price_data: priceDataSeries,
  previous_price_data: previousPrices,
  update_time: Math.floor(Date.now() / 1000),
  updated_by: userId
});
```

## Error Handling

```typescript
try {
  const result = await oracleService.setOracle(params);
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('tecNO_PERMISSION')) {
    console.error('Permission denied - check oracle wallet');
  } else if (error.message.includes('tecNO_ENTRY')) {
    console.error('Oracle not found');
  } else {
    console.error('Oracle operation failed:', error);
  }
}
```

## Testing

Example test on Testnet:

```typescript
import { Client, Wallet } from 'xrpl';

const testOracle = async () => {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  // Fund test wallet from faucet
  const wallet = Wallet.generate();
  await client.fundWallet(wallet);

  const service = new XRPLPriceOracleService(client);

  // Create oracle
  const result = await service.setOracle({
    oracleWallet: wallet,
    oracleDocumentId: 1,
    provider: 'TestProvider',
    uri: 'https://test.com',
    lastUpdateTime: Math.floor(Date.now() / 1000),
    assetClass: 'currency',
    priceDataSeries: [{
      baseAsset: 'TEST',
      quoteAsset: 'USD',
      assetPrice: 100.00,
      scale: 2
    }]
  });

  console.log('Test oracle created:', result.transactionHash);

  // Read back
  const data = await service.getOraclePriceData(wallet.address, 1);
  console.log('Oracle data:', data);

  await client.disconnect();
};
```

## Migration Applied

The following database tables have been created:

```sql
✅ xrpl_price_oracles
✅ xrpl_oracle_price_data  
✅ xrpl_oracle_updates
```

All indexes and constraints are in place for optimal performance.

## Related Documentation

- [XRPL Documentation](https://xrpl.org/price-oracles.html)
- [Phase 6 Implementation Plan](../../../docs/XRPL_COMPREHENSIVE_INTEGRATION_PLAN_PART2.md)
- [Oracle Types](../types/oracle.ts)

## Support

For issues or questions:
1. Check the [examples.ts](./examples.ts) file
2. Review the [integration plan documentation](../../../docs/)
3. Test on Testnet before using Mainnet

## License

Part of Chain Capital Platform - All Rights Reserved
