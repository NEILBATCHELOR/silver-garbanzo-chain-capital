import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Wallet,
  Network,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Shield
} from "lucide-react";
import { ProjectWalletData, projectWalletService } from "@/services/project/project-wallet-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectWalletListProps {
  projectId: string;
  onRefresh?: () => void;
}

export const ProjectWalletList: React.FC<ProjectWalletListProps> = ({ projectId, onRefresh }) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<ProjectWalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<Record<string, boolean>>({});
  const [showMnemonic, setShowMnemonic] = useState<Record<string, boolean>>({});
  
  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const walletData = await projectWalletService.getProjectWallets(projectId);
      setWallets(walletData);
    } catch (err) {
      console.error('Error fetching project wallets:', err);
      setError('Failed to load project wallets');
      toast({
        title: "Error",
        description: "Failed to load project wallets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [projectId]);

  const handleRefresh = () => {
    fetchWallets();
    onRefresh?.();
  };

  const handleDeleteWallet = async () => {
    if (!walletToDelete) return;
    
    try {
      await projectWalletService.deleteProjectWallet(walletToDelete);
      setWallets(wallets.filter(wallet => wallet.id !== walletToDelete));
      toast({
        title: "Success",
        description: "Wallet deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting wallet:', err);
      toast({
        title: "Error",
        description: "Failed to delete wallet",
        variant: "destructive"
      });
    } finally {
      setWalletToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const confirmDelete = (walletId: string) => {
    setWalletToDelete(walletId);
    setShowDeleteDialog(true);
  };

  const toggleShowPrivateKey = (walletId: string) => {
    setShowPrivateKey(prev => ({
      ...prev,
      [walletId]: !prev[walletId]
    }));
  };

  const toggleShowMnemonic = (walletId: string) => {
    setShowMnemonic(prev => ({
      ...prev,
      [walletId]: !prev[walletId]
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const getNetworkIcon = (network: string) => {
    // Map network names to their icons/symbols
    const networkMap: Record<string, string> = {
      ethereum: '⟠',
      polygon: '⬟',
      solana: '◎',
      bitcoin: '₿',
      avalanche: '🔺',
      optimism: '🔴',
      arbitrum: '🔵',
      base: '🔷',
      sui: '🌊',
      aptos: '🅰️',
      near: '◇',
      stellar: '✶',
      ripple: 'Ⓡ',
      xrp: 'Ⓡ',
    };
    
    return networkMap[network.toLowerCase()] || '🔗';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Project Wallets
            </CardTitle>
            <CardDescription>
              Manage blockchain wallets for this project
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-destructive/10 p-4 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No wallets yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Use the wallet generator above to create blockchain wallets for this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Private Key</TableHead>
                  <TableHead>Mnemonic</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map(wallet => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-normal flex items-center space-x-1">
                        <span>{getNetworkIcon(wallet.wallet_type)}</span>
                        <span className="capitalize">{wallet.wallet_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[150px]">
                          {wallet.wallet_address}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(wallet.wallet_address, 'Wallet address')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {wallet.private_key ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs truncate max-w-[150px]">
                            {showPrivateKey[wallet.id || ''] 
                              ? wallet.private_key 
                              : '••••••••••••••••••••'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => toggleShowPrivateKey(wallet.id || '')}
                          >
                            {showPrivateKey[wallet.id || ''] 
                              ? <EyeOff className="h-3 w-3" /> 
                              : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(wallet.private_key || '', 'Private key')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Secured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {wallet.mnemonic ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs truncate max-w-[150px]">
                            {showMnemonic[wallet.id || ''] 
                              ? wallet.mnemonic 
                              : '•••••• •••••• ••••••'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => toggleShowMnemonic(wallet.id || '')}
                          >
                            {showMnemonic[wallet.id || ''] 
                              ? <EyeOff className="h-3 w-3" /> 
                              : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(wallet.mnemonic || '', 'Mnemonic')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not available</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(wallet.id || '')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-center text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                <p>
                  <strong>Security Notice:</strong> Keep private keys and mnemonics secure. These credentials provide complete control over the associated wallets.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet? This action cannot be undone.
              The wallet and its credentials will be permanently removed from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWallet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProjectWalletList;