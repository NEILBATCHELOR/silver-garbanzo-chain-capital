/**
 * VaultWithdrawForm Component
 * 
 * Form for withdrawing assets from a vault
 * Supports vault selection and position management
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, AlertCircle } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';

interface VaultInfo {
  id: string;
  contract_address: string;
  contract_name: string;
  blockchain: string;
  network: string;
}

interface VaultPosition {
  id: string;
  vault_contract: string;
  shares: string;
  underlying_value: string;
  exchange_rate: string;
}

interface VaultWithdrawFormProps {
  vault: VaultInfo | null;
  position: VaultPosition | null;
  projectId?: string;
  onClose: () => void;
}

export const VaultWithdrawForm: React.FC<VaultWithdrawFormProps> = ({
  vault: initialVault,
  position: initialPosition,
  projectId,
  onClose
}) => {
  const [searchParams] = useSearchParams();
  const vaultAddressParam = searchParams.get('vault');

  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(initialVault);
  const [selectedPosition, setSelectedPosition] = useState<VaultPosition | null>(initialPosition);
  const [amount, setAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState<'shares' | 'underlying'>('shares');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadVaultsAndPositions();
  }, [projectId]);

  useEffect(() => {
    // Auto-select vault from URL parameter
    if (vaultAddressParam && vaults.length > 0 && !selectedVault) {
      const vault = vaults.find(v => v.contract_address === vaultAddressParam);
      if (vault) {
        setSelectedVault(vault);
        const position = positions.find(p => p.vault_contract === vault.contract_address);
        setSelectedPosition(position || null);
      }
    }
  }, [vaultAddressParam, vaults, positions, selectedVault]);

  const loadVaultsAndPositions = async () => {
    try {
      setLoadingData(true);

      // Load vaults
      let vaultsQuery = supabase
        .from('exchange_contracts')
        .select('*')
        .eq('contract_type', 'vault')
        .eq('blockchain', 'injective')
        .eq('is_active', true);

      if (projectId) {
        vaultsQuery = vaultsQuery.eq('project_id', projectId);
      }

      const { data: vaultData, error: vaultError } = await vaultsQuery;
      if (vaultError) throw vaultError;

      setVaults(vaultData || []);

      // Load positions
      let positionsQuery = supabase
        .from('vault_positions')
        .select('*')
        .eq('blockchain', 'injective')
        .eq('is_active', true);

      if (projectId) {
        positionsQuery = positionsQuery.eq('project_id', projectId);
      }

      const { data: positionData, error: positionError } = await positionsQuery;
      if (positionError) throw positionError;

      setPositions(positionData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedVault || !selectedPosition || !amount) return;

    setLoading(true);
    try {
      // TODO: Implement actual withdraw logic
      console.log('Withdrawing', amount, withdrawType, 'from', selectedVault.contract_address);
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Withdraw functionality coming soon!');
      onClose();
    } catch (error) {
      console.error('Error withdrawing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVaultChange = (vaultId: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    setSelectedVault(vault || null);
    
    if (vault) {
      const position = positions.find(p => p.vault_contract === vault.contract_address);
      setSelectedPosition(position || null);
    } else {
      setSelectedPosition(null);
    }
  };

  const handleMaxClick = () => {
    if (selectedPosition) {
      const maxAmount = withdrawType === 'shares' 
        ? selectedPosition.shares 
        : selectedPosition.underlying_value;
      setAmount(maxAmount);
    }
  };

  const hasPosition = selectedPosition && parseFloat(selectedPosition.shares) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw from Vault</CardTitle>
        <CardDescription>
          Select a vault and enter the amount you want to withdraw
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vault Selection */}
        {!initialVault && (
          <div className="space-y-2">
            <Label htmlFor="vault">Select Vault</Label>
            {loadingData ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select 
                value={selectedVault?.id} 
                onValueChange={handleVaultChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vault" />
                </SelectTrigger>
                <SelectContent>
                  {vaults.map((vault) => {
                    const position = positions.find(p => p.vault_contract === vault.contract_address);
                    const hasShares = position && parseFloat(position.shares) > 0;
                    
                    return (
                      <SelectItem 
                        key={vault.id} 
                        value={vault.id}
                        disabled={!hasShares}
                      >
                        {vault.contract_name}
                        {hasShares && ` (${parseFloat(position.shares).toFixed(4)} shares)`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Position Info */}
        {selectedPosition && hasPosition && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Your Position</p>
                <p className="text-sm">Shares: {parseFloat(selectedPosition.shares).toFixed(4)}</p>
                <p className="text-sm">Value: ${parseFloat(selectedPosition.underlying_value).toFixed(2)}</p>
                <p className="text-sm">Exchange Rate: {parseFloat(selectedPosition.exchange_rate).toFixed(6)}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* No Position Warning */}
        {selectedVault && !hasPosition && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any shares in this vault. Deposit first to withdraw.
            </AlertDescription>
          </Alert>
        )}

        {/* Withdraw Type */}
        {hasPosition && (
          <div className="space-y-2">
            <Label htmlFor="type">Withdraw Type</Label>
            <Select value={withdrawType} onValueChange={(value: any) => setWithdrawType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shares">Withdraw by Shares</SelectItem>
                <SelectItem value="underlying">Withdraw by Underlying Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Amount Input */}
        {hasPosition && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              <Button
                variant="link"
                size="sm"
                onClick={handleMaxClick}
                className="h-auto p-0 text-xs"
              >
                Max
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!selectedVault || !hasPosition}
            />
            <p className="text-sm text-muted-foreground">
              {withdrawType === 'shares' 
                ? 'Enter number of shares to withdraw'
                : 'Enter underlying value to withdraw'
              }
            </p>
          </div>
        )}

        {/* Info Alert */}
        {hasPosition && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Withdrawing will burn your vault shares and return the underlying assets
              based on the current exchange rate.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={loading || !hasPosition || !amount || parseFloat(amount) <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Withdraw'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
