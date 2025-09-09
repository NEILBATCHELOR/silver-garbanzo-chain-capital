import { Routes, Route, Navigate } from 'react-router-dom';
import { DfnsNavigation } from './dfns-navigation';
import { DfnsDashboard } from './dfns-dashboard';
// Wallet components to be implemented later
// import { 
//   WalletList, 
//   WalletCreateDialog, 
//   WalletDetails, 
//   WalletTransferDialog 
// } from '../wallets';

/**
 * Main manager component for the DFNS module
 * Handles routing and layout for all DFNS functionality
 */
export function DfnsManager() {

  return (
    <div className="flex h-screen overflow-hidden">
      <DfnsNavigation />
      
      <main className="flex-1 overflow-y-auto">
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<DfnsDashboard />} />
          <Route path="/dashboard" element={<DfnsDashboard />} />
          
          {/* Wallets */}
          <Route path="/wallets" element={<WalletsListPage />} />
          <Route path="/wallets/create" element={<WalletsCreatePage />} />
          <Route path="/wallets/:id" element={<WalletsDetailPage />} />
          <Route path="/assets" element={<AssetsListPage />} />
          
          {/* Authentication */}
          <Route path="/auth" element={<AuthenticationDashboard />} />
          <Route path="/auth/users" element={<UsersList />} />
          <Route path="/auth/service-accounts" element={<ServiceAccountsList />} />
          <Route path="/auth/tokens" element={<PersonalTokensList />} />
          <Route path="/auth/credentials" element={<CredentialsList />} />
          
          {/* Permissions */}
          <Route path="/permissions" element={<PermissionsList />} />
          <Route path="/permissions/create" element={<PermissionsCreate />} />
          <Route path="/permissions/assignments" element={<PermissionAssignments />} />
          <Route path="/permissions/roles" element={<RoleTemplates />} />
          
          {/* Transactions */}
          <Route path="/transactions" element={<TransactionsList />} />
          <Route path="/transactions/broadcast" element={<TransactionBroadcast />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/transactions/pending" element={<PendingTransactions />} />
          
          {/* Policies */}
          <Route path="/policies" element={<PoliciesList />} />
          <Route path="/policies/create" element={<PoliciesCreate />} />
          <Route path="/policies/:id" element={<PoliciesDetail />} />
          <Route path="/policies/approvals" element={<ApprovalQueue />} />
          
          {/* Analytics */}
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/analytics/activity" element={<ActivityAnalytics />} />
          <Route path="/analytics/security" element={<SecurityAnalytics />} />
          <Route path="/analytics/usage" element={<UsageAnalytics />} />
          
          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/webhooks" element={<WebhookSettings />} />
          <Route path="/settings/networks" element={<NetworkSettings />} />
          
          {/* Fallback - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/wallet/dfns/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Real wallet components with DFNS integration

// Wallet route components (temporary placeholders)
const WalletsListPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">Wallets</h1>
    <p className="text-muted-foreground">
      This component will display multi-network wallet management with real DFNS integration.
    </p>
  </div>
);

const WalletsCreatePage = () => (
  <div className="p-6">
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Wallet</h1>
      <p className="text-muted-foreground">
        This component will provide a multi-step wallet creation wizard supporting 30+ networks.
      </p>
    </div>
  </div>
);

const WalletsDetailPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">Wallet Details</h1>
    <p className="text-muted-foreground">
      This component will display individual wallet view with assets, history, and transfer capabilities.
    </p>
  </div>
);

const AssetsListPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">Asset Management</h1>
    <p className="text-muted-foreground mb-6">
      Comprehensive view of assets across all your DFNS wallets with USD valuation.
    </p>
  </div>
);

// Authentication
const AuthenticationDashboard = () => <div className="p-6"><h1 className="text-3xl font-bold">Authentication Dashboard</h1><p className="mt-4 text-muted-foreground">This component will display authentication status and user management overview.</p></div>;
const UsersList = () => <div className="p-6"><h1 className="text-3xl font-bold">Users</h1><p className="mt-4 text-muted-foreground">This component will display and manage organization users.</p></div>;
const ServiceAccountsList = () => <div className="p-6"><h1 className="text-3xl font-bold">Service Accounts</h1><p className="mt-4 text-muted-foreground">This component will display and manage service accounts for automation.</p></div>;
const PersonalTokensList = () => <div className="p-6"><h1 className="text-3xl font-bold">Personal Access Tokens</h1><p className="mt-4 text-muted-foreground">This component will display and manage personal access tokens.</p></div>;
const CredentialsList = () => <div className="p-6"><h1 className="text-3xl font-bold">Credentials</h1><p className="mt-4 text-muted-foreground">This component will display and manage WebAuthn credentials.</p></div>;

// Permissions
const PermissionsList = () => <div className="p-6"><h1 className="text-3xl font-bold">Permissions</h1><p className="mt-4 text-muted-foreground">This component will display all permissions with 70+ granular operations.</p></div>;
const PermissionsCreate = () => <div className="p-6"><h1 className="text-3xl font-bold">Create Permission</h1><p className="mt-4 text-muted-foreground">This component will provide a form to create new permissions.</p></div>;
const PermissionAssignments = () => <div className="p-6"><h1 className="text-3xl font-bold">Permission Assignments</h1><p className="mt-4 text-muted-foreground">This component will manage permission assignments to users and service accounts.</p></div>;
const RoleTemplates = () => <div className="p-6"><h1 className="text-3xl font-bold">Role Templates</h1><p className="mt-4 text-muted-foreground">This component will provide enterprise role templates for common access patterns.</p></div>;

// Transactions
const TransactionsList = () => <div className="p-6"><h1 className="text-3xl font-bold">Transactions</h1><p className="mt-4 text-muted-foreground">This component will display cross-chain transaction history.</p></div>;
const TransactionBroadcast = () => <div className="p-6"><h1 className="text-3xl font-bold">Broadcast Transaction</h1><p className="mt-4 text-muted-foreground">This component will provide interface for broadcasting raw transactions.</p></div>;
const TransactionDetail = () => <div className="p-6"><h1 className="text-3xl font-bold">Transaction Details</h1><p className="mt-4 text-muted-foreground">This component will display details for a specific transaction.</p></div>;
const PendingTransactions = () => <div className="p-6"><h1 className="text-3xl font-bold">Pending Transactions</h1><p className="mt-4 text-muted-foreground">This component will display transactions pending approval or confirmation.</p></div>;

// Policies
const PoliciesList = () => <div className="p-6"><h1 className="text-3xl font-bold">Policies</h1><p className="mt-4 text-muted-foreground">This component will display all DFNS policies and rules.</p></div>;
const PoliciesCreate = () => <div className="p-6"><h1 className="text-3xl font-bold">Create Policy</h1><p className="mt-4 text-muted-foreground">This component will provide a form to create new policies.</p></div>;
const PoliciesDetail = () => <div className="p-6"><h1 className="text-3xl font-bold">Policy Details</h1><p className="mt-4 text-muted-foreground">This component will display details for a specific policy.</p></div>;
const ApprovalQueue = () => <div className="p-6"><h1 className="text-3xl font-bold">Approval Queue</h1><p className="mt-4 text-muted-foreground">This component will display pending policy approvals.</p></div>;

// Analytics
const AnalyticsDashboard = () => <div className="p-6"><h1 className="text-3xl font-bold">Analytics Dashboard</h1><p className="mt-4 text-muted-foreground">This component will provide comprehensive analytics and insights.</p></div>;
const ActivityAnalytics = () => <div className="p-6"><h1 className="text-3xl font-bold">Activity Analytics</h1><p className="mt-4 text-muted-foreground">This component will analyze DFNS activity and usage patterns.</p></div>;
const SecurityAnalytics = () => <div className="p-6"><h1 className="text-3xl font-bold">Security Analytics</h1><p className="mt-4 text-muted-foreground">This component will provide security metrics and threat analysis.</p></div>;
const UsageAnalytics = () => <div className="p-6"><h1 className="text-3xl font-bold">Usage Analytics</h1><p className="mt-4 text-muted-foreground">This component will analyze API usage and performance metrics.</p></div>;

// Settings
const Settings = () => <div className="p-6"><h1 className="text-3xl font-bold">DFNS Settings</h1><p className="mt-4 text-muted-foreground">This component will provide global DFNS configuration settings.</p></div>;
const WebhookSettings = () => <div className="p-6"><h1 className="text-3xl font-bold">Webhook Configuration</h1><p className="mt-4 text-muted-foreground">This component will manage webhook endpoints and events.</p></div>;
const NetworkSettings = () => <div className="p-6"><h1 className="text-3xl font-bold">Network Preferences</h1><p className="mt-4 text-muted-foreground">This component will configure preferred blockchain networks and settings.</p></div>;
