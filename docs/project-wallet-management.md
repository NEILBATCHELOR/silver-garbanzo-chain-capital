# Project Wallet Management

This document describes the project wallet management functionality implemented for Chain Capital.

## Overview

The project wallet management system allows users to:

1. Generate blockchain wallets for different networks (Ethereum, Bitcoin, Solana, etc.)
2. Store wallet credentials securely in the database
3. List all wallets associated with a project
4. Delete wallets from a project

## Database Structure

The system uses a `project_wallets` table with the following structure:

```sql
CREATE TABLE public.project_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT,
  mnemonic TEXT,
  key_vault_id TEXT,
  vault_storage_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The table includes Row Level Security policies to ensure users can only access wallets for projects they have permission to view.

## Components

### 1. ProjectWalletGenerator

Located at: `/frontend/src/components/projects/ProjectWalletGenerator.tsx`

This component provides a UI for:
- Selecting a network (or multiple networks)
- Generating wallet credentials
- Displaying generated wallet details
- Copying wallet credentials to clipboard
- Hiding/showing sensitive information (private keys, mnemonics)

### 2. ProjectWalletList

Located at: `/frontend/src/components/projects/ProjectWalletList.tsx`

This component provides a UI for:
- Listing all wallets associated with a project
- Viewing wallet details
- Copying wallet credentials to clipboard
- Deleting wallets with confirmation

### 3. Project Wallet Service

Located at: `/frontend/src/services/project/project-wallet-service.ts`

This service provides:
- Database operations for project wallets (CRUD)
- Wallet generation functionality using existing wallet generators
- Multi-network wallet generation support

## Integration

The wallet management components are integrated into the ProjectDetails page in the "Wallet" tab, allowing users to:
1. Generate new wallets
2. View existing wallets
3. Delete wallets

## Security Considerations

While this implementation stores private keys and mnemonics in the database, it includes UI elements to:
- Hide sensitive information by default
- Show warning messages about security
- Provide visual cues for sensitive data

In a production environment, additional security measures would be recommended:
- Encrypting private keys before storage
- Using a dedicated key management service
- Implementing additional access controls

## Permissions

The system respects the existing permission system, checking for:
- `project.create` permission
- `project.edit` permission

Users without these permissions cannot generate or manage wallets.

## Future Enhancements

Potential future enhancements could include:
1. Integration with hardware wallet signing
2. Enhanced security measures for private key storage
3. Transaction signing capabilities
4. Wallet activity monitoring
5. Multi-signature wallet support

## SQL Migration

The SQL migration script is available at:
`/frontend/src/types/core/project_wallets_migration.sql`
