/**
 * Revenue Distribution Chart Component
 * Visualizes revenue distribution across recipients with pie/bar charts
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRevenueDistribution } from '@/hooks/trade-finance';
import { formatEther } from 'viem';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { cn } from '@/utils/utils';

interface RevenueDistributionChartProps {
  className?: string;
}

export function RevenueDistributionChart({ className }: RevenueDistributionChartProps) {
  const { data, isLoading, error } = useRevenueDistribution();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load revenue distribution
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDistributed = data.recipients?.reduce(
    (sum: bigint, r: any) => sum + BigInt(r.total_distributed || '0'),
    BigInt(0)
  ) || BigInt(0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatEther(totalDistributed)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.recipients?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Distribution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {data.lastDistribution 
                ? new Date(data.lastDistribution).toLocaleDateString()
                : 'No distributions yet'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Recipients</CardTitle>
          <CardDescription>
            Distribution breakdown by recipient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recipients?.map((recipient: any) => {
              const percentage = totalDistributed > BigInt(0)
                ? Number(BigInt(recipient.total_distributed || '0') * BigInt(10000) / totalDistributed) / 100
                : 0;

              return (
                <div key={recipient.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-secondary px-2 py-1 rounded">
                        {recipient.recipient_address.slice(0, 6)}...{recipient.recipient_address.slice(-4)}
                      </code>
                      {recipient.is_active && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatEther(BigInt(recipient.total_distributed || '0'))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {recipient.notes && (
                    <p className="text-xs text-muted-foreground">{recipient.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
