import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  Wallet, 
  Plus, 
  List, 
  Send,
  History,
  ArrowUpRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Import wallet components - these would be the actual DFNS wallet components
import { WalletCreationWizard } from '../dialogs/wallet-creation-wizard';
import { TransferConfirmation } from '../dialogs/transfer-confirmation';
import { WalletList } from '../wallets/wallet-list';

const DfnsWalletsPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for wallets section
  const walletNavItems = [
    {
      icon: <List className="h-4 w-4" />,
      label: "All Wallets",
      href: `/wallet/dfns/wallets`,
      description: "View and manage all your wallets"
    },
    {
      icon: <Plus className="h-4 w-4" />,
      label: "Create Wallet", 
      href: `/wallet/dfns/wallets/create`,
      description: "Create new wallets on 30+ networks"
    },
    {
      icon: <Send className="h-4 w-4" />,
      label: "Transfer Assets",
      href: `/wallet/dfns/wallets/transfer`,
      description: "Transfer assets between wallets"
    },
    {
      icon: <History className="h-4 w-4" />,
      label: "Transaction History",
      href: `/wallet/dfns/wallets/history`, 
      description: "View all wallet transactions"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your multi-network cryptocurrency wallets and assets
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              30+ Networks
            </Badge>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Quick Create
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {walletNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/wallets' && pathname === '/wallet/dfns/wallets');
              
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-gray-100",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<WalletsListView />} />
          <Route path="/create" element={<WalletsCreateView />} />
          <Route path="/transfer" element={<WalletsTransferView />} />
          <Route path="/history" element={<WalletsHistoryView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/wallets" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const WalletsListView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">All Wallets</h2>
      <p className="text-muted-foreground">
        View and manage all your DFNS wallets across multiple blockchain networks.
      </p>
    </div>
    
    {/* Real DFNS wallet list component */}
    <WalletList showCreateButton={true} />
  </div>
);

const WalletsCreateView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Create New Wallet</h2>
      <p className="text-muted-foreground">
        Create a new wallet on any of the 30+ supported blockchain networks.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="max-w-2xl mx-auto">
        {/* This would integrate with the WalletCreationWizard component */}
        <div className="text-center py-12">
          <Plus className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Multi-Step Wallet Creation</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            This will show the DFNS wallet creation wizard with network selection, configuration, and User Action Signing.
          </p>
          <WalletCreationWizard />
        </div>
      </div>
    </div>
  </div>
);

const WalletsTransferView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Transfer Assets</h2>
      <p className="text-muted-foreground">
        Transfer cryptocurrencies, tokens, and NFTs between wallets and addresses.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Send className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Asset Transfer Interface</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will show the DFNS transfer interface with wallet selection, asset types, and User Action Signing.
        </p>
        <TransferConfirmation open={false} onOpenChange={() => {}} />
      </div>
    </div>
  </div>
);

const WalletsHistoryView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
      <p className="text-muted-foreground">
        View complete transaction history across all your wallets and networks.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Cross-Chain Transaction History</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display comprehensive transaction history with filtering, search, and blockchain explorer links.
        </p>
        <Button variant="outline">
          <History className="h-4 w-4 mr-2" />
          View All Transactions
        </Button>
      </div>
    </div>
  </div>
);

export default DfnsWalletsPage;