/**
 * Treasury Dashboard Component
 * Main dashboard for protocol treasury management, fee collection, and revenue distribution
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, TrendingUp, Shield, Users } from 'lucide-react';
import { cn } from '@/utils/utils';
import { FeeCollectionHistory } from './FeeCollectionHistory';
import { RevenueDistributionChart } from './RevenueDistributionChart';
import { ProtocolReserveMonitor } from './ProtocolReserveMonitor';
import { RevenueRecipientManager } from './RevenueRecipientManager';
import { useTreasuryStats } from '@/hooks/trade-finance';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEther } from 'viem';

interface TreasuryDashboardProps {
  className?: string;
}

export function TreasuryDashboard({ className }: TreasuryDashboardProps) {
  const { data: stats, isLoading, error } = useTreasuryStats();

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Treasury Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Error Loading Treasury</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load treasury data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees Collected</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalFeesCollected ? formatEther(BigInt(stats.totalFeesCollected)) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time protocol revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Distribution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.pendingDistribution ? formatEther(BigInt(stats.pendingDistribution)) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting distribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserve Balance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.reserveBalance ? formatEther(BigInt(stats.reserveBalance)) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Safety reserve fund
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeRecipients || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue sharing addresses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Card>
        <CardHeader>
          <CardTitle>Treasury Management</CardTitle>
          <CardDescription>
            Monitor fee collection, revenue distribution, and protocol reserves
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fees" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="fees">Fee Collection</TabsTrigger>
              <TabsTrigger value="distribution">Revenue Distribution</TabsTrigger>
              <TabsTrigger value="reserve">Protocol Reserve</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
            </TabsList>

            <TabsContent value="fees" className="space-y-4">
              <FeeCollectionHistory />
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
              <RevenueDistributionChart />
            </TabsContent>

            <TabsContent value="reserve" className="space-y-4">
              <ProtocolReserveMonitor />
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4">
              <RevenueRecipientManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
