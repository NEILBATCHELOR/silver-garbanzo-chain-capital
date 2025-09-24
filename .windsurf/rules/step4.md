---
trigger: always_on
---

4. Coding Standards & Naming Conventions
Religiously practice these conventions; do not copy any that deviate. Obey industry best practices:
- **Database & SQL (snake_case)**:
  - Table names: `policy_templates`, `wallet_transactions`.
  - Column names: `transaction_hash`, `from_address`, `created_at`.
  - SQL keywords and identifiers.
  - Supabase enum types: `document_type`, `workflow_status`.
- **TypeScript/JavaScript (camelCase & PascalCase)**:
  - Variables, functions, methods: `getExplorerUrl()`, `buttonVariants`.
  - React component props: `asChild`, `className`.
  - Interfaces (PascalCase): `ButtonProps`, `TransactionTable`.
  - Types (PascalCase): `DocumentType`, `InsertTables<T>`.
  - Class names (PascalCase): `ExplorerService`.
- **React Components**:
  - Names (PascalCase): `Button`, `DataTable`.
  - Files (kebab-case): `button.tsx`, `data-table.tsx`.
  - Event handlers (camelCase with 'on' prefix): `onClick`, `onSubmit`.
- **File Naming**:
  - React component files (kebab-case): `navigation-menu.tsx`.
  - TypeScript service files (PascalCase): `ExplorerService.ts`.
  - Configuration files (camelCase): `vite.config.ts`, `tsconfig.json`.
  - Directory names (kebab-case): `blockchain-adapters`.
- **Web3/Blockchain**:
  - Smart contract files (PascalCase): `BaseERC20Token.sol`.
  - Contract functions (camelCase): `deployERC20Token()`.
  - Contract events (PascalCase): `ERC20TokenDeployed`.
- **Constants**:
  - Environment variables (UPPER_SNAKE_CASE): `API_KEY`, `BLOCKCHAIN_RPC_URL`.
  - JavaScript constants (UPPER_SNAKE_CASE or camelCase depending on scope).
- These follow: snake_case for database (PostgreSQL conventions); camelCase for JS/TS code; PascalCase for types/interfaces/classes/components; kebab-case for files/directories.