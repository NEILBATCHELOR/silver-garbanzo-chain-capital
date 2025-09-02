# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Quick Start (TL;DR)

```bash
# Clone and install
pnpm install

# Environment setup
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start development servers
pnpm dev                 # Both frontend & backend
# OR individually:
pnpm dev:frontend       # React + Vite on :5173
pnpm dev:backend        # Fastify + Prisma on :3001

# Common operations
pnpm type-check         # TypeScript validation
pnpm lint              # ESLint + Prettier
pnpm test              # Run all tests
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Apply database migrations
```

## Repository Structure

### Monorepo Layout

```
chain-capital-platform/
├── frontend/           # React + TypeScript + Vite + Supabase
├── backend/            # Fastify + Prisma + PostgreSQL  
├── docs/              # Progress READMEs and specifications
├── fix/               # Issue resolution documentation
├── scripts/           # Automation and utility scripts
├── test-data/         # Test datasets and fixtures
├── wallet/            # HSM and wallet configuration
├── package.json       # Root workspace configuration
├── pnpm-workspace.yaml # pnpm workspaces definition
├── Makefile           # Unified development commands
└── docker-compose.yml # Development environment
```

**Package Manager:** pnpm (v9.0.0+)  
**Workspaces:** frontend, backend  
**Node Version:** 18.0.0+

## Essential Commands

### Root Level Commands

```bash
# Dependencies
pnpm install           # Install all workspace dependencies
pnpm clean            # Clean node_modules and build artifacts

# Development  
pnpm dev              # Start both frontend & backend concurrently
pnpm build            # Build both workspaces
pnpm test             # Run tests in all workspaces
pnpm type-check       # TypeScript validation across workspaces
pnpm lint             # Lint all workspaces
pnpm format           # Format code in all workspaces

# Database operations
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Prisma Studio

# Docker operations
pnpm docker:up        # Start all services with Docker
pnpm docker:down      # Stop Docker services
pnpm docker:build     # Build Docker images

# Health checks
pnpm health           # Backend health check via curl
```

### Frontend Commands

```bash
cd frontend/
pnpm dev              # Vite dev server on port 5173
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm type-check       # TypeScript compilation check
pnpm lint             # ESLint validation
pnpm format           # Prettier formatting
pnpm test             # Vitest test runner
pnpm types:supabase   # Generate Supabase types
```

**Environment Variables:** All Vite variables must use `VITE_` prefix
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`  
- `VITE_BACKEND_URL`

### Backend Commands

```bash
cd backend/
pnpm dev              # Development server with tsx --watch
pnpm dev:enhanced     # Enhanced simple server
npm run start:accurate # Current run all services in the backend server
npm run start:enhanced # Previous run all services in the backend server 
pnpm build            # TypeScript compilation
pnpm start            # Production server
pnpm type-check       # TypeScript validation
pnpm lint             # ESLint validation
pnpm format           # Prettier formatting
pnpm test             # Vitest test runner
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Apply database migrations
pnpm db:studio        # Open Prisma Studio
```

**Environment Variables:** Use UPPER_SNAKE_CASE
- `DATABASE_URL` - Supabase connection string
- `JWT_SECRET` - Authentication secret
- `PORT` - Server port (default: 3001)
- `ALLOWED_ORIGINS` - CORS origins

### Database Commands

```bash
# Prisma operations
pnpm db:generate      # Generate Prisma client from schema
pnpm db:migrate       # Apply migrations in development
pnpm db:deploy        # Apply migrations in production
pnpm db:studio        # Visual database browser
pnpm db:seed          # Run database seed scripts

# MCP database queries (read-only)
# Use Warp's MCP postgres integration for live database queries
```

**Database Schema:** 302 tables in remote Supabase PostgreSQL database
**Read-only Types:** `frontend/src/types/core/supabase.ts`, `database.ts`, `centralModels.ts`
**Schema Definition:** `frontend/src/types/core/full_schema.sql`

## Architecture Overview

### Domain-Based Organization Philosophy

This codebase follows a **domain-first organization** pattern across all workspaces. Related functionality is grouped by business domain rather than technical layer.

### Backend Architecture (Fastify + Prisma)

```
backend/src/
├── services/              # Domain-based business logic
│   ├── auth/             # Authentication & authorization
│   ├── compliance/       # KYC/AML, document management  
│   ├── projects/         # Investment projects
│   ├── tokens/           # Multi-ERC token standards
│   ├── wallets/          # Multi-chain wallet operations
│   ├── investors/        # Investor onboarding
│   ├── audit/            # Audit logging & compliance
│   ├── organizations/    # Multi-tenant organization management
│   └── [domain]/         # Each has index.ts for exports
├── routes/               # Fastify route handlers by domain
├── middleware/           # Auth, audit, error handling
├── infrastructure/       # Database, external services
├── types/                # TypeScript type definitions  
├── utils/                # Domain-specific utilities
└── plugins/              # Fastify plugins and configuration
```

**Key Patterns:**
- Each service domain has dedicated folder with `index.ts` exports
- No centralized `database.ts` or `centralModels.ts` - keep domain-specific
- Fastify plugin registration per domain
- OpenAPI/Swagger documentation integration
- JSON Schema validation with TypeBox

### Frontend Architecture (React + Vite + Supabase)

```
frontend/src/
├── components/           # React components by domain
│   ├── auth/            # Authentication components
│   ├── compliance/      # Compliance forms & displays
│   ├── wallet/          # Wallet connection & management
│   ├── tokens/          # Token creation & management
│   └── ui/              # Shared UI components (shadcn/ui)
├── pages/               # Route-based page components
├── hooks/               # Domain-specific React hooks
│   ├── auth/            # useAuth, usePermissions
│   ├── compliance/      # useKYC, useDocuments
│   ├── wallet/          # useWallet, useTransactions
│   └── shared/          # Cross-domain hooks
├── services/            # API clients and business logic
├── infrastructure/      # Web3, Supabase, external services
├── utils/               # Domain-based utilities
│   ├── auth/            # Role utilities, permissions
│   ├── compliance/      # Country lists, validation
│   ├── wallet/          # Crypto utilities
│   └── shared/          # Cross-domain utilities
└── types/               # TypeScript definitions
```

**Key Patterns:**
- Components use PascalCase names with kebab-case filenames
- Every folder includes `index.ts` for clean exports
- Domain organization mirrors backend service structure
- No Material UI - only Radix + shadcn/ui components

### Multi-Chain & Tokenization Architecture

**Supported Standards:** ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626  
**Supported Chains:** 8-chain support including Ethereum, Polygon, BSC, Avalanche
**Wallet Integration:** MetaMask, WalletConnect, Safe, Hardware wallets
**HSM Support:** AWS CloudHSM, Azure Key Vault, Google Cloud KMS

```
infrastructure/wallet/
├── blockchain-adapters/  # Per-chain abstractions
│   ├── ethereum/        # Ethereum mainnet & testnets
│   ├── polygon/         # Polygon network
│   └── [network]/       # Network-specific providers
├── token-standards/     # ERC implementation wrappers
└── providers/           # Web3 provider management
```

## Development Workflows

### Adding a New Backend Domain

```bash
# 1. Create service structure
mkdir -p backend/src/services/[domain]
cd backend/src/services/[domain]

# 2. Create core files
touch index.ts                    # Service exports
touch [Domain]Service.ts          # Main business logic
touch [Domain]ValidationService.ts # Validation rules  
touch [Domain]AnalyticsService.ts # Analytics & reporting
touch types.ts                   # Domain types
touch README.md                  # Documentation

# 3. Create API routes
touch backend/src/routes/[domain].ts

# 4. Add Swagger documentation and tests
mkdir -p backend/src/services/[domain]/__tests__
```

### Adding a New Frontend Domain

```bash
# 1. Create domain structure  
mkdir -p frontend/src/components/[domain]
mkdir -p frontend/src/hooks/[domain]
mkdir -p frontend/src/services/[domain]
mkdir -p frontend/src/utils/[domain]

# 2. Create index files
touch frontend/src/components/[domain]/index.ts
touch frontend/src/hooks/[domain]/index.ts
touch frontend/src/services/[domain]/index.ts
touch frontend/src/utils/[domain]/index.ts

# 3. Add route registration in App.tsx
```

### Database Operations

**Schema Management:** Remote Supabase database with 302 tables
**Type Generation:** Read-only TypeScript types generated from live schema

```bash
# Generate types from live database
cd frontend/
pnpm types:supabase

# Apply schema changes (create SQL migration files)
# Submit SQL changes to be manually applied to Supabase
# Then regenerate types to sync changes
```

**MCP Database Queries:** Use Warp's MCP postgres integration for read-only database queries during development.

### Multi-Chain Integration

```bash
# 1. Add new network adapter
mkdir -p frontend/src/infrastructure/wallet/blockchain-adapters/[network]

# 2. Environment variables
# Add BLOCKCHAIN_RPC_URL, CHAIN_ID, etc.

# 3. Provider configuration
# Update wallet provider configuration

# 4. Test on testnets first
```

## Naming Conventions & Coding Standards

### Strict Naming Rules

**Database & SQL:** `snake_case`
- Tables: `user_roles`, `wallet_transactions`  
- Columns: `created_at`, `from_address`
- Enums: `document_type`, `workflow_status`

**TypeScript:** `camelCase` for variables/functions, `PascalCase` for types/classes
- Variables: `buttonVariants`, `getExplorerUrl()`
- Types: `ButtonProps`, `TransactionTable`
- Classes: `ExplorerService`

**React Components:** `PascalCase` names, `kebab-case` filenames
- Components: `Button`, `DataTable`  
- Files: `button.tsx`, `data-table.tsx`
- Event handlers: `onClick`, `onSubmit`

**Files & Directories:** `kebab-case`
- Component files: `navigation-menu.tsx`
- Service files: `ExplorerService.ts` (PascalCase for classes)
- Directories: `blockchain-adapters/`

**Environment Variables:** `UPPER_SNAKE_CASE`
- `API_KEY`, `BLOCKCHAIN_RPC_URL`, `VITE_SUPABASE_URL`

### Import Path Rules

- ✅ **DO:** Use absolute paths with `@/` alias
- ✅ **DO:** Use domain-specific paths: `@/services/auth/AuthService`
- ❌ **DON'T:** Use `.js` extensions in imports
- ❌ **DON'T:** Use `@lib` (this project doesn't use it)
- ❌ **DON'T:** Create centralized `database.ts` or `centralModels.ts`

**Examples:**
```typescript
// ✅ Correct imports
import { AuthService } from '@/services/auth/AuthService'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/utils/shared/formatting/formatters'

// ❌ Avoid these
import { AuthService } from './AuthService.js'  // No .js extension
import * as DB from '@/lib/database'            // No @lib, no central DB
```

### File Organization Rules

1. **Always add `index.ts` to every folder** for organized exports
2. **Keep files under 400 lines** - refactor into separate files if larger
3. **Domain-specific organization** - group related functionality
4. **No duplicate folders** - use consistent naming

## Testing Strategy

### Frontend Testing
```bash
cd frontend/
pnpm test              # Vitest test runner
```

**Test Locations:**
- Unit tests: `__tests__/` alongside components
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

### Backend Testing
```bash
cd backend/
pnpm test              # Vitest test runner  
pnpm test:coverage     # Coverage reports
```

**Test Locations:**
- Service tests: `backend/src/services/[domain]/__tests__/`
- Integration tests: `backend/add-tests/`
- API tests: `backend/tests/`

## Security & Compliance

### Environment Secrets
- **Never log secrets** in application code
- Use environment variables for all sensitive data
- Store secrets as `UPPER_SNAKE_CASE` variables
- Validate required environment variables on startup

### Permissions & Roles
- Permission system based on `permissions_rows.csv` data
- Role-based access control (RBAC) implementation
- Route-level and component-level permission checking
- Audit logging for all sensitive operations

### Multi-Chain Security
- HSM integration for secure key management
- Hardware wallet support for institutional users
- Multi-signature wallet implementations
- Compliance with financial regulations

## Deployment & Docker

### Development Environment

```bash
# Start full development stack
docker-compose up

# Service URLs:
# Frontend: http://localhost:5173
# Backend:  http://localhost:3002  
# Database: localhost:5432 (PostgreSQL)
# Redis:    localhost:6379
```

### Environment Profiles

```bash
# Core services only
docker-compose up

# Development tools (Prisma Studio)
docker-compose --profile tools up

# File storage (MinIO S3)
docker-compose --profile storage up

# Production-like setup (with NGINX)
docker-compose --profile production up
```

### Health Checks

- **Frontend:** `GET http://localhost:5173`
- **Backend:** `GET http://localhost:3002/health`
- **Database:** `pg_isready` health check
- **Docker:** Built-in health check monitoring

## Troubleshooting

### Common TypeScript Issues

1. **Import path not found:** Verify `@/` alias in `tsconfig.json`
2. **Module not found:** Run `pnpm type-check` to identify missing exports
3. **Prisma client issues:** Run `pnpm db:generate` to regenerate client

### Database Issues

1. **Schema out of sync:** Regenerate types with `pnpm types:supabase`
2. **Migration issues:** Check database connection and permissions
3. **Type mismatches:** Verify database schema matches TypeScript types

### Development Server Issues

1. **Port already in use:** Kill processes or change ports in config
2. **Environment variables:** Verify `.env` files are properly configured
3. **CORS errors:** Check `ALLOWED_ORIGINS` in backend configuration

## Documentation Links

- **Progress Documentation:** `/docs/` - Functional READMEs and specifications
- **Issue Resolution:** `/fix/` - Specific fix documentation and solutions
- **API Documentation:** Backend Swagger UI at `http://localhost:3002/docs` (when enabled)
- **Database Schema:** `frontend/src/types/core/full_schema.sql`
- **Type Definitions:** `frontend/src/types/core/` directory

## Key Project Rules

1. **Domain-First Organization:** Group by business domain, not technical layer
2. **No Central Database Files:** Keep database access domain-specific  
3. **Always Add Index Files:** Every folder needs `index.ts` for exports
4. **Use Live Data:** No mock/sample data - connect to real backend/database
5. **Radix + shadcn/ui Only:** No Material UI (@mui) components
6. **Strict Naming Conventions:** Follow snake_case (DB), camelCase (TS), PascalCase (Components), kebab-case (files)
7. **TypeScript First:** 100% TypeScript coverage with strict type checking
8. **Quality Standards:** Files under 400 lines, comprehensive error handling, organized documentation

This codebase represents a production-ready institutional tokenization platform with enterprise-grade security, compliance, and multi-chain capabilities.
