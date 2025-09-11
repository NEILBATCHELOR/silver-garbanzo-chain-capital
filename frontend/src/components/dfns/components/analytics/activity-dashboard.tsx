import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  TrendingUp,
  Users,
  Wallet,
  ArrowRightLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface ActivityDashboardProps {
  className?: string;
}

interface ActivityMetrics {
  totalUsers: number;
  activeWallets: number;
  totalTransactions: number;
  dailyVolume: number;
  weeklyGrowth: number;
  topNetworks: Array<{
    name: string;
    activity: number;
    percentage: number;
  }>;
}

/**
 * Activity Dashboard Component
 * Shows comprehensive activity analytics for DFNS platform
 */
export function ActivityDashboard({ className }: ActivityDashboardProps) {
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load activity metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view analytics');
          return;
        }

        // Mock analytics data - replace with real analytics service
        const mockMetrics: ActivityMetrics = {
          totalUsers: 24,
          activeWallets: 156,
          totalTransactions: 2847,
          dailyVolume: 125000,
          weeklyGrowth: 12.5,
          topNetworks: [
            { name: 'Ethereum', activity: 1520, percentage: 53 },
            { name: 'Bitcoin', activity: 856, percentage: 30 },
            { name: 'Polygon', activity: 471, percentage: 17 }
          ]
        };

        setMetrics(mockMetrics);

      } catch (err: any) {
        console.error('Error loading analytics:', err);
        setError(err.message || 'Failed to load analytics');
        toast({
          title: "Error",
          description: "Failed to load activity analytics. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Analytics
          </CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Wallets</p>
                <p className="text-2xl font-bold">{metrics.activeWallets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Daily Volume</p>
                <p className="text-2xl font-bold">${(metrics.dailyVolume / 1000).toFixed(0)}k</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Network Activity</CardTitle>
          <CardDescription>
            Activity distribution across blockchain networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topNetworks.map((network) => (
              <div key={network.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{network.name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {network.activity} activities
                  </span>
                </div>
                <span className="text-sm font-medium">{network.percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
