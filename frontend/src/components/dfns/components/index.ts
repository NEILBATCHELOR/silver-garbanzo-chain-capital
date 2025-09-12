// DFNS Components - Main Export Index
// Following the climateReceivables pattern for organized exports

// Core components
export { DfnsNavigation } from './core/dfns-navigation';
export { DfnsDashboard } from './core/dfns-dashboard';
export { DfnsManager } from './core/dfns-manager';

// Authentication components
export { 
  AuthStatusCard, 
  DfnsAuthProvider, 
  DfnsAuthGuard, 
  useDfnsAuth,
  UserManagementTable,
  ServiceAccountList,
  PersonalTokenList,
  CredentialManager
} from './authentication';

// Wallet components
export { 
  WalletList,
  WalletDetailsView
} from './wallets';

// Dialog components
export { 
  WalletCreationWizard,
  AssetTransferDialog
} from './dialogs';

// Page components
export { DfnsWalletsPage } from './pages/dfns-wallets-page';
export { DfnsAuthPage } from './pages/dfns-auth-page';
export { DfnsPermissionsPage } from './pages/dfns-permissions-page';
export { DfnsTransactionsPage } from './pages/dfns-transactions-page';
export { DfnsPoliciesPage } from './pages/dfns-policies-page';
export { DfnsAnalyticsPage } from './pages/dfns-analytics-page';
export { DfnsSettingsPage } from './pages/dfns-settings-page';
