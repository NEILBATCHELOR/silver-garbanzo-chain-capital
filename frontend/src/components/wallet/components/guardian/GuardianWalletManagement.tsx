import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Shield, Wallet, Copy, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { GuardianWalletDatabaseService, type WalletDetailsRecord } from '@/services/guardian/GuardianWalletDatabaseService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface GuardianWalletManagementProps {
  userId: string;
  onWalletCount?: (count: number) => void;
}

const WALLET_LIMIT = 50;

export function GuardianWalletManagement({ userId, onWalletCount }: GuardianWalletManagementProps) {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletDetailsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newWalletForm, setNewWalletForm] = useState({
    name: '',
    type: 'EOA' as 'EOA' | 'MULTISIG' | 'SMART',
    blockchain: 'polygon' as 'polygon' | 'ethereum'
  });

  const guardianService = new GuardianWalletDatabaseService();

  // Load Guardian wallets
  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const userWallets = await guardianService.listGuardianWallets(userId);
      setWallets(userWallets);
      onWalletCount?.(userWallets.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Guardian wallets';
      setError(message);
      console.error('Failed to load Guardian wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [userId]);

  // Create new Guardian wallet
  const handleCreateWallet = async () => {
    if (!newWalletForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your wallet",
        variant: "destructive"
      });
      return;
    }

    if (wallets.length >= WALLET_LIMIT) {
      toast({
        title: "Wallet limit reached",
        description: `You can create up to ${WALLET_LIMIT} wallets`,
        variant: "destructive"
      });
      return;
    }

    try {
      setCreating(true);
      
      const walletRecord = await guardianService.createGuardianWallet({
        name: newWalletForm.name.trim(),
        type: newWalletForm.type,
        userId: userId,
        blockchain: newWalletForm.blockchain
      });

      toast({
        title: "Guardian wallet created",
        description: `Wallet "${newWalletForm.name}" is being created. This may take a few moments.`
      });

      // Add to local state immediately
      setWallets(prev => [walletRecord, ...prev]);
      
      // Reset form and close dialog
      setNewWalletForm({ name: '', type: 'EOA', blockchain: 'polygon' });
      setShowCreateDialog(false);
      
      // Refresh wallet list to get latest status
      setTimeout(() => loadWallets(), 2000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create Guardian wallet';
      toast({
        title: "Creation failed",
        description: message,
        variant: "destructive"
      });
      console.error('Failed to create Guardian wallet:', err);
    } finally {
      setCreating(false);
    }
  };

  // Copy wallet address
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard"
    });
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address || address.length <= 12) return address || 'Pending...';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet status info
  const getWalletStatus = (wallet: WalletDetailsRecord) => {
    const status = wallet.blockchain_specific_data.status;
    const hasAddress = guardianService.getWalletAddress(wallet);
    
    if (hasAddress && status === 'active') {
      return { 
        status: 'active', 
        label: 'Active', 
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle 
      };
    } else if (status === 'pending') {
      return { 
        status: 'pending', 
        label: 'Creating', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock 
      };
    } else {
      return { 
        status: 'error', 
        label: 'Error', 
        color: 'bg-red-100 text-red-800',
        icon: AlertCircle 
      };
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guardian Wallets
          </h3>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guardian Wallets
            <Badge variant="outline" className="text-xs">
              {wallets.length}/{WALLET_LIMIT}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Institutional-grade wallets with advanced security
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadWallets}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                disabled={wallets.length >= WALLET_LIMIT}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Guardian Wallet</DialogTitle>
                <DialogDescription>
                  Create a new institutional-grade wallet managed by Guardian
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="walletName">Wallet Name</Label>
                  <Input
                    id="walletName"
                    placeholder="My Guardian Wallet"
                    value={newWalletForm.name}
                    onChange={(e) => setNewWalletForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="walletType">Wallet Type</Label>
                  <Select
                    value={newWalletForm.type}
                    onValueChange={(value: 'EOA' | 'MULTISIG' | 'SMART') => 
                      setNewWalletForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EOA">Externally Owned Account</SelectItem>
                      <SelectItem value="MULTISIG">Multi-Signature</SelectItem>
                      <SelectItem value="SMART">Smart Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="blockchain">Blockchain</Label>
                  <Select
                    value={newWalletForm.blockchain}
                    onValueChange={(value: 'polygon' | 'ethereum') => 
                      setNewWalletForm(prev => ({ ...prev, blockchain: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polygon">Polygon (Amoy Testnet)</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateWallet} 
                    disabled={creating}
                    className="flex-1"
                  >
                    {creating ? 'Creating...' : 'Create Wallet'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet list */}
      {wallets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No Guardian Wallets</h4>
            <p className="text-muted-foreground mb-4">
              Create your first Guardian wallet for institutional-grade security
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Guardian Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => {
            const address = guardianService.getWalletAddress(wallet);
            const statusInfo = getWalletStatus(wallet);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={wallet.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">
                          {wallet.blockchain_specific_data.name}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {wallet.blockchain_specific_data.blockchain?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600">
                          Guardian
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatAddress(address || '')}</span>
                        {address && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => copyAddress(address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Type: {wallet.blockchain_specific_data.accounts?.[0]?.type || 'EOA'}</span>
                        <span>Created: {new Date(wallet.created_at).toLocaleDateString()}</span>
                        {wallet.blockchain_specific_data.operation_id && (
                          <span>Op: {wallet.blockchain_specific_data.operation_id.substring(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
