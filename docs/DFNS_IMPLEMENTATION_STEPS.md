# DFNS Implementation Action Plan

## IMMEDIATE ACTIONS REQUIRED (Next 2-3 days)

### Step 1: Update Your Service Layer (1-2 hours)

Replace your current `dfnsService.ts` mock implementations:

```typescript
// In your existing dfnsService.ts file, replace mock methods:

// BEFORE (Mock implementation):
async getWalletBalances(walletId: string): Promise<WalletBalance[]> {
  // TODO: Implement DFNS wallet balance fetching
  // For now, return mock data
  return [
    {
      asset: { symbol: 'ETH', decimals: 18, verified: true, name: 'Ethereum', nativeAsset: true },
      balance: '1.5',
      valueInUSD: '2400.00',
      assetSymbol: 'ETH',
      valueInUsd: '2400.00'
    }
  ];
}

// AFTER (Real implementation):
async getWalletBalances(walletId: string): Promise<WalletBalance[]> {
  try {
    const response = await this.dfnsClient.wallets.getWalletAssets({ walletId });
    
    return response.assets?.map((asset: any) => ({
      asset: {
        symbol: asset.symbol,
        decimals: asset.decimals || 18,
        verified: asset.verified || false,
        name: asset.name,
        nativeAsset: asset.nativeAsset || false
      },
      balance: asset.balance,
      valueInUSD: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined,
      assetSymbol: asset.symbol,
      valueInUsd: asset.priceUsd ? (parseFloat(asset.balance) * parseFloat(asset.priceUsd)).toString() : undefined
    })) || [];
  } catch (error) {
    console.error('Failed to get wallet balances:', error);
    return [];
  }
}
```

### Step 2: Replace Custom HTTP Client (1 hour)

In your `DfnsManager.ts`, replace the custom client initialization:

```typescript
// BEFORE (Custom client):
import { DfnsApiClient } from './client'; // Your custom client

// AFTER (Official SDK):
import { DfnsApiClient } from '@dfns/sdk'; // Official SDK
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner';

constructor(config?: Partial<DfnsClientConfig>) {
  // BEFORE:
  this.client = new DfnsApiClient(finalConfig);

  // AFTER:
  this.client = new DfnsApiClient({
    appId: DFNS_CONFIG.appId,
    baseUrl: DFNS_CONFIG.baseUrl,
    signer: new AsymmetricKeySigner({
      privateKey: DFNS_CONFIG.serviceAccountPrivateKey!,
      credId: DFNS_CONFIG.serviceAccountId!,
    })
  });
}
```

### Step 3: Update Environment Configuration (15 minutes)

1. Copy the environment setup from `DFNS_ENVIRONMENT_SETUP.md`
2. Add your actual DFNS credentials to `.env.local`
3. Restart your development server

### Step 4: Update Migration Adapter (30 minutes)

Replace your `migration-adapter.ts` with the fixed version:

```typescript
// Use the FixedDfnsMigrationAdapter instead of the current one
import { FixedDfnsMigrationAdapter } from './fixed-migration-adapter';

// In your dfnsService.ts constructor:
this.adapter = new FixedDfnsMigrationAdapter(MIGRATION_CONFIG);
```

### Step 5: Test Real API Calls (30 minutes)

Create a test component to verify the integration:

```typescript
// Create: src/components/dfns/DfnsTestComponent.tsx
import React, { useState } from 'react';
import { realDfnsService } from '@/services/dfns/real-dfns-service';

export function DfnsTestComponent() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await realDfnsService.healthCheck();
      setResults(result);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  const testListWallets = async () => {
    setLoading(true);
    try {
      const result = await realDfnsService.listWallets();
      setResults(result);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h2>DFNS API Test</h2>
      <div className="space-x-2 mb-4">
        <button onClick={testHealthCheck} disabled={loading} className="btn">
          Test Health Check
        </button>
        <button onClick={testListWallets} disabled={loading} className="btn">
          Test List Wallets
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {results && (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

## VALIDATION CHECKLIST

After completing the steps above, verify:

- [ ] **No more mock data**: Service methods return real API responses
- [ ] **Official SDK in use**: Import statements use `@dfns/sdk` packages
- [ ] **Environment configured**: All required DFNS credentials set
- [ ] **Health check passes**: Can connect to DFNS API
- [ ] **Real wallet operations**: Can list/create wallets, get balances
- [ ] **Error handling works**: Proper error messages for failed operations
- [ ] **Database sync**: Wallet data stored in your Supabase tables

## EXPECTED RESULTS

After completion, you should be able to:

1. **Create real wallets** on DFNS and see them in your database
2. **Get real wallet balances** instead of mock data
3. **Perform real transfers** with actual transaction hashes
4. **Manage policies** through the DFNS policy engine
5. **See real activity logs** for all DFNS operations

## TROUBLESHOOTING

### Common Issues:

1. **"Invalid credentials" error**:
   - Verify your service account ID and private key
   - Ensure the service account has required permissions

2. **"Network error" or "Base URL not found"**:
   - Check VITE_DFNS_BASE_URL is correct
   - Verify you're using the right environment (sandbox vs production)

3. **"Method not found" errors**:
   - Ensure you're using the official SDK imports
   - Check that you're not using the custom HTTP client

4. **Components still showing mock data**:
   - Verify your components are using the updated service
   - Check that service methods are using real API calls

## NEXT STEPS

Once the core integration is working:

1. **Enable webhooks** for real-time updates
2. **Implement policy engine** for approval workflows
3. **Add exchange integrations** for trading
4. **Set up staking** for yield generation
5. **Configure compliance** with AML/KYT

## SUPPORT

If you encounter issues:

1. Check the DFNS documentation: https://docs.dfns.co
2. Review your configuration with the validation checklist
3. Test with the provided test component
4. Check browser console for detailed error messages
