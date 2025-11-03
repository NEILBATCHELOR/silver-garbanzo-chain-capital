/**
 * ProjectWalletSelector Component
 * Automatically populates initial owner from project wallets
 * Auto-selects if only one wallet, provides dropdown for multiple
 */

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, Loader2 } from 'lucide-react';
import { projectWalletService, type ProjectWalletData } from '@/services/project/project-wallet-service';

interface ProjectWalletSelectorProps {
  projectId: string;
  value?: string; // Selected wallet address
  onChange: (walletAddress: string) => void;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export const ProjectWalletSelector: React.FC<ProjectWalletSelectorProps> = ({
  projectId,
  value,
  onChange,
  label = 'Initial Owner',
  description = 'Address that will receive all roles (ADMIN, MINTER, PAUSER, UPGRADER)',
  required = true,
  className
}) => {
  const [wallets, setWallets] = useState<ProjectWalletData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project wallets
  useEffect(() => {
    if (!projectId) return;

    const loadWallets = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const projectWallets = await projectWalletService.getProjectWallets(projectId);
        setWallets(projectWallets);

        // Auto-select if only one wallet
        if (projectWallets.length === 1 && !value) {
          onChange(projectWallets[0].wallet_address);
        }
      } catch (err) {
        console.error('Failed to load project wallets:', err);
        setError('Failed to load project wallets');
      } finally {
        setLoading(false);
      }
    };

    loadWallets();
  }, [projectId]);

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
            No project wallets found. Please create a wallet before deploying.
          </AlertDescription>
        </Alert>
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
              {wallet.project_wallet_name || 'Default Wallet'}
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
                  {wallet.project_wallet_name || 'Unnamed Wallet'}
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
