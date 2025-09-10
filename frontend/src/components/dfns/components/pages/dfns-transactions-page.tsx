import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  ArrowRightLeft, 
  History, 
  Send, 
  Clock,
  AlertCircle,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Import transaction components - these are the actual DFNS transaction components
import { 
  TransactionList,
  TransactionDetails,
  BroadcastDialog 
} from '../transactions';

const DfnsTransactionsPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for transactions section
  const transactionNavItems = [
    {
      icon: <History className="h-4 w-4" />,
      label: "Transaction History",
      href: `/wallet/dfns/transactions`,
      description: "View all cross-chain transaction history"
    },
    {
      icon: <Send className="h-4 w-4" />,
      label: "Broadcast Transaction",
      href: `/wallet/dfns/transactions/broadcast`,
      description: "Manually broadcast raw transactions"
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Pending Transactions",
      href: `/wallet/dfns/transactions/pending`,
      description: "Monitor pending and unconfirmed transactions"
    },
    {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Failed Transactions",
      href: `/wallet/dfns/transactions/failed`, 
      description: "Review failed and rejected transactions"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage cross-chain cryptocurrency transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              32+ Networks
            </Badge>
            <Button size="sm" className="gap-2">
              <Zap className="h-4 w-4" />
              Broadcast Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {transactionNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/transactions' && pathname === '/wallet/dfns/transactions');
              
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
          <Route path="/" element={<TransactionHistoryView />} />
          <Route path="/broadcast" element={<BroadcastView />} />
          <Route path="/pending" element={<PendingTransactionsView />} />
          <Route path="/failed" element={<FailedTransactionsView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/transactions" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const TransactionHistoryView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
      <p className="text-muted-foreground">
        Complete history of all transactions across your wallets and networks.
      </p>
    </div>
    
    <TransactionList />
  </div>
);

const BroadcastView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Broadcast Transaction</h2>
      <p className="text-muted-foreground">
        Manually broadcast raw transactions to the blockchain network.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Send className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Multi-Network Transaction Broadcasting</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Broadcast transactions across Ethereum, Bitcoin, Solana, and other networks with User Action Signing.
        </p>
        <BroadcastDialog />
      </div>
    </div>
  </div>
);

const PendingTransactionsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Pending Transactions</h2>
      <p className="text-muted-foreground">
        Monitor transactions that are pending confirmation or approval.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Real-Time Transaction Monitoring</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display transactions awaiting confirmation with real-time status updates.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            View Pending
          </Button>
          <Button>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const FailedTransactionsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Failed Transactions</h2>
      <p className="text-muted-foreground">
        Review and analyze transactions that failed or were rejected.
      </p>
    </div>
    
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Transaction Error Analysis</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          This will display failed transactions with detailed error messages and retry options.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline">
            <AlertCircle className="h-4 w-4 mr-2" />
            View Errors
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Retry Failed
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default DfnsTransactionsPage;