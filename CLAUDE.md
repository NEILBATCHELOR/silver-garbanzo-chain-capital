# Chain Capital - AI Assistant Development Guide

**Version**: 1.0
**Last Updated**: November 20, 2025
**Purpose**: Comprehensive guide for AI assistants working on the Chain Capital tokenization platform

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Codebase Structure](#codebase-structure)
4. [Development Workflows](#development-workflows)
5. [Code Conventions & Standards](#code-conventions--standards)
6. [Type System Architecture](#type-system-architecture)
7. [Key Patterns & Principles](#key-patterns--principles)
8. [Database Schema](#database-schema)
9. [Testing Strategy](#testing-strategy)
10. [Common Tasks & Recipes](#common-tasks--recipes)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

### What is Chain Capital?

Chain Capital is an **institutional-grade blockchain tokenization platform** designed to enable investment professionals to securitize and tokenize traditional and alternative assets. The platform provides comprehensive infrastructure for:

- **Multi-chain token issuance** (ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626)
- **KYC/AML compliance** and regulatory reporting
- **Investor/issuer onboarding** with role-based access control
- **Redemption management** with automated workflows
- **Multi-signature wallets** and HSM integration
- **Payment service provider** integration (Stripe, etc.)
- **Cap table management** and corporate actions
- **Audit trails** and compliance tracking

### Current Status

✅ **Production Ready** - Multiple systems operational:
- 260+ database tables with full relationships
- 86/86 critical routes secured with permissions
- 250+ RESTful API endpoints across 13+ services
- 8-chain blockchain support
- Comprehensive audit system with 4,800+ logged events

### Business Context

Chain Capital has structured finance solutions for:
- Tokenizing forest road digital investment funds (FRDIT)
- 3-month money market funds (TMMF) for Commerzbank
- ABCP deals for Medex
- Digital ETFs for Invesco

---

## 🏗 Architecture & Tech Stack

### Monorepo Structure

This is a **pnpm workspace monorepo** with two main workspaces:

```
chain-capital-platform/
├── frontend/          # React SPA
├── backend/           # Fastify API
└── package.json       # Root workspace config
```

### Frontend Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.0 | UI framework |
| **TypeScript** | 5.2.2 | Type safety |
| **Vite** | 5.2.0 | Build tool & dev server |
| **Supabase** | 2.45.6+ | Database client & auth |
| **Radix UI** | Latest | Accessible UI primitives |
| **shadcn/ui** | Latest | UI component system |
| **Tailwind CSS** | 3.4.1 | Styling |
| **Ethers.js** | 6.13.7 | Ethereum interactions |
| **Wagmi** | 2.15.2+ | React hooks for Ethereum |
| **Viem** | 2.29.0 | TypeScript Ethereum library |
| **React Router** | 6.23.1 | Routing |
| **React Query** | 5.75.2+ | Data fetching |
| **Zustand** | 5.0.5+ | State management |
| **Zod** | 3.24.2 | Schema validation |

### Backend Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Fastify** | 4.28.1 | HTTP server framework |
| **Prisma** | 6.12.0+ | ORM & database toolkit |
| **PostgreSQL** | Latest | Database (via Supabase) |
| **TypeScript** | 5.6.2 | Type safety |
| **Zod** | 3.23.8 | Schema validation |
| **JWT** | Latest | Authentication |
| **AWS SDK** | 3.835.0+ | CloudHSM & KMS |
| **Azure SDK** | 4.0.1+ | Key Vault |
| **Google Cloud** | 5.1.0+ | Cloud KMS |
| **bcrypt** | 6.0.0 | Password hashing |
| **Pino** | 9.4.0+ | Logging |

### Blockchain Support

The platform supports **8+ blockchain networks**:
- Ethereum (& Sepolia testnet)
- Base (Layer 2)
- Arbitrum
- Polygon
- Solana
- Cosmos
- Bitcoin
- NEAR
- Stellar
- Aptos
- Sui
- XRP

### Database

- **Provider**: Supabase (PostgreSQL)
- **Tables**: 260+ production tables
- **Views**: Custom database views for complex queries
- **Schema Size**: 852KB Prisma schema file
- **Migrations**: Prisma migrate for schema evolution

---

## 📁 Codebase Structure

### Frontend Directory Organization (`/frontend/src/`)

```
frontend/src/
├── components/              # 35+ feature-based component directories
│   ├── auth/               # Authentication UI
│   ├── wallet/             # Multi-chain wallet UI (9 subdirs)
│   ├── tokens/             # Token management UI (21 subdirs)
│   ├── redemption/         # Redemption workflow UI
│   ├── compliance/         # KYC/AML document management
│   ├── psp/                # Payment service provider UI
│   ├── investors/          # Investor portfolio & onboarding
│   ├── projects/           # Project management UI
│   ├── dashboard/          # Analytics dashboards
│   ├── captable/           # Cap table management
│   ├── admin/              # Admin panels
│   └── ui/                 # Shared Radix/shadcn components
│
├── services/               # 38 service modules (business logic)
│   ├── auth/               # Authentication services
│   ├── wallet/             # Wallet operations (12 subdirs)
│   ├── token/              # Token operations
│   ├── redemption/         # Redemption services
│   ├── compliance/         # KYC/AML services
│   ├── psp/                # PSP integration
│   ├── investor/           # Investor management
│   └── [domain services]/  # Other domain services
│
├── infrastructure/         # 21 technical infrastructure directories
│   ├── gateway/            # CryptoOperationGateway (orchestration)
│   │   ├── CryptoOperationGateway.ts
│   │   ├── executors/      # Operation execution layer
│   │   ├── validators/     # Pre-execution validation
│   │   └── monitors/       # Gas/operation monitoring
│   ├── policy/             # Policy engine (off-chain validation)
│   ├── foundry/            # Smart contract integration
│   ├── web3/               # Multi-chain blockchain layer (17 subdirs)
│   ├── database/           # Supabase client & types
│   ├── auth/               # Authentication infrastructure
│   ├── compliance/         # Compliance validation (5 subdirs)
│   └── api/                # API layer (7 subdirs)
│
├── hooks/                  # 19 custom React hooks
│   ├── auth/               # Authentication hooks
│   ├── wallet/             # Wallet hooks
│   ├── tokens/             # Token hooks
│   └── [feature hooks]/    # Domain-specific hooks
│
├── types/                  # 19 TypeScript type definition directories
│   ├── TYPE_SYSTEM.md      # Type architecture docs
│   ├── core/               # Core domain types
│   ├── supabase.ts         # Auto-generated DB types
│   ├── database.ts         # Extended DB types
│   └── centralModels.ts    # Business domain models
│
├── pages/                  # Route page components
├── routes/                 # Routing configuration
├── utils/                  # 22 utility directories
├── config/                 # Configuration files
├── providers/              # React context providers
└── theme/                  # Tailwind theme customization
```

### Backend Directory Organization (`/backend/src/`)

```
backend/src/
├── services/               # 21 service modules (business logic)
│   ├── BaseService.ts      # Base service class
│   ├── wallets/            # Wallet operations (12 subdirs)
│   │   ├── HDWalletService.ts
│   │   ├── TransactionService.ts (59KB - major service)
│   │   ├── WalletService.ts
│   │   ├── hsm/            # Hardware Security Module
│   │   ├── multi-sig/      # Multi-signature wallets
│   │   ├── smart-contract/ # Smart contract wallets
│   │   └── webauthn/       # WebAuthn/Passkey support
│   ├── psp/                # PSP operations (11 subdirs)
│   ├── compliance/         # KYC/AML processing
│   ├── redemption/         # Redemption workflows
│   ├── audit/              # Audit logging
│   └── [domain services]/  # Other services
│
├── routes/                 # 22 API endpoint files
│   ├── wallets.ts          # Wallet API (84KB - major route)
│   ├── compliance.ts       # Compliance API (37KB)
│   ├── investors.ts        # Investor API (39KB)
│   ├── factoring.ts        # Factoring API (47KB)
│   └── [other routes]/     # Domain APIs
│
├── middleware/             # Fastify middleware
│   ├── auth/               # Authentication
│   ├── audit/              # Audit logging
│   ├── auditLogger.ts      # Audit logger (11KB)
│   └── errorHandler.ts     # Error handling
│
├── infrastructure/         # Technical infrastructure
│   ├── database/           # Database layer
│   ├── supabaseClient.ts   # Supabase client
│   ├── realtime.ts         # Real-time updates
│   └── [other infra]/      # API helpers, logging, etc.
│
├── types/                  # 24 TypeScript type files
├── plugins/                # Fastify plugins
├── config/                 # Configuration
└── utils/                  # Utility functions
```

### Smart Contracts (`/frontend/foundry-contracts/`)

```
foundry-contracts/
├── src/                    # Solidity contracts (13 subdirs)
├── test/                   # Contract tests
├── script/                 # Deployment scripts
└── deployments/            # Deployment configurations
```

---

## 🔄 Development Workflows

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd silver-garbanzo-chain-capital

# Install dependencies (uses pnpm)
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development servers
pnpm dev                    # Both frontend & backend
pnpm dev:frontend           # Frontend only (port 5173)
pnpm dev:backend            # Backend only (port 3001)
```

### Development Commands

#### Root Commands (Workspace)

```bash
# Development
pnpm dev                    # Run both frontend & backend
pnpm dev:frontend           # Frontend dev server
pnpm dev:backend            # Backend dev server

# Building
pnpm build                  # Build both workspaces
pnpm build:frontend         # Build frontend only
pnpm build:backend          # Build backend only

# Testing
pnpm test                   # Run all tests
pnpm test:frontend          # Frontend tests
pnpm test:backend           # Backend tests

# Type Checking
pnpm type-check             # Check types in both workspaces
pnpm type-check:frontend    # Frontend type check
pnpm type-check:backend     # Backend type check

# Linting & Formatting
pnpm lint                   # Lint both workspaces
pnpm format                 # Format both workspaces

# Database (Prisma)
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run migrations
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:up              # Start Docker services
pnpm docker:down            # Stop Docker services
```

#### Frontend-Specific Commands

```bash
cd frontend

# Development
pnpm dev                    # Vite dev server
pnpm build                  # Production build
pnpm preview                # Preview production build

# Type System
pnpm types:supabase         # Generate types from Supabase
pnpm types:validate         # Validate type alignment
pnpm types:fix-inconsistencies  # Fix type issues
pnpm types:update-db        # Update database types
pnpm types:suggest-models   # Suggest central models

# Smart Contracts
pnpm contracts:deploy-factory       # Deploy token factory
pnpm contracts:verify-hoodi         # Verify Hoodi contracts
```

#### Backend-Specific Commands

```bash
cd backend

# Development
pnpm dev:accurate           # Enhanced dev server
pnpm start                  # Production server
pnpm kill:port              # Kill process on port 3001

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run migrations
pnpm db:reset               # Reset database
pnpm db:seed                # Seed database

# Testing Services
pnpm test:investors         # Test investor service
pnpm test:wallets           # Test wallet services
pnpm test:hsm               # Test HSM integration
```

### Git Workflow

#### Branch Naming Convention

All development branches **MUST** follow this pattern:
```
claude/<description>-<session-id>
```

Example: `claude/claude-md-mi7fj14jbp3uociq-01DJ7R4HiHc2h5chkG1FKJbH`

#### Commit Guidelines

1. **Clear, descriptive messages** focusing on "why" rather than "what"
2. **Follow repository style** (check `git log` for examples)
3. **Never commit secrets** (.env, credentials.json, etc.)
4. **Use heredoc for multi-line commits**:

```bash
git commit -m "$(cat <<'EOF'
Add redemption configuration UI

- Implement CRUD operations for redemption rules
- Add real-time validation
- Integrate with RedemptionService
EOF
)"
```

#### Push Operations

**CRITICAL**: Always push with `-u` flag:
```bash
git push -u origin <branch-name>
```

Retry logic for network failures:
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Only retry on network errors, not auth failures

#### Creating Pull Requests

Use `gh` CLI (GitHub CLI) for all PR operations:

```bash
# Create PR with heredoc for body
gh pr create --title "Add redemption automation" --body "$(cat <<'EOF'
## Summary
- Implemented automated redemption processing
- Added blackout period validation
- Enhanced error handling

## Test plan
- [ ] Test redemption rule creation
- [ ] Verify blackout period enforcement
- [ ] Check error handling
EOF
)"
```

**Before creating PR**:
1. Review all commits that will be included (not just latest!)
2. Ensure branch is up to date with remote
3. Draft comprehensive PR summary covering ALL changes

---

## 📐 Code Conventions & Standards

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| **Database Tables** | snake_case (plural) | `redemption_rules`, `user_permissions` |
| **Database Columns** | snake_case | `user_id`, `created_at` |
| **TypeScript Types** | PascalCase | `RedemptionRule`, `UserPermission` |
| **TypeScript Interfaces** | PascalCase | `IWalletService`, `PolicyContext` |
| **Functions/Methods** | camelCase | `createRule()`, `getUserPermissions()` |
| **Variables** | camelCase | `redemptionRules`, `userId` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| **Files (Components)** | PascalCase | `RedemptionConfig.tsx` |
| **Files (Utilities)** | camelCase or kebab-case | `formatters.ts`, `api-client.ts` |
| **Directories** | kebab-case or camelCase | `redemption/`, `userManagement/` |

### File Organization Standards

1. **File Size**: Keep files under 400 lines when possible
2. **Domain Organization**: Group by feature/domain, not by technical type
3. **Service Pattern**: One service per domain (e.g., `RedemptionService.ts`)
4. **Component Pattern**: Feature directories with index exports

### TypeScript Standards

#### Strict Mode Configuration

All TypeScript must compile with strict mode enabled:

```typescript
{
  "strict": true,
  "noUnusedLocals": false,        // Warnings, not errors
  "noUnusedParameters": false,    // Warnings, not errors
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

#### Type Annotations

```typescript
// ✅ GOOD: Explicit types for function parameters and returns
function createRedemptionRule(
  projectId: string,
  rule: RedemptionRuleInput
): Promise<RedemptionRule> {
  // ...
}

// ❌ BAD: Implicit any types
function createRedemptionRule(projectId, rule) {
  // ...
}
```

#### Type Imports

```typescript
// ✅ GOOD: Use type imports for types only
import type { RedemptionRule } from '@/types/centralModels';
import { createRule } from '@/services/redemption';

// ❌ BAD: Mixing value and type imports
import { RedemptionRule, createRule } from '@/services/redemption';
```

### UI Component Standards

#### Use Radix UI + shadcn/ui ONLY

```typescript
// ✅ GOOD: Use shadcn/ui components
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// ❌ BAD: Never use Material UI or other UI libraries
import { Button } from '@mui/material';  // FORBIDDEN
```

#### Component Structure

```typescript
// Standard component structure
interface ComponentProps {
  // Props with explicit types
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks at the top
  const [state, setState] = useState();
  const { data } = useQuery();

  // 2. Event handlers
  const handleClick = () => {
    // ...
  };

  // 3. Render logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Service Layer Standards

#### Service Pattern

```typescript
// services/redemption/RedemptionService.ts
export class RedemptionService {
  constructor(
    private supabase: SupabaseClient,
    private logger?: Logger
  ) {}

  async createRule(
    projectId: string,
    rule: RedemptionRuleInput
  ): Promise<Result<RedemptionRule, Error>> {
    try {
      // 1. Validate input
      const validated = this.validateRuleInput(rule);

      // 2. Database operation
      const { data, error } = await this.supabase
        .from('redemption_rules')
        .insert(validated)
        .select()
        .single();

      if (error) throw error;

      // 3. Map to domain model
      return { ok: true, value: this.mapToDomain(data) };
    } catch (error) {
      // 4. Error handling
      this.logger?.error('Failed to create rule', error);
      return { ok: false, error };
    }
  }
}
```

### Error Handling Standards

```typescript
// ✅ GOOD: Comprehensive error handling with user feedback
try {
  const result = await service.createRule(projectId, rule);

  if (!result.ok) {
    toast.error(`Failed to create rule: ${result.error.message}`);
    return;
  }

  toast.success('Rule created successfully');
} catch (error) {
  console.error('Unexpected error:', error);
  toast.error('An unexpected error occurred');
}

// ❌ BAD: Silent failures
try {
  await service.createRule(projectId, rule);
} catch (error) {
  // Silent failure
}
```

### Security Standards

1. **Never commit secrets** - Use environment variables
2. **Validate all user input** - Use Zod schemas
3. **Sanitize data** - Before database operations
4. **Row Level Security** - Enabled on all Supabase tables
5. **Authentication checks** - On all protected routes
6. **Permission checks** - Granular permission system
7. **Audit logging** - Log all critical operations

### Performance Standards

1. **React Query** for data fetching (caching, deduplication)
2. **Lazy loading** for route components
3. **Code splitting** for large features
4. **Database indexing** on frequently queried columns
5. **Permission caching** with 15-second timeout
6. **Optimistic updates** for better UX

---

## 🔤 Type System Architecture

### Three-Layer Type System

The codebase uses a **three-layer type architecture**:

```
Layer 1: supabase.ts (Auto-generated)
    ↓
Layer 2: database.ts (Extended DB types)
    ↓
Layer 3: centralModels.ts (Business models)
    ↓
Application Code
```

#### Layer 1: `supabase.ts`

- **Source**: Auto-generated from Supabase database schema
- **Naming**: snake_case (matches database)
- **Location**: `frontend/src/types/supabase.ts`
- **Generation**: `pnpm types:supabase`
- **⚠️ NEVER EDIT MANUALLY**

```typescript
// Auto-generated
export interface Database {
  public: {
    Tables: {
      redemption_rules: {
        Row: {
          id: string;
          project_id: string;
          rule_type: string;
          // ...
        };
        Insert: {
          // ...
        };
        Update: {
          // ...
        };
      };
    };
  };
}
```

#### Layer 2: `database.ts`

- **Source**: Re-exports and extends `supabase.ts`
- **Naming**: snake_case (database consistency)
- **Location**: `frontend/src/types/database.ts`
- **Purpose**: Convenient type aliases

```typescript
import type { Database } from './supabase';

// Type aliases
export type RedemptionRulesTable = Database['public']['Tables']['redemption_rules']['Row'];
export type RedemptionRulesInsert = Database['public']['Tables']['redemption_rules']['Insert'];
export type RedemptionRulesUpdate = Database['public']['Tables']['redemption_rules']['Update'];
```

#### Layer 3: `centralModels.ts`

- **Source**: Handwritten business models
- **Naming**: camelCase (TypeScript convention)
- **Location**: `frontend/src/types/centralModels.ts`
- **Purpose**: Application domain models

```typescript
// Business domain model
export interface RedemptionRule {
  id: string;
  projectId: string;
  ruleType: 'standard' | 'interval' | 'blackout';
  minAmount: number;
  maxAmount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Type Mapper Pattern

Use **type mappers** to convert between layers:

```typescript
// utils/formatting/typeMappers.ts
export function mapRedemptionRuleFromDB(
  dbRule: RedemptionRulesTable
): RedemptionRule {
  return {
    id: dbRule.id,
    projectId: dbRule.project_id,
    ruleType: dbRule.rule_type,
    minAmount: Number(dbRule.min_amount),
    maxAmount: Number(dbRule.max_amount),
    startDate: new Date(dbRule.start_date),
    endDate: new Date(dbRule.end_date),
    isActive: dbRule.is_active,
    createdAt: new Date(dbRule.created_at),
    updatedAt: new Date(dbRule.updated_at),
  };
}

export function mapRedemptionRuleToDB(
  rule: Partial<RedemptionRule>
): RedemptionRulesInsert {
  return {
    project_id: rule.projectId,
    rule_type: rule.ruleType,
    min_amount: rule.minAmount?.toString(),
    max_amount: rule.maxAmount?.toString(),
    start_date: rule.startDate?.toISOString(),
    end_date: rule.endDate?.toISOString(),
    is_active: rule.isActive,
  };
}
```

### Type System Workflow

When the database schema changes:

```bash
# 1. Regenerate supabase.ts
pnpm types:supabase

# 2. Validate alignment
pnpm types:validate

# 3. Fix inconsistencies automatically
pnpm types:fix-inconsistencies

# 4. Update database.ts (if needed)
pnpm types:update-db

# 5. Suggest central models
pnpm types:suggest-models -- --table=new_table_name

# 6. Generate type mappers
pnpm types:generate-mapper -- --table=new_table_name --domain=NewDomainType
```

**Best Practices**:
1. ✅ Always use `centralModels` types in application code
2. ✅ Use type mappers for DB conversions
3. ✅ Keep database.ts aligned with supabase.ts
4. ❌ Never use supabase.ts types directly in components
5. ❌ Never edit supabase.ts manually

---

## 🔑 Key Patterns & Principles

### 1. Three-Layer Infrastructure Architecture

The frontend uses a **3-layer architecture** for token operations:

```
Layer 1: Gateway Layer
    ↓ (orchestrates)
Layer 2: Policy Engine (off-chain validation)
    ↓ (validates)
Layer 3: Foundry Integration (on-chain execution)
```

#### Gateway Layer (`/infrastructure/gateway/`)

Central orchestrator for all crypto operations:

```typescript
// Usage
import { CryptoOperationGateway } from '@/infrastructure/gateway';

const gateway = new CryptoOperationGateway();

const result = await gateway.executeOperation({
  type: 'mint',
  chain: 'ethereum',
  tokenAddress: '0x123...',
  parameters: {
    to: '0x456...',
    amount: '1000'
  }
});
```

**Responsibilities**:
- Pre-validation (format, balance checks)
- Policy evaluation orchestration
- Gas estimation
- Execution routing
- Database logging
- Error handling

#### Policy Engine (`/infrastructure/policy/`)

Off-chain policy validation using database rules:

```typescript
// Automatic via Gateway, or manual:
const policyResult = await policyEngine.evaluateOperation(operation, context);

if (!policyResult.allowed) {
  console.log('Rejected:', policyResult.violations);
}
```

**Features**:
- Database-stored policies
- Complex business rules
- Time-based restrictions
- Amount limits
- Compliance validation
- Caching for performance

#### Foundry Integration (`/infrastructure/foundry/`)

On-chain smart contract validation:

```typescript
// On-chain validation via smart contract modifiers
// PolicyEngine.sol enforces immutable policies
```

**Benefits**:
- Cannot be bypassed
- Transparent and auditable
- Trustless enforcement
- Blockchain-backed validation

### 2. Service Layer Pattern

**All business logic belongs in services**, not components:

```typescript
// ✅ GOOD: Component uses service
function RedemptionConfigPage() {
  const { createRule } = useRedemptionService();

  const handleSubmit = async (data) => {
    await createRule(projectId, data);
  };
}

// ❌ BAD: Component contains business logic
function RedemptionConfigPage() {
  const handleSubmit = async (data) => {
    // Direct database calls in component
    await supabase.from('redemption_rules').insert(data);
  };
}
```

### 3. Permission-Based Access Control

All routes and components use **granular permissions**:

```typescript
// Route protection
<ProtectedRoute
  path="/redemption/configure"
  requiredPermission="redemption:configure"
>
  <RedemptionConfigPage />
</ProtectedRoute>

// Component protection
function AdminPanel() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('admin:view')) {
    return <AccessDenied />;
  }

  return <AdminContent />;
}
```

**Permission System**:
- 293 granular permissions
- Role-based hierarchy
- 15-second cache timeout
- Database-backed (`user_permissions_view`)

### 4. Real-Time Updates

Use Supabase Realtime for live data:

```typescript
// Service layer subscription
useEffect(() => {
  const subscription = supabase
    .channel('redemption_rules')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'redemption_rules'
    }, (payload) => {
      // Update local state
      handleRealtimeUpdate(payload);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 5. Audit Trail Pattern

**All critical operations must be audited**:

```typescript
// Automatic via middleware (backend)
// Manual logging (frontend)
await auditLogger.log({
  userId: currentUser.id,
  action: 'redemption.rule.create',
  resourceType: 'redemption_rule',
  resourceId: newRule.id,
  metadata: {
    projectId,
    ruleType: newRule.ruleType
  }
});
```

### 6. Result Type Pattern

Use Result types for explicit error handling:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Service returns Result
async createRule(data): Promise<Result<Rule, Error>> {
  try {
    const rule = await this.db.create(data);
    return { ok: true, value: rule };
  } catch (error) {
    return { ok: false, error };
  }
}

// Consumer handles explicitly
const result = await service.createRule(data);
if (!result.ok) {
  console.error(result.error);
  return;
}
const rule = result.value;
```

### 7. Environment-Based Configuration

```typescript
// config/environment.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  },
  blockchain: {
    defaultChain: import.meta.env.VITE_DEFAULT_CHAIN || 'ethereum',
  },
};
```

**Environment Variables**:
- Frontend: `VITE_*` prefix
- Backend: No prefix
- Never commit `.env` files
- Keep `.env.example` updated

---

## 🗄 Database Schema

### Key Tables by Domain

#### Redemption (10 tables)
- `redemption_rules` - Rule configuration
- `redemption_requests` - User redemption requests
- `redemption_windows` - Time windows for redemptions
- `redemption_approvals` - Approval workflows
- `redemption_transactions` - Completed redemptions

#### Compliance (Multiple tables)
- `organizations` - Issuer/investor entities
- `investors` - Investor profiles
- `investor_documents` - KYC documents
- `investor_kyc_status` - KYC verification status
- `compliance_audit_logs` - Audit trail

#### Wallets (Multiple tables)
- `wallets` - Wallet registry
- `hd_wallets` - HD wallet derivation
- `multi_sig_wallets` - Multi-signature wallets
- `smart_contract_wallets` - Contract wallets
- `wallet_hsm_configs` - HSM integration

#### Tokens (Multiple tables)
- `tokens` - Token registry
- `token_balances` - Balance tracking
- `token_operations` - Operation history
- `token_locks` - Locked tokens

#### Audit (Multiple tables)
- `audit_events` - 4,800+ audit events
- `transaction_validations` - Validation logs
- `policy_violations` - Policy breach logs

#### Permissions (Multiple tables)
- `user_permissions_view` - 293 permission rows
- `roles` - Role definitions
- `role_permissions` - Role-permission mappings

### Database Naming Conventions

- **Tables**: Plural snake_case (`redemption_rules`)
- **Columns**: Snake_case (`project_id`, `created_at`)
- **Foreign Keys**: `{table}_id` (e.g., `project_id`)
- **Timestamps**: `created_at`, `updated_at` (always include)
- **Soft Delete**: `deleted_at` (nullable)
- **Active Flag**: `is_active` (boolean)

### Common Patterns

#### Timestamps
```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
deleted_at TIMESTAMPTZ NULL
```

#### Soft Delete
```sql
WHERE deleted_at IS NULL
```

#### Row Level Security (RLS)
All tables have RLS policies enabled. Check `supabase/migrations/` for policy definitions.

---

## 🧪 Testing Strategy

### Frontend Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test -- --watch
```

**Test Structure**:
```typescript
// Component.test.tsx
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<ComponentName />);
    await user.click(screen.getByRole('button'));
    // Assertions
  });
});
```

### Backend Testing

```bash
# Run tests
pnpm test

# Run specific test suite
pnpm test:investors
pnpm test:wallets
pnpm test:hsm
```

**Test Structure**:
```typescript
// service.test.ts
import { describe, it, expect } from 'vitest';
import { ServiceName } from './ServiceName';

describe('ServiceName', () => {
  it('should perform operation correctly', async () => {
    const service = new ServiceName();
    const result = await service.operation(params);
    expect(result).toBeDefined();
  });
});
```

### Integration Testing

```bash
# Run integration tests
pnpm test:integration
```

---

## 📝 Common Tasks & Recipes

### Task 1: Add a New Database Table

1. **Update Prisma schema**:
```prisma
// backend/prisma/schema.prisma
model NewTable {
  id         String   @id @default(uuid())
  name       String
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("new_table")
}
```

2. **Create migration**:
```bash
cd backend
pnpm db:migrate
```

3. **Regenerate types**:
```bash
cd frontend
pnpm types:supabase
pnpm types:validate
pnpm types:fix-inconsistencies
```

4. **Create service**:
```typescript
// frontend/src/services/newFeature/NewFeatureService.ts
export class NewFeatureService {
  // Service implementation
}
```

### Task 2: Add a New API Endpoint

1. **Create route file**:
```typescript
// backend/src/routes/newFeature.ts
import type { FastifyInstance } from 'fastify';

export default async function newFeatureRoutes(fastify: FastifyInstance) {
  fastify.get('/api/new-feature', async (request, reply) => {
    // Implementation
    return { data: [] };
  });
}
```

2. **Register route**:
```typescript
// backend/src/server.ts
import newFeatureRoutes from './routes/newFeature';
await fastify.register(newFeatureRoutes);
```

3. **Create frontend API client**:
```typescript
// frontend/src/services/newFeature/api.ts
export async function fetchNewFeature() {
  const response = await fetch('/api/new-feature');
  return response.json();
}
```

### Task 3: Add a New UI Component

1. **Create component file**:
```typescript
// frontend/src/components/newFeature/NewFeature.tsx
import { Button } from '@/components/ui/button';

export function NewFeature() {
  return (
    <div>
      <Button>Click Me</Button>
    </div>
  );
}
```

2. **Add route (if needed)**:
```typescript
// frontend/src/routes/RouteComponents.tsx
{
  path: '/new-feature',
  element: <NewFeaturePage />
}
```

3. **Add permission check**:
```typescript
<ProtectedRoute
  path="/new-feature"
  requiredPermission="newFeature:view"
>
  <NewFeaturePage />
</ProtectedRoute>
```

### Task 4: Add a New Service

1. **Create service file**:
```typescript
// frontend/src/services/newFeature/NewFeatureService.ts
import { supabase } from '@/infrastructure/database/supabaseClient';
import type { NewFeature } from '@/types/centralModels';

export class NewFeatureService {
  async getAll(): Promise<NewFeature[]> {
    const { data, error } = await supabase
      .from('new_features')
      .select('*');

    if (error) throw error;
    return data.map(mapFromDB);
  }
}
```

2. **Create React hook**:
```typescript
// frontend/src/hooks/newFeature/useNewFeature.ts
import { useQuery } from '@tanstack/react-query';
import { NewFeatureService } from '@/services/newFeature';

const service = new NewFeatureService();

export function useNewFeature() {
  return useQuery({
    queryKey: ['newFeatures'],
    queryFn: () => service.getAll(),
  });
}
```

3. **Use in component**:
```typescript
function NewFeatureList() {
  const { data, isLoading } = useNewFeature();

  if (isLoading) return <Loading />;

  return <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
```

### Task 5: Add Smart Contract Integration

1. **Create contract**:
```solidity
// frontend/foundry-contracts/src/NewToken.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NewToken is ERC20 {
  constructor() ERC20("NewToken", "NEW") {}
}
```

2. **Create deployment script**:
```solidity
// frontend/foundry-contracts/script/DeployNewToken.s.sol
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NewToken.sol";

contract DeployNewToken is Script {
  function run() external {
    vm.startBroadcast();
    new NewToken();
    vm.stopBroadcast();
  }
}
```

3. **Deploy**:
```bash
cd frontend/foundry-contracts
forge script script/DeployNewToken.s.sol --rpc-url sepolia --broadcast
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: Type errors after database changes

**Solution**:
```bash
cd frontend
pnpm types:supabase
pnpm types:validate
pnpm types:fix-inconsistencies
```

#### Issue: Supabase connection errors

**Solution**:
1. Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify Supabase project is running
3. Check network connectivity
4. Review Supabase dashboard for service status

#### Issue: Permission denied errors

**Solution**:
1. Check user has correct permissions in `user_permissions_view`
2. Verify permission check is using correct permission name
3. Check RLS policies on Supabase tables
4. Clear permission cache (15-second timeout)

#### Issue: Build fails with TypeScript errors

**Solution**:
```bash
# Clean build artifacts
pnpm clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Type check
pnpm type-check

# Fix specific errors shown in output
```

#### Issue: Port already in use

**Solution**:
```bash
# Backend (port 3001)
cd backend
pnpm kill:port

# Frontend (port 5173)
lsof -ti:5173 | xargs kill
```

#### Issue: Database migration fails

**Solution**:
```bash
cd backend

# Check migration status
pnpm db:migrate

# Reset database (WARNING: destroys data)
pnpm db:reset

# Deploy specific migration
pnpm db:deploy
```

#### Issue: Smart contract deployment fails

**Solution**:
1. Check wallet has sufficient testnet ETH
2. Verify RPC URL is correct
3. Check gas price isn't too high
4. Review contract for compilation errors:
```bash
cd frontend/foundry-contracts
forge build
```

### Debug Tools

#### Backend Debugging
```bash
# Check server health
curl http://localhost:3001/health | jq

# View logs
pnpm logs:backend

# Database GUI
pnpm db:studio
```

#### Frontend Debugging
```bash
# Check build output
pnpm build

# Preview production build
pnpm preview

# Analyze bundle size
pnpm build:analyze
```

### Getting Help

1. **Check existing documentation**:
   - `README.md` - Project overview
   - `QUICK-START.md` - Getting started guide
   - `frontend/src/infrastructure/INTEGRATION-ARCHITECTURE.md` - Architecture
   - `frontend/src/types/TYPE_SYSTEM.md` - Type system

2. **Review similar code**:
   - Search for existing implementations
   - Check service patterns in `/services/`
   - Review component patterns in `/components/`

3. **Check git history**:
   ```bash
   git log --oneline -- path/to/file
   git show <commit-hash>
   ```

---

## 🎯 Key Principles for AI Assistants

### 1. Always Prefer Existing Patterns

Before implementing a new feature:
1. ✅ Search for similar implementations in the codebase
2. ✅ Follow the same patterns and conventions
3. ✅ Reuse existing services and utilities
4. ❌ Don't invent new patterns unless absolutely necessary

### 2. Maintain Type Safety

1. ✅ Use explicit types for all function parameters and returns
2. ✅ Use `centralModels` types in application code
3. ✅ Create type mappers for database conversions
4. ❌ Never use `any` type
5. ❌ Never bypass TypeScript checks

### 3. Follow the Service Layer Pattern

1. ✅ All business logic in services
2. ✅ Components only handle UI concerns
3. ✅ Use React Query for data fetching
4. ❌ No database calls in components
5. ❌ No business logic in components

### 4. Security First

1. ✅ Validate all user input
2. ✅ Check permissions before operations
3. ✅ Log all critical actions
4. ✅ Never commit secrets
5. ❌ No SQL injection vulnerabilities
6. ❌ No XSS vulnerabilities

### 5. Real Data Only

1. ✅ Use live database connections
2. ✅ Implement real API calls
3. ✅ Test with actual data
4. ❌ No mock data in production code
5. ❌ No hardcoded values

### 6. Error-Free Delivery

Before marking a task complete:
1. ✅ Run `pnpm type-check` and fix all errors
2. ✅ Test the implementation manually
3. ✅ Verify no console errors
4. ✅ Check all imports are valid
5. ✅ Ensure code compiles successfully

### 7. Documentation

1. ✅ Add JSDoc comments for public functions
2. ✅ Update relevant README files
3. ✅ Document complex logic
4. ✅ Keep this CLAUDE.md updated
5. ❌ Don't create unnecessary documentation files

---

## 📚 Additional Resources

### Key Documentation Files

- `/README.md` - Project overview and current status
- `/QUICK-START.md` - Quick start deployment guide
- `/frontend/src/infrastructure/INTEGRATION-ARCHITECTURE.md` - 3-layer architecture
- `/frontend/src/types/TYPE_SYSTEM.md` - Type system workflow
- `/frontend/src/services/README.md` - Service layer documentation

### Tech Stack Documentation

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/docs)
- [Fastify](https://fastify.dev/)
- [Prisma](https://www.prisma.io/docs)
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Ethers.js](https://docs.ethers.org/)
- [Wagmi](https://wagmi.sh/)
- [React Query](https://tanstack.com/query/)

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-20 | Initial comprehensive guide |

---

**End of AI Assistant Development Guide**

This guide is a living document. As the codebase evolves, keep this guide updated to reflect current practices and patterns.
