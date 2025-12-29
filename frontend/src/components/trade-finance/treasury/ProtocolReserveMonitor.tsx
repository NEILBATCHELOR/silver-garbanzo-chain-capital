/**
 * Protocol Reserve Monitor Component
 * Monitors and displays protocol reserve fund status and health
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useProtocolReserve } from '@/hooks/trade-finance';
import { formatEther } from 'viem';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/utils';

interface ProtocolReserveMonitorProps {
  className?: string;
}

export function ProtocolReserveMonitor({ className }: ProtocolReserveMonitorProps) {
  const { data, isLoading, error } = useProtocolReserve();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load protocol reserve data
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentBalance = BigInt(data.balance || '0');
  const targetBalance = BigInt(data.target_balance || '0');
  const utilizationRate = targetBalance > BigInt(0)
    ? Number(currentBalance * BigInt(10000) / targetBalance) / 100
    : 0;

  const reserveHealth = utilizationRate >= 100 ? 'healthy' : utilizationRate >= 50 ? 'caution' : 'critical';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Reserve Status Alert */}
      {reserveHealth === 'critical' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Reserve Balance</AlertTitle>
          <AlertDescription>
            Protocol reserve is below 50% of target. Consider adding funds to maintain protocol health.
          </AlertDescription>
        </Alert>
      )}

      {reserveHealth === 'healthy' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Reserve Healthy</AlertTitle>
          <AlertDescription>
            Protocol reserve is at target levels. All systems operational.
          </AlertDescription>
        </Alert>
      )}

      {/* Reserve Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Reserve Balance
            </span>
            <Badge 
              variant={
                reserveHealth === 'healthy' ? 'default' : 
                reserveHealth === 'caution' ? 'secondary' : 
                'destructive'
              }
            >
              {reserveHealth.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Safety reserve fund for protocol operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current vs Target */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-mono font-bold">${formatEther(currentBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target Balance</span>
              <span className="font-mono">${formatEther(targetBalance)}</span>
            </div>
            <Progress value={utilizationRate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium">{utilizationRate.toFixed(1)}% of target</span>
              <span>100%</span>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Token Holdings</h4>
            {data.token_holdings?.map((holding: any) => (
              <div key={holding.token_address} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <code className="text-xs">
                    {holding.token_address.slice(0, 6)}...{holding.token_address.slice(-4)}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    {holding.token_symbol || 'Unknown Token'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {formatEther(BigInt(holding.amount))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ≈ ${holding.usd_value || '0'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reserve Statistics */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Total Inflows</div>
              <div className="text-lg font-bold mt-1">
                ${data.total_inflows ? formatEther(BigInt(data.total_inflows)) : '0'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Outflows</div>
              <div className="text-lg font-bold mt-1">
                ${data.total_outflows ? formatEther(BigInt(data.total_outflows)) : '0'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
