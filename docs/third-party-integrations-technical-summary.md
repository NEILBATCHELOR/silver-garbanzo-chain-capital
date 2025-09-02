# Third-Party Integrations - Technical Summary
## Chain Capital Production - Developer Reference

### Quick Reference: Active Integrations

#### Blockchain Infrastructure
```javascript
// RPC Providers
- Alchemy (Primary): 12+ networks
- QuikNode (Backup): Bitcoin, Aptos, Sui, Near, Avalanche
- Networks: ETH, POLY, OP, ARB, BASE, ZKSYNC, SOL, BTC, APTOS, SUI, NEAR, AVAX

// Wallet Connection
- WalletConnect Project ID: e19ed9752e18e9d65fb885a9cd419aad
- Reown AppKit: v1.7.3
- Wagmi: v2.15.2
```

#### Custodial Services
```javascript
// Guardian Medex
- API: https://api.medex.guardian-dev.com
- Auth: Ed25519 signatures
- Features: Wallet creation, transaction signing, operation tracking

// DFNS
- API: https://api.dfns.ninja
- Features: Policy engine, staking, exchanges, AML/KYT, account abstraction
```

#### Security & Compliance
```javascript
// Cube3 Risk Assessment
- Wallet risk scoring
- Transaction verification
- Control lists management
- Real-time monitoring

// Onfido Identity Verification
- Document verification
- Biometric checks
- Sanctions screening
- Integrated via Supabase Edge Functions
```

#### On/Off Ramp Services
```javascript
// MoonPay
- Buy/sell crypto widgets
- Payment method diversity
- Webhook integration

// RAMP Network
- Embedded/hosted modes
- European payment focus
- Multi-payment methods

// Stripe Stablecoin
- USDC/USDB support
- Bridge integration
- Institutional payments
```

#### DEX & Trading
```javascript
// 1inch API Key: U3d1SWstXudboZLhNuciWOBzLDrXVDQb
// CoinGecko API Key: CG-UHKKUZwGdkzzexz4ZkqaQiHk
// Uniswap V4 SDK: v1.21.4
```

### Environment Variables Reference

#### Core Services
```bash
# Supabase
VITE_SUPABASE_URL=https://jrwfkxfzsnnjppogthaw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Guardian Medex
VITE_GUARDIAN_API_BASE_URL=https://api.medex.guardian-dev.com
VITE_GUARDIAN_API_KEY=24a8533f-216d-4629-a5a6-7a2be066f0d3
VITE_GUARDIAN_PRIVATE_KEY=c369400e32e03b75b2575cb709676904fcf1b5a6ef03670b4f0d248d240e9c20

# DFNS
VITE_DFNS_BASE_URL=https://api.dfns.ninja
VITE_DFNS_ENVIRONMENT=sandbox
```

#### Blockchain RPCs
```bash
# Alchemy (Primary)
VITE_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP
VITE_OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/Z3UXs7SblJNf-xGhHBc63iDRi9xqWCYP

# QuikNode (Backup)
VITE_BITCOIN_RPC_URL=https://proud-skilled-fog.blast-mainnet.quiknode.pro/5dc455368b6e13a2f7885bd651641ef622fe2151
VITE_APTOS_RPC_URL=https://proud-skilled-fog.aptos-mainnet.quiknode.pro/5dc455368b6e13a2f7885bd651641ef622fe2151
```

#### Payment Services
```bash
# MoonPay
VITE_MOONPAY_API_KEY=pk_test_...
VITE_MOONPAY_SECRET_KEY=sk_test_...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51RYoiePPxXk5VTnSaKjIU0LGOE5amL6PBCjx5iDG3DHO0ACFid87a2fqquBeg7xm6B8p60lmVz7CsvqaQpMXoFTV00XBC4NcNa
STRIPE_SECRET_KEY=sk_test_51RYoiePPxXk5VTnSsSLG8WG62FDSMxACe9Z5KHtA0OegG7elmnLHH5SYw6AyW3fNTbZejkd1uTZIjH4Li7Ht8meq00LxLNfSGz
```

### Key Dependencies

#### Blockchain Libraries
```json
{
  "ethers": "6.13.7",
  "viem": "2.29.0",
  "wagmi": "^2.15.2",
  "@solana/web3.js": "^1.98.2",
  "bitcoinjs-lib": "^6.1.7",
  "stellar-sdk": "^13.3.0",
  "xrpl": "^4.2.5"
}
```

#### UI & Framework
```json
{
  "react": "^18.2.0",
  "@radix-ui/react-*": "^1.x.x",
  "framer-motion": "^11.18.0",
  "recharts": "^2.15.2",
  "@tanstack/react-query": "^5.75.2"
}
```

#### Security & Crypto
```json
{
  "@noble/ed25519": "^2.2.3",
  "@noble/hashes": "^1.8.0",
  "@noble/curves": "^1.9.1",
  "buffer": "^6.0.3",
  "crypto-browserify": "^3.12.1"
}
```

### Service Implementation Patterns

#### 1. Blockchain Adapters
```typescript
// Location: src/infrastructure/web3/adapters/
// Pattern: Implements IBlockchainAdapter interface
export class EthereumAdapter extends EVMAdapter {
  constructor(networkType: NetworkType = 'mainnet') {
    // Network-specific configuration
  }
}
```

#### 2. API Services
```typescript
// Location: src/services/integrations/
// Pattern: Singleton service with error handling
export class OnfidoService {
  private static instance: OnfidoService;
  
  public static getInstance(): OnfidoService {
    if (!OnfidoService.instance) {
      OnfidoService.instance = new OnfidoService();
    }
    return OnfidoService.instance;
  }
}
```

#### 3. Widget Components
```typescript
// Location: src/components/ramp/
// Pattern: React component with event handling
export function RampWidget({
  config,
  mode = 'overlay',
  onPurchaseCreated,
  onError
}: RampWidgetProps) {
  // Widget implementation
}
```

### File Structure Overview

```
src/
├── components/
│   ├── ramp/                 # RAMP Network widgets
│   └── ui/                   # Radix/Shadcn components
├── infrastructure/
│   ├── guardian/             # Guardian Medex integration
│   ├── dfns/                 # DFNS custody services
│   └── web3/                 # Blockchain adapters
├── services/
│   ├── integrations/         # Third-party API services
│   ├── wallet/              # Wallet services (MoonPay, Stripe)
│   └── blockchain/          # Blockchain services
└── types/
    ├── guardian/            # Guardian types
    ├── dfns/               # DFNS types
    └── ramp/               # RAMP types
```

### Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run build-no-errors

# Generate Supabase types
npm run types:supabase
```

### Testing Integration Services

```typescript
// Mock services for testing
if (process.env.VITE_USE_MOCK_DATA === 'true') {
  // Use mock implementations
}

// Test API endpoints
await fetch('/api/test/guardian');
await fetch('/api/test/dfns');
await fetch('/api/test/cube3');
```

### Monitoring & Debugging

```typescript
// Enable debug logging
enableDebugLogging(true);

// Service health checks
await guardianClient.checkHealth();
await dfnsManager.checkHealth();
await cube3Service.checkHealth();
```

### Production Considerations

1. **API Keys**: Replace test keys with production keys
2. **Network Configuration**: Switch to mainnet RPCs
3. **Webhook URLs**: Configure production webhook endpoints
4. **Error Handling**: Implement proper error tracking
5. **Rate Limiting**: Implement API rate limiting
6. **Security**: Enable all security features

---

*This technical summary provides quick access to integration details for developers working on the Chain Capital Production platform.*
