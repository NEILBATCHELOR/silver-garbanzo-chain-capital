import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Layers,
  Copy
} from 'lucide-react';
import { GuardianWalletService } from '@/services/guardian/GuardianWalletService';
import { SimplifiedGuardianWalletCreation } from './SimplifiedGuardianWalletCreation';
import type { Wallet } from '@/types/core/centralModels';
import type { GuardianWalletExtension } from '@/types/guardian/guardian';
import { useUser } from '@/hooks/auth/user/useUser';

interface GuardianWalletListProps {
  onWalletSelect?: (wallet: Wallet & GuardianWalletExtension) => void;
  selectedWalletId?: string;
  userId?: string;
  maxWallets?: number;
  // New props for external data management
  wallets?: (Wallet & GuardianWalletExtension)[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function GuardianWalletList({ 
  onWalletSelect, 
  selectedWalletId,
  userId,
  maxWallets = 50,
  // New props for external data management
  wallets: externalWallets,
  loading: externalLoading,
  onRefresh: externalOnRefresh
}: GuardianWalletListProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [internalWallets, setInternalWallets] = useState<(Wallet & GuardianWalletExtension)[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedWalletForDetails, setSelectedWalletForDetails] = useState<(Wallet & GuardianWalletExtension) | null>(null);

  const guardianWalletService = new GuardianWalletService();
  const currentUserId = userId || user?.id;

  // Helper functions for wallet status classification
  const isActiveWallet = (wallet: any) => {
    return ['active', 'processed', 'completed'].includes(wallet.guardianMetadata?.status || '');
  };

  const isPendingWallet = (wallet: any) => {
    return ['pending', 'processing'].includes(wallet.guardianMetadata?.status || '');
  };

  // Use external data if provided, otherwise use internal state
  const wallets = externalWallets ?? internalWallets;
  const loading = externalLoading ?? internalLoading;

  const loadWallets = async (showRefreshing = false) => {
    // Only load internal wallets if external wallets are not provided
    if (externalWallets) return;
    
    if (showRefreshing) setRefreshing(true);
    
    try {
      setError(null);
      const guardianWallets = await guardianWalletService.listWallets();
      
      // Filter by user if userId is provided
      const filteredWallets = currentUserId 
        ? guardianWallets.filter(wallet => wallet.userId === currentUserId)
        : guardianWallets;
      
      setInternalWallets(filteredWallets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Guardian wallets';
      setError(errorMessage);
      console.error('Error loading Guardian wallets:', err);
    } finally {
      setInternalLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only load internal wallets if external wallets are not provided
    if (!externalWallets) {
      loadWallets();
    } else {
      // If external wallets are provided, we don't need to load
      setInternalLoading(false);
    }
  }, [currentUserId, externalWallets]);

  const handleRefresh = () => {
    if (externalOnRefresh) {
      // Use external refresh function if provided
      externalOnRefresh();
    } else {
      // Use internal refresh
      loadWallets(true);
    }
  };

  const handleWalletCreated = (wallet: Wallet & GuardianWalletExtension) => {
    // Only update internal state if we're managing it
    if (!externalWallets) {
      setInternalWallets(prev => [wallet, ...prev]);
    }
    
    setShowCreateDialog(false);
    
    toast({
      title: "Guardian Wallet Created",
      description: `${wallet.name} has been created successfully. It may take a few moments to become active.`,
    });

    // Optionally select the new wallet
    onWalletSelect?.(wallet);
    
    // If external refresh is provided, call it to sync the parent state
    if (externalOnRefresh) {
      setTimeout(externalOnRefresh, 1000);
    }
  };

  const handleCreateWallet = () => {
    if (wallets.length >= maxWallets) {
      toast({
        title: "Wallet Limit Reached",
        description: `You can create a maximum of ${maxWallets} Guardian wallets.`,
        variant: "destructive"
      });
      return;
    }

    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a Guardian wallet.",
        variant: "destructive"
      });
      return;
    }

    setShowCreateDialog(true);
  };

  const handleViewDetails = (wallet: Wallet & GuardianWalletExtension) => {
    setSelectedWalletForDetails(wallet);
    setShowDetailsDialog(true);
  };

  const canCreateWallet = currentUserId && wallets.length < maxWallets;

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'processed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'error': 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-xs`}>
        {status}
      </Badge>
    );
  };

  // Get wallet accounts - either from guardianMetadata.accounts or fallback to single address
  const getWalletAccounts = (wallet: any) => {
    // Check if wallet has accounts in guardianMetadata (Guardian service format)
    if (wallet.guardianMetadata?.accounts && Array.isArray(wallet.guardianMetadata.accounts) && wallet.guardianMetadata.accounts.length > 0) {
      return wallet.guardianMetadata.accounts;
    }
    
    // Check if wallet has accounts array directly (Guardian API response format)
    if (wallet.accounts && Array.isArray(wallet.accounts) && wallet.accounts.length > 0) {
      return wallet.accounts;
    }
    
    // Fallback to single address if no accounts array
    if (wallet.address) {
      return [{
        id: wallet.id,
        address: wallet.address,
        type: wallet.type || 'eoa',
        network: wallet.blockchain || 'evm'
      }];
    }
    
    return [];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Guardian Wallets</h3>
          <Skeleton className="h-9 w-24" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Guardian Wallets</h3>
          <p className="text-sm text-muted-foreground">
            {wallets.length} of {maxWallets} wallets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={handleCreateWallet}
                disabled={!canCreateWallet}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Guardian Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Guardian Wallet</DialogTitle>
                <DialogDescription>
                  Create a new institutional-grade wallet managed by Guardian for enhanced security and compliance.
                </DialogDescription>
              </DialogHeader>
              {currentUserId && (
                <SimplifiedGuardianWalletCreation
                  onWalletCreated={handleWalletCreated}
                  onCancel={() => setShowCreateDialog(false)}
                  maxWallets={maxWallets}
                  currentWalletCount={wallets.length}
                />
              )}
            </DialogContent>
          </Dialog>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Wallet Stats - restored to match reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Wallets</p>
                <p className="text-xl font-bold">
                  {wallets.filter(isActiveWallet).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending Wallets</p>
                <p className="text-xl font-bold">
                  {wallets.filter(isPendingWallet).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-xl font-bold">
                  {wallets.reduce((sum, w) => sum + getWalletAccounts(w).length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {wallets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Guardian Wallets</h3>
            <p className="text-gray-500 mb-6">
              Create your first Guardian wallet to get started with institutional-grade security.
            </p>
            {canCreateWallet && (
              <Button
                onClick={handleCreateWallet}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Guardian Wallet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guardian ID</TableHead>
                  <TableHead className="w-80">Primary Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => {
                  const accounts = getWalletAccounts(wallet);
                  return (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {wallet.guardianWalletId ? wallet.guardianWalletId.slice(0, 8) + '...' : wallet.id.slice(0, 8) + '...'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => navigator.clipboard.writeText(wallet.guardianWalletId || wallet.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="w-80">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {accounts[0] ? accounts[0].address : 'N/A'}
                          </span>
                          {accounts[0] && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => navigator.clipboard.writeText(accounts[0].address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(wallet.guardianMetadata?.status || 'unknown')}</TableCell>
                      <TableCell className="text-xs">
                        {formatDate(wallet.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(wallet.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{accounts.length}</span>
                          {accounts.map((account, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs mt-1 w-fit">
                              {account.type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(wallet)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Wallet Details Dialog - Structured like reference */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Wallet Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedWalletForDetails && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Guardian ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm">{selectedWalletForDetails.guardianWalletId || selectedWalletForDetails.id}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => navigator.clipboard.writeText(selectedWalletForDetails.guardianWalletId || selectedWalletForDetails.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedWalletForDetails.guardianMetadata?.status || 'unknown')}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Primary Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm break-all">
                        {getWalletAccounts(selectedWalletForDetails)[0]?.address || 'N/A'}
                      </span>
                      {getWalletAccounts(selectedWalletForDetails)[0] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => navigator.clipboard.writeText(getWalletAccounts(selectedWalletForDetails)[0].address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Accounts Count</label>
                    <div className="mt-1">
                      <span className="font-medium">{getWalletAccounts(selectedWalletForDetails).length} account(s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounts */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Accounts</h3>
                <div className="space-y-4">
                  {getWalletAccounts(selectedWalletForDetails).map((account, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Account {index + 1}</h4>
                        <Badge variant="outline" className="text-xs">
                          {account.type}
                        </Badge>
                        {account.network && (
                          <Badge variant="outline" className="text-xs">
                            {account.network}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-sm break-all">{account.address}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => navigator.clipboard.writeText(account.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw API Response */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Raw API Response</h3>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64 border">
                  {JSON.stringify(selectedWalletForDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GuardianWalletList;