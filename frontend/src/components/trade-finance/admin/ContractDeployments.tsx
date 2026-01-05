/**
 * Contract Deployments Component
 * 
 * Displays all deployed trade finance contracts from contract_masters database
 * Shows: Address, Version, Category, Upgradeable status, Verification
 */

import { useQuery } from '@tanstack/react-query';
import { TradeFinanceContractService } from '@/services/trade-finance/ContractDeploymentService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContractRecord {
  id: string;
  contract_type: string;
  contract_address: string;
  version: string;
  is_active: boolean;
  deployment_data: {
    category?: string;
    upgrade_history?: any[];
  };
  contract_details?: {
    upgrade_pattern?: string;
  };
  verification_status?: string;
  deployed_at?: string;
}

export function ContractDeployments() {
  const { data: contracts, isLoading, error } = useQuery({
    queryKey: ['trade-finance-contracts'],
    queryFn: () => TradeFinanceContractService.getAllTradeFinanceContracts(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load contract deployments: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Deployments</CardTitle>
          <CardDescription>No contracts deployed yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group contracts by category
  const grouped = contracts.reduce((acc, contract) => {
    const category = contract.deployment_data?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(contract);
    return acc;
  }, {} as Record<string, ContractRecord[]>);

  const categories = {
    trade_finance_governance: { label: 'Governance', icon: Shield },
    trade_finance_core: { label: 'Core Protocol', icon: CheckCircle2 },
    trade_finance_risk: { label: 'Risk & Security', icon: AlertCircle },
    trade_finance_liquidation: { label: 'Liquidation', icon: Clock },
    trade_finance_rewards: { label: 'Rewards', icon: CheckCircle2 },
    trade_finance_treasury: { label: 'Treasury', icon: CheckCircle2 },
    trade_finance_infrastructure: { label: 'Infrastructure', icon: CheckCircle2 },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Deployments</CardTitle>
        <CardDescription>
          {contracts.length} active contracts across {Object.keys(grouped).length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={Object.keys(categories)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(categories).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} disabled={!grouped[key]}>
                {label} {grouped[key] && `(${grouped[key].length})`}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(categories).map(([category, { label, icon: Icon }]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {grouped[category]?.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ContractCard({ contract }: { contract: ContractRecord }) {
  const isUpgradeable = contract.contract_details?.upgrade_pattern === 'UUPS';
  const upgradeCount = contract.deployment_data?.upgrade_history?.length || 0;
  const isVerified = contract.verification_status === 'verified';

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{formatContractType(contract.contract_type)}</h4>
            {isUpgradeable && (
              <Badge variant="outline" className="text-xs">
                UUPS
              </Badge>
            )}
            {isVerified && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono truncate">
            {contract.contract_address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{contract.version}</Badge>
          <Button size="sm" variant="ghost" asChild>
            <a
              href={`https://explorer.hoodi.io/address/${contract.contract_address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {contract.deployed_at && (
          <span>Deployed {new Date(contract.deployed_at).toLocaleDateString()}</span>
        )}
        {upgradeCount > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {upgradeCount} upgrade{upgradeCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Format contract type for display
 */
function formatContractType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
