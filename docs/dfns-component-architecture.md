# DFNS Component Architecture Diagram

## Component Hierarchy

```
DfnsWalletDashboard (Main Entry Point)
├── DfnsManager (Layout Wrapper)
│   ├── DfnsNavigation (Left Sidebar)
│   │   ├── Dashboard
│   │   ├── Wallets
│   │   │   ├── All Wallets
│   │   │   ├── Create Wallet
│   │   │   ├── Asset Management
│   │   │   └── Transfer History
│   │   ├── Authentication
│   │   │   ├── Users
│   │   │   ├── Service Accounts
│   │   │   ├── Personal Access Tokens
│   │   │   └── Credentials
│   │   ├── Permissions
│   │   │   ├── Permission Management
│   │   │   ├── Role Templates
│   │   │   └── Access Assignments
│   │   ├── Transactions
│   │   │   ├── Transaction History
│   │   │   ├── Broadcast Transaction
│   │   │   └── Pending Transactions
│   │   ├── Policies
│   │   │   ├── Policy Dashboard
│   │   │   ├── Approval Queue
│   │   │   └── Risk Management
│   │   ├── Analytics
│   │   │   ├── Activity Analytics
│   │   │   ├── Security Metrics
│   │   │   └── Usage Statistics
│   │   └── Settings
│   │       ├── DFNS Settings
│   │       ├── Webhook Configuration
│   │       └── Network Preferences
│   └── DfnsDashboard (Main Content Area)
│       ├── Overview Tab
│       │   ├── Portfolio Summary Cards
│       │   ├── Portfolio Distribution Chart
│       │   ├── Recent Activity Timeline
│       │   └── Quick Actions
│       ├── Wallets Tab
│       │   ├── Multi-Network Wallet Summary
│       │   ├── Asset Distribution Chart
│       │   ├── Wallet Performance Metrics
│       │   └── Portfolio Balance Trends
│       ├── Security Tab
│       │   ├── Authentication Status
│       │   ├── Active Credentials Count
│       │   ├── Permission Assignments
│       │   └── Security Events
│       └── Operations Tab
│           ├── Transaction Volume Metrics
│           ├── Network Activity Distribution
│           ├── Fee Spending Analysis
│           └── Policy Compliance Metrics
```

## Route Mapping

```
/wallet/dfns                 → DfnsWalletDashboard (Overview)
/wallet/dfns/dashboard       → DfnsWalletDashboard (Overview)
/wallet/dfns/wallets         → DfnsWalletDashboard (Wallets Tab)
/wallet/dfns/wallets/create  → DfnsWalletDashboard + WalletCreationWizard
/wallet/dfns/auth            → DfnsWalletDashboard (Authentication Tab)
/wallet/dfns/permissions     → DfnsWalletDashboard (Permissions Tab)
/wallet/dfns/transactions    → DfnsWalletDashboard (Transactions Tab)
/wallet/dfns/policies        → DfnsWalletDashboard (Policies Tab)
/wallet/dfns/analytics       → DfnsWalletDashboard (Analytics Tab)
/wallet/dfns/settings        → DfnsWalletDashboard (Settings Tab)
```

## Service Integration

```
DfnsService (Main Orchestrator)
├── AuthService → Authentication Components
├── WalletService → Wallet Management Components
├── UserService → User Management Components
├── PermissionService → Permission Components
├── TransactionService → Transaction Components
├── PolicyService → Policy Components
├── UserActionService → All Sensitive Operations
└── ActivityService → Analytics & Monitoring
```

## Data Flow

```
1. Component Mount
   ↓
2. Service Call (via DFNS API)
   ↓
3. Local Database Sync (37+ DFNS tables)
   ↓
4. State Update (React State/Context)
   ↓
5. UI Render (with loading/error states)
   ↓
6. User Interaction
   ↓
7. User Action Signing (if required)
   ↓
8. API Call → Database Update → UI Update
```

## Pattern Alignment with ClimateReceivables

| Climate Receivables | DFNS Equivalent | Purpose |
|---------------------|----------------|---------|
| ClimateReceivablesNavigation | DfnsNavigation | Left sidebar navigation |
| ClimateReceivablesDashboard | DfnsDashboard | Main tabbed dashboard |
| ClimateReceivablesManager | DfnsManager | Layout wrapper |
| Energy Assets | Wallets | Core entity management |
| Receivables | Transactions | Financial operations |
| Incentives | Permissions | Access control |
| Carbon Offsets | Authentication | Identity management |
| Tokenization | Policies | Governance |
| Analysis | Analytics | Insights & reporting |
| Settings | Settings | Configuration |

This architecture ensures consistency with existing patterns while providing comprehensive DFNS functionality.
