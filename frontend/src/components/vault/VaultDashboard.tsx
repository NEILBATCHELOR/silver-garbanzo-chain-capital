/**
 * VaultDashboard Component
 * 
 * Main dashboard for yield-bearing vaults (CCeTracker-style)
 * Manages deposits, withdrawals, and tracks yield performance
 * 
 * Updated: Uses horizontal navigation tabs from shared/
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, 
  Info,
  Loader2
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';

// Import sub-components
import { VaultCard } from './VaultCard';
import { VaultStatsChart } from './VaultStatsChart';
import { VaultStats } from './shared/vault-navigation';

interface VaultInfo {
  id: string;
  contract_address: string;
  contract_name: string;
  blockchain: string;
  network: string;
  project_id: string;
  product_id: string;
  product_type: string;
  is_active: boolean;
}

interface VaultPosition {
  id: string;
  vault_contract: string;
  shares: string;
  underlying_value: string;
  exchange_rate: string;
  total_deposited: string;
  total_withdrawn: string;
}

interface VaultDashboardProps {
  projectId?: string;
}

export const VaultDashboard: React.FC<VaultDashboardProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVaultsAndPositions();
  }, [projectId]);

  const loadVaultsAndPositions = async () => {
    try {
      setLoading(true);

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
      console.error('Error loading vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = (vault: VaultInfo) => {
    const basePath = projectId ? `/projects/${projectId}/vault` : '/vault';
    navigate(`${basePath}/deposit?vault=${vault.contract_address}`);
  };

  const handleWithdraw = (vault: VaultInfo) => {
    const basePath = projectId ? `/projects/${projectId}/vault` : '/vault';
    navigate(`${basePath}/withdraw?vault=${vault.contract_address}`);
  };

  const handleDeployVault = () => {
    alert('Vault deployment coming soon!');
  };

  const totalDeposited = positions
    .reduce((sum, p) => sum + parseFloat(p.total_deposited || '0'), 0)
    .toFixed(0);

  const currentValue = positions
    .reduce((sum, p) => sum + parseFloat(p.underlying_value || '0'), 0)
    .toFixed(0);

  const totalYield = (parseFloat(currentValue) - parseFloat(totalDeposited)).toFixed(0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">{/* Removed min-h-screen and bg-background - wrapper handles this */}
      {/* REMOVED NAVIGATION - Now rendered by VaultProjectWrapper */}
      
      {/* MAIN CONTENT */}
      <div className="space-y-6">{/* Removed container mx-auto - wrapper handles spacing */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-muted-foreground">
              Monitor your vault positions and performance
            </p>
          </div>
          <Button onClick={handleDeployVault}>
            <Plus className="h-4 w-4 mr-2" />
            Deploy Vault
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Yield Vaults</AlertTitle>
          <AlertDescription>
            Vaults are yield-bearing tokens that automatically appreciate in value through
            trading strategies, staking rewards, or other yield sources. Your share count
            stays constant while the value per share increases over time.
          </AlertDescription>
        </Alert>

        <VaultStats
          totalDeposited={totalDeposited}
          totalYield={totalYield}
          activeVaults={vaults.length}
          totalTransactions={positions.length}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active vault positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${parseFloat(currentValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total portfolio value
              </p>
            </CardContent>
          </Card>
        </div>

        {vaults.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {projectId 
                  ? 'No vaults found for this project.'
                  : 'No vaults available.'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Deploy a vault contract to get started.
              </p>
              <Button className="mt-4" onClick={handleDeployVault}>
                <Plus className="h-4 w-4 mr-2" />
                Deploy Your First Vault
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Vaults</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vaults.map((vault) => {
                  const position = positions.find(p => p.vault_contract === vault.contract_address);
                  
                  return (
                    <VaultCard
                      key={vault.id}
                      vault={vault}
                      position={position}
                      onDeposit={() => handleDeposit(vault)}
                      onWithdraw={() => handleWithdraw(vault)}
                    />
                  );
                })}
              </div>
            </div>

            {positions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Vault Performance</CardTitle>
                  <CardDescription>
                    Exchange rate history and yield tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VaultStatsChart positions={positions} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VaultDashboard;
