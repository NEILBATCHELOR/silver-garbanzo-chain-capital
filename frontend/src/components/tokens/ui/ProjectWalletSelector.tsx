/**
 * ProjectWalletSelector Component
 * Automatically populates initial owner from project wallets
 * Auto-selects if only one wallet, provides dropdown for multiple
 * 
 * ENHANCED: Added detailed logging and EVM/non-EVM wallet display
 */

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, Loader2, Info } from 'lucide-react';
import { projectWalletService, type ProjectWalletData } from '@/services/project/project-wallet-service';

interface ProjectWalletSelectorProps {
  projectId: string;
  value?: string; // Selected wallet address
  onChange: (walletAddress: string) => void;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  // Optional: Filter by network/chain compatibility
  network?: string;
  chainId?: string;
  showAllWallets?: boolean; // If true, shows all wallets regardless of chain
}

export const ProjectWalletSelector: React.FC<ProjectWalletSelectorProps> = ({
  projectId,
  value,
  onChange,
  label = 'Initial Owner',
  description = 'Address that will receive all roles (ADMIN, MINTER, PAUSER, UPGRADER)',
  required = true,
  className,
  network,
  chainId,
  showAllWallets = true // Default to showing all wallets (owner can be any address)
}) => {
  const [wallets, setWallets] = useState<ProjectWalletData[]>([]);
  const [allWallets, setAllWallets] = useState<ProjectWalletData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project wallets
  useEffect(() => {
    if (!projectId) {
      console.warn('[ProjectWalletSelector] No projectId provided');
      return;
    }

    const loadWallets = async () => {
      console.log('[ProjectWalletSelector] Loading wallets for project:', projectId);
      setLoading(true);
      setError(null);
      
      try {
        const projectWallets = await projectWalletService.getProjectWallets(projectId);
        console.log('[ProjectWalletSelector] Loaded wallets:', {
          count: projectWallets.length,
          wallets: projectWallets.map(w => ({
            address: w.wallet_address,
            name: w.project_wallet_name,
            chainId: w.chain_id,
            network: w.non_evm_network
          }))
        });
        
        setAllWallets(projectWallets);

        // Filter wallets if network/chainId specified and showAllWallets is false
        let filteredWallets = projectWallets;
        if (!showAllWallets && (network || chainId)) {
          filteredWallets = projectWallets.filter(wallet => {
            // For EVM chains, match by chainId
            if (chainId && wallet.chain_id === chainId) return true;
            // For non-EVM, match by network name
            if (network && wallet.non_evm_network === network) return true;
            return false;
          });
          console.log('[ProjectWalletSelector] Filtered to network-compatible wallets:', {
            original: projectWallets.length,
            filtered: filteredWallets.length,
            chainId,
            network
          });
        }

        setWallets(filteredWallets);

        // Auto-select if only one wallet
        if (filteredWallets.length === 1 && !value) {
          console.log('[ProjectWalletSelector] Auto-selecting single wallet:', filteredWallets[0].wallet_address);
          onChange(filteredWallets[0].wallet_address);
        } else if (filteredWallets.length > 1) {
          console.log('[ProjectWalletSelector] Multiple wallets available, user must select');
        }
      } catch (err) {
        console.error('[ProjectWalletSelector] Failed to load project wallets:', err);
        setError('Failed to load project wallets');
      } finally {
        setLoading(false);
      }
    };

    loadWallets();
  }, [projectId, network, chainId, showAllWallets]);

  // Helper to format wallet display info
  const getWalletDisplayInfo = (wallet: ProjectWalletData) => {
    const parts: string[] = [];
    
    if (wallet.project_wallet_name) {
      parts.push(wallet.project_wallet_name);
    } else {
      parts.push('Unnamed Wallet');
    }
    
    // Add network info
    if (wallet.non_evm_network) {
      parts.push(`(${wallet.non_evm_network})`);
    } else if (wallet.chain_id) {
      // You might want to map chain IDs to friendly names
      parts.push(`(Chain ${wallet.chain_id})`);
    }
    
    return parts.join(' ');
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading wallets...
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <Label>{label}</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show warning if no wallets
  if (wallets.length === 0) {
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <Label>{label}</Label>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {allWallets.length === 0 
              ? 'No project wallets found. Please create a wallet before deploying.'
              : `No wallets found for ${chainId ? `chain ${chainId}` : network}. ${allWallets.length} wallet(s) available for other networks.`
            }
          </AlertDescription>
        </Alert>
        {!showAllWallets && allWallets.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tip: For token deployment, any EVM wallet address can be used as the initial owner, regardless of which chain the wallet was created for.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Show single wallet (no selector needed)
  if (wallets.length === 1) {
    const wallet = wallets[0];
    return (
      <div className={`space-y-2 ${className || ''}`}>
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="p-3 border rounded-lg bg-muted/50 space-y-1">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {getWalletDisplayInfo(wallet)}
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            {wallet.wallet_address}
          </p>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Show dropdown for multiple wallets
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor="initial_owner">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="initial_owner">
          <SelectValue placeholder="Select wallet for initial owner" />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((wallet) => (
            <SelectItem key={wallet.id} value={wallet.wallet_address}>
              <div className="flex flex-col">
                <span className="font-medium">
                  {getWalletDisplayInfo(wallet)}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {wallet.wallet_address.slice(0, 10)}...{wallet.wallet_address.slice(-8)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default ProjectWalletSelector;
