/**
 * Fee Sponsor Management Component
 * 
 * React component for managing DFNS Fee Sponsors - enables gasless transactions
 * by allowing designated wallets to sponsor gas fees for other wallets.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Loader2, Plus, Users, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { getDfnsService } from '../../../services/dfns';
import type { 
  DfnsFeeSponsor, 
  DfnsFeeSponsorSummary,
  DfnsWallet,
  DfnsNetwork
} from '../../../types/dfns';

interface FeeSponsorManagementProps {
  walletId?: string; // Wallet ID as string, not DfnsWallet type
  network?: DfnsNetwork;
  onFeeSponsorCreated?: (feeSponsor: DfnsFeeSponsor) => void;
}

export function FeeSponsorManagement({
  walletId,
  network,
  onFeeSponsorCreated
}: FeeSponsorManagementProps) {
  const [feeSponsors, setFeeSponsors] = useState<DfnsFeeSponsorSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fee sponsors on component mount
  useEffect(() => {
    loadFeeSponsors();
  }, []);

  const loadFeeSponsors = async () => {
    try {
      setLoading(true);
      setError(null);

      const dfnsService = getDfnsService();
      if (!dfnsService.isAuthenticated()) {
        setError('Please authenticate with DFNS first');
        return;
      }

      const feeSponsorService = dfnsService.getFeeSponsorService();
      const summaries = await feeSponsorService.getFeeSponsorsSummary({
        syncToDatabase: true,
        includeFeeHistory: true
      });

      setFeeSponsors(summaries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fee sponsors';
      setError(errorMessage);
      toast.error('Failed to load fee sponsors', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const createFeeSponsor = async () => {
    if (!walletId) {
      toast.error('No wallet selected', {
        description: 'Please select a wallet to create a fee sponsor'
      });
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const dfnsService = getDfnsService();
      const feeSponsorService = dfnsService.getFeeSponsorService();

      const feeSponsor = await feeSponsorService.createFeeSponsor(walletId, {
        syncToDatabase: true,
        autoActivate: true,
        validateNetwork: true
      });

      toast.success('Fee sponsor created successfully', {
        description: `Wallet ${walletId} can now sponsor gas fees`
      });

      onFeeSponsorCreated?.(feeSponsor);
      await loadFeeSponsors(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create fee sponsor';
      setError(errorMessage);
      toast.error('Failed to create fee sponsor', {
        description: errorMessage
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleFeeSponsorStatus = async (feeSponsorId: string, currentStatus: string) => {
    try {
      const dfnsService = getDfnsService();
      const feeSponsorService = dfnsService.getFeeSponsorService();

      if (currentStatus === 'Active') {
        await feeSponsorService.deactivateFeeSponsor(feeSponsorId, {
          syncToDatabase: true
        });
        toast.success('Fee sponsor deactivated');
      } else {
        await feeSponsorService.activateFeeSponsor(feeSponsorId, {
          syncToDatabase: true
        });
        toast.success('Fee sponsor activated');
      }

      await loadFeeSponsors(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update fee sponsor';
      toast.error('Failed to update fee sponsor', {
        description: errorMessage
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Deactivated':
        return 'secondary';
      case 'Archived':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Sponsor Management</h2>
          <p className="text-muted-foreground">
            Manage gasless transactions by sponsoring gas fees for other wallets
          </p>
        </div>
        {walletId && (
          <Button 
            onClick={createFeeSponsor} 
            disabled={creating}
            className="flex items-center gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Fee Sponsor
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading fee sponsors...</span>
        </div>
      )}

      {/* Fee Sponsors List */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeSponsors.length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No fee sponsors found</p>
                {walletId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first fee sponsor to enable gasless transactions
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            feeSponsors.map((feeSponsor) => (
              <Card key={feeSponsor.feeSponsorId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {feeSponsor.walletName || `Wallet ${feeSponsor.walletId.slice(-8)}`}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(feeSponsor.status)}>
                      {feeSponsor.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Network: {feeSponsor.network}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{feeSponsor.transactionCount}</p>
                        <p className="text-muted-foreground">Transactions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{feeSponsor.daysSinceCreated}d</p>
                        <p className="text-muted-foreground">Age</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Fees Sponsored */}
                  {feeSponsor.totalFeesSponsored !== '0' && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground">Total Fees Sponsored</p>
                      <p className="font-medium">{feeSponsor.totalFeesSponsored} wei</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t pt-3">
                    <Button
                      variant={feeSponsor.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleFeeSponsorStatus(
                        feeSponsor.feeSponsorId, 
                        feeSponsor.status
                      )}
                      className="w-full"
                    >
                      {feeSponsor.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Fee Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">What are Fee Sponsors?</h4>
              <p className="text-sm text-muted-foreground">
                Fee sponsors enable gasless transactions by allowing designated wallets 
                to pay gas fees on behalf of other wallets. This creates a seamless 
                user experience by removing the need for users to hold native tokens.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Supported Networks</h4>
              <p className="text-sm text-muted-foreground">
                Fee sponsoring is available on Ethereum, Arbitrum, Base, BSC, Optimism, 
                Polygon, Solana, Stellar, and their respective testnets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FeeSponsorManagement;