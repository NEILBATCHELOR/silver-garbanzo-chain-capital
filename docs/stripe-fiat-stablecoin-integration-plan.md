# Stripe FIAT-to-Stablecoin Integration Strategic Plan

## Executive Summary

This document outlines a comprehensive plan to implement Stripe's FIAT-to-stablecoin conversion functionality for Chain Capital Production, enabling clients to:

1. **Deposit FIAT currency** and convert to stablecoins (USDC, USDB)
2. **Convert stablecoins** back to FIAT currency

The implementation leverages Stripe's newly launched stablecoin financial accounts, crypto onramp, and Bridge integration to provide seamless bi-directional conversion between traditional finance and decentralized stablecoins.

## Current State Analysis

### ✅ Existing Infrastructure
- **Wallet Services**: Comprehensive wallet management in `/src/services/wallet/`
- **Transaction System**: Support for wallet transactions, Moonpay, RAMP Network
- **Database Schema**: Robust transaction tables supporting multiple providers
- **UI Framework**: React 18 + TypeScript + Vite + Tailwind + Radix UI
- **Backend**: Supabase PostgreSQL + Node.js/Express API
- **Ready Directory**: Empty `/src/services/wallet/stripe/` awaiting implementation

### 🔍 Stripe Capabilities Assessment
Based on research of Stripe's latest crypto offerings:

#### **Stablecoin Payments** (Available Now)
- Accept USDC payments on Ethereum, Solana, Polygon
- Automatic settlement as FIAT in Stripe balance
- 1.5% transaction fee
- Integration via Checkout, Elements, or Payment Intents API

#### **Stablecoin Financial Accounts** (Recently Launched)
- Hold stablecoin balances (USDC, USDB)
- Receive funds via crypto and fiat rails (ACH, SEPA, wire)
- Send USD via traditional payment networks or stablecoins over crypto networks
- Available in 101 countries (excludes US, UK, EU for now)

#### **Crypto Onramp** (Public Preview)
- FIAT-to-crypto purchase functionality
- Embeddable or hosted integration options
- Supports credit, debit, Apple Pay, ACH
- KYC/compliance handled by Stripe

#### **Bridge Integration** (Acquired 2025)
- Stablecoin infrastructure platform
- USDB stablecoin issuance
- Global payment rails connectivity

## Strategic Implementation Plan

### Phase 1: Foundation & Infrastructure (2-3 weeks)

#### 1.1 Node Modules Installation
```bash
# Stripe core packages
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js

# Crypto-specific Stripe packages
pnpm add @stripe/crypto @stripe/bridge-sdk

# Additional utilities
pnpm add @types/stripe decimal.js
```

#### 1.2 Environment Configuration
```typescript
// Add to .env
STRIPE_PUBLISHABLE_KEY=pk_test_51RYoiePPxXk5VTnSaKjIU0LGOE5amL6PBCjx5iDG3DHO0ACFid87a2fqquBeg7xm6B8p60lmVz7CsvqaQpMXoFTV00XBC4NcNa
STRIPE_SECRET_KEY=sk_test_51RYoiePPxXk5VTnSsSLG8WG62FDSMxACe9Z5KHtA0OegG7elmnLHH5SYw6AyW3fNTbZejkd1uTZIjH4Li7Ht8meq00LxLNfSGz
STRIPE_WEBHOOK_SECRET=[To be configured]
STRIPE_ENVIRONMENT=test
```

#### 1.3 Database Schema Extensions
Create new tables for Stripe-specific functionality:

```sql
-- Stripe stablecoin accounts
CREATE TABLE stripe_stablecoin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  account_id varchar(255) NOT NULL, -- Stripe account ID
  balance_usdc decimal(20,8) DEFAULT 0,
  balance_usdb decimal(20,8) DEFAULT 0,
  account_status varchar(50) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Stripe conversion transactions
CREATE TABLE stripe_conversion_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id varchar(255),
  stripe_session_id varchar(255),
  conversion_type varchar(20) NOT NULL CHECK (conversion_type IN ('fiat_to_crypto', 'crypto_to_fiat')),
  
  -- Source details
  source_currency varchar(10) NOT NULL,
  source_amount decimal(20,8) NOT NULL,
  source_network varchar(50), -- For crypto sources
  
  -- Destination details  
  destination_currency varchar(10) NOT NULL,
  destination_amount decimal(20,8),
  destination_network varchar(50), -- For crypto destinations
  destination_wallet varchar(255), -- Wallet address for crypto
  
  -- Transaction details
  exchange_rate decimal(20,8),
  fees decimal(20,8),
  stripe_fee decimal(20,8),
  network_fee decimal(20,8),
  
  -- Status tracking
  status varchar(50) DEFAULT 'pending',
  stripe_status varchar(50),
  transaction_hash varchar(255), -- For on-chain transactions
  block_number bigint,
  confirmations integer DEFAULT 0,
  
  -- Metadata
  metadata jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Stripe webhook events
CREATE TABLE stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id varchar(255) UNIQUE NOT NULL,
  event_type varchar(100) NOT NULL,
  processed boolean DEFAULT false,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_stripe_conversion_transactions_user_id ON stripe_conversion_transactions(user_id);
CREATE INDEX idx_stripe_conversion_transactions_status ON stripe_conversion_transactions(status);
CREATE INDEX idx_stripe_conversion_transactions_type ON stripe_conversion_transactions(conversion_type);
CREATE INDEX idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
```

#### 1.4 Core Service Architecture
```typescript
// File structure to create:
/src/services/wallet/stripe/
├── index.ts                          // Main exports
├── StripeClient.ts                   // Stripe client configuration
├── StablecoinAccountService.ts       // Account management
├── ConversionService.ts              // FIAT ↔ stablecoin conversions
├── OnrampService.ts                  // FIAT → crypto onramp
├── PaymentService.ts                 // Stablecoin payments
├── WebhookService.ts                 // Webhook handling
├── types.ts                          // Stripe-specific types
└── utils.ts                          // Helper functions

/src/components/wallet/components/stripe/
├── index.ts                          // Component exports
├── StablecoinAccountDashboard.tsx    // Account overview
├── FiatToStablecoinForm.tsx         // Deposit FIAT → receive stablecoins
├── StablecoinToFiatForm.tsx         // Convert stablecoins → FIAT
├── ConversionHistory.tsx            // Transaction history
├── OnrampWidget.tsx                 // Embedded onramp
└── StripeProvider.tsx               // React Stripe context
```

### Phase 2: Core Services Implementation (3-4 weeks)

#### 2.1 Stripe Client Configuration
```typescript
// /src/services/wallet/stripe/StripeClient.ts
import Stripe from 'stripe';

export class StripeClient {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }

  // Stablecoin Financial Accounts methods
  async createStablecoinAccount(customerId: string) {
    return this.stripe.financialAccounts.create({
      customer: customerId,
      features: {
        card_issuing: { requested: true },
        deposit_insurance: { requested: true },
        financial_addresses: { 
          ach: { requested: true },
          wire: { requested: true }
        },
        inbound_transfers: { 
          ach: { requested: true },
          wire: { requested: true }
        },
        outbound_transfers: {
          ach: { requested: true },
          wire: { requested: true },
          us_domestic_wire: { requested: true }
        }
      }
    });
  }
}
```

#### 2.2 Conversion Service Implementation
```typescript
// /src/services/wallet/stripe/ConversionService.ts
export class ConversionService {
  private stripeClient: StripeClient;
  
  // FIAT → Stablecoin conversion
  async createFiatToStablecoinSession(params: {
    userId: string;
    fiatAmount: number;
    fiatCurrency: string;
    targetStablecoin: 'USDC' | 'USDB';
    targetNetwork: 'ethereum' | 'solana' | 'polygon';
    walletAddress: string;
  }) {
    // Implementation using Stripe Checkout + Crypto onramp
  }
  
  // Stablecoin → FIAT conversion
  async createStablecoinToFiatTransfer(params: {
    userId: string;
    stablecoinAmount: number;
    stablecoin: 'USDC' | 'USDB';
    sourceNetwork: string;
    targetFiatCurrency: string;
    targetBankAccount: string;
  }) {
    // Implementation using Stablecoin Financial Accounts
  }
}
```

#### 2.3 Database Integration Service
```typescript
// /src/services/wallet/stripe/DatabaseService.ts
export class StripeDatabaseService {
  async createConversionTransaction(data: StripeConversionTransactionInsert) {
    // Insert into stripe_conversion_transactions
  }
  
  async updateTransactionStatus(id: string, status: string, metadata?: any) {
    // Update transaction status with webhook data
  }
  
  async getStablecoinAccount(userId: string) {
    // Fetch user's stablecoin account details
  }
}
```

### Phase 3: Frontend Components (2-3 weeks)

#### 3.1 Core UI Components
```typescript
// /src/components/wallet/components/stripe/FiatToStablecoinForm.tsx
export const FiatToStablecoinForm = () => {
  // Form for depositing FIAT and receiving stablecoins
  // - Amount input with currency selector
  // - Stablecoin selection (USDC/USDB)
  // - Network selection (Ethereum/Solana/Polygon)
  // - Wallet address input/selection
  // - Fee calculation and display
  // - Stripe payment integration
};

// /src/components/wallet/components/stripe/StablecoinToFiatForm.tsx
export const StablecoinToFiatForm = () => {
  // Form for converting stablecoins to FIAT
  // - Stablecoin balance display
  // - Amount input with max balance
  // - FIAT currency selection
  // - Bank account selection/setup
  // - Exchange rate and fee display
  // - Conversion confirmation
};
```

#### 3.2 Integration with Existing Wallet UI
```typescript
// Update /src/components/wallet/EnhancedWalletInterface.tsx
// Add Stripe stablecoin tabs:
// - "Deposit FIAT" → FiatToStablecoinForm
// - "Withdraw to Bank" → StablecoinToFiatForm
// - "Stablecoin Balance" → Account overview
```

### Phase 4: Webhook & Backend Integration (1-2 weeks)

#### 4.1 Webhook Handlers
```typescript
// /src/services/wallet/stripe/WebhookService.ts
export class StripeWebhookService {
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handleFiatToStablecoinSuccess(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event);
        break;
      case 'financial_account.funds_received':
        await this.handleStablecoinReceived(event);
        break;
      case 'financial_account.outbound_payment.created':
        await this.handleFiatPayout(event);
        break;
    }
  }
}
```

#### 4.2 Express API Routes
```typescript
// /server.ts additions
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), 
  stripeWebhookHandler);
app.post('/api/stripe/create-conversion-session', createConversionSession);
app.get('/api/stripe/conversion-status/:id', getConversionStatus);
app.post('/api/stripe/initiate-withdrawal', initiateStablecoinWithdrawal);
```

### Phase 5: Testing & Security (1-2 weeks)

#### 5.1 Test Suite
```typescript
// Create comprehensive tests for:
// - Conversion flow simulation
// - Webhook event handling
// - Database transaction integrity
// - Error scenarios and recovery
// - UI component interactions
```

#### 5.2 Security Measures
- Webhook signature verification
- Rate limiting on conversion endpoints  
- Amount validation and limits
- KYC/AML compliance integration
- Audit logging for all transactions

## Technical Requirements

### Required Node Modules
```json
{
  "dependencies": {
    "stripe": "^16.12.0",
    "@stripe/stripe-js": "^4.10.0", 
    "@stripe/react-stripe-js": "^2.8.0",
    "@stripe/crypto": "^1.0.0",
    "@stripe/bridge-sdk": "^1.0.0",
    "decimal.js": "^10.4.3"
  },
  "devDependencies": {
    "@types/stripe": "^8.0.417"
  }
}
```

### Configuration Requirements
1. **Stripe Account Setup**:
   - Enable crypto payments in Stripe dashboard
   - Apply for stablecoin financial accounts access
   - Configure webhook endpoints
   - Set up test/production API keys

2. **Compliance Requirements**:
   - KYC/AML verification integration
   - Geographic restrictions compliance
   - Transaction monitoring and reporting

## Integration Architecture

### Data Flow: FIAT → Stablecoin
```
User Input (FIAT amount) 
→ Stripe Checkout Session 
→ Payment Processing 
→ Crypto Onramp Conversion 
→ Stablecoin Delivery to Wallet 
→ Database Transaction Recording 
→ UI Status Updates
```

### Data Flow: Stablecoin → FIAT  
```
User Stablecoin Balance 
→ Conversion Request 
→ Stripe Financial Account Transfer 
→ FIAT Conversion 
→ Bank Account Deposit 
→ Database Status Updates 
→ User Notification
```

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement queuing and retry mechanisms
- **Network Congestion**: Multi-network support for redundancy
- **Exchange Rate Volatility**: Real-time rate updates and slippage protection

### Business Risks  
- **Regulatory Changes**: Modular architecture for easy compliance updates
- **Stripe Service Changes**: Abstraction layer for provider independence
- **Transaction Failures**: Comprehensive error handling and user communication

## Success Metrics

### Technical KPIs
- Transaction success rate > 99%
- Average conversion time < 5 minutes
- UI response time < 2 seconds
- Zero security incidents

### Business KPIs
- User adoption rate
- Conversion volume growth
- Customer satisfaction scores  
- Cost per transaction efficiency

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1**: Foundation | 2-3 weeks | Database schema, service architecture, environment setup |
| **Phase 2**: Core Services | 3-4 weeks | Stripe integration, conversion logic, API endpoints |
| **Phase 3**: Frontend | 2-3 weeks | UI components, wallet integration, user experience |
| **Phase 4**: Backend Integration | 1-2 weeks | Webhooks, Express routes, real-time updates |
| **Phase 5**: Testing & Security | 1-2 weeks | Comprehensive testing, security hardening |

**Total Estimated Timeline**: 9-14 weeks

## Next Steps

1. **Immediate Actions**:
   - Review and approve this strategic plan
   - Set up Stripe test account with crypto features enabled  
   - Begin Phase 1 implementation with database schema creation

2. **Stakeholder Alignment**:
   - Confirm business requirements and user experience expectations
   - Validate compliance and regulatory requirements
   - Establish success metrics and testing criteria

3. **Resource Allocation**:
   - Assign development team members to specific phases
   - Schedule regular review checkpoints
   - Prepare staging and production environments

This strategic plan provides a comprehensive roadmap for implementing Stripe's FIAT-to-stablecoin conversion functionality while leveraging your existing infrastructure and maintaining high standards for security, performance, and user experience.
