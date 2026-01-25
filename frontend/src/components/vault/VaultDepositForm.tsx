/**
 * VaultDepositForm Component
 * 
 * Form for depositing assets into a vault
 * Supports vault selection and project context
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
import { Loader2, Info } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';

interface VaultInfo {
  id: string;
  contract_address: string;
  contract_name: string;
  blockchain: string;
  network: string;
}

interface VaultDepositFormProps {
  vault: VaultInfo | null;
  projectId?: string;
  onClose: () => void;
}

export const VaultDepositForm: React.FC<VaultDepositFormProps> = ({
  vault: initialVault,
  projectId,
  onClose
}) => {
  const [searchParams] = useSearchParams();
  const vaultAddressParam = searchParams.get('vault');

  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(initialVault);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVaults, setLoadingVaults] = useState(false);

  useEffect(() => {
    loadVaults();
  }, [projectId]);

  useEffect(() => {
    // Auto-select vault from URL parameter
    if (vaultAddressParam && vaults.length > 0 && !selectedVault) {
      const vault = vaults.find(v => v.contract_address === vaultAddressParam);
      if (vault) {
        setSelectedVault(vault);
      }
    }
  }, [vaultAddressParam, vaults, selectedVault]);

  const loadVaults = async () => {
    try {
      setLoadingVaults(true);

      let query = supabase
        .from('exchange_contracts')
        .select('*')
        .eq('contract_type', 'vault')
        .eq('blockchain', 'injective')
        .eq('is_active', true);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVaults(data || []);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setLoadingVaults(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedVault || !amount) return;

    setLoading(true);
    try {
      // TODO: Implement actual deposit logic
      console.log('Depositing', amount, 'to', selectedVault.contract_address);
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Deposit functionality coming soon!');
      onClose();
    } catch (error) {
      console.error('Error depositing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit to Vault</CardTitle>
        <CardDescription>
          Select a vault and enter the amount you want to deposit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vault Selection */}
        {!initialVault && (
          <div className="space-y-2">
            <Label htmlFor="vault">Select Vault</Label>
            {loadingVaults ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select 
                value={selectedVault?.id ?? ''} 
                onValueChange={(id) => {
                  const vault = vaults.find(v => v.id === id);
                  setSelectedVault(vault || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vault" />
                </SelectTrigger>
                <SelectContent>
                  {vaults.map((vault) => (
                    <SelectItem key={vault.id} value={vault.id}>
                      {vault.contract_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!selectedVault}
          />
          <p className="text-sm text-muted-foreground">
            Enter the amount to deposit
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Depositing assets will mint vault shares proportional to the current exchange rate.
            Your shares will automatically appreciate in value over time.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={loading || !selectedVault || !amount || parseFloat(amount) <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Deposit'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
