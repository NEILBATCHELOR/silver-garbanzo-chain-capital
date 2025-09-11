import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, PieChart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface NetworkDistributionProps {
  className?: string;
  height?: number;
}

interface NetworkData {
  network: string;
  value: number;
  walletCount: number;
  percentage: number;
  color: string;
}

/**
 * Network Distribution Chart Component
 * Shows asset distribution across blockchain networks
 */
export function NetworkDistribution({ className, height = 300 }: NetworkDistributionProps) {
  const [data, setData] = useState<NetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load network distribution data
  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view network data');
          return;
        }

        // Mock network distribution data - replace with real analytics
        const mockData: NetworkData[] = [
          { network: 'Ethereum', value: 45000, walletCount: 5, percentage: 60, color: '#627EEA' },
          { network: 'Bitcoin', value: 20000, walletCount: 3, percentage: 27, color: '#F7931A' },
          { network: 'Polygon', value: 8000, walletCount: 4, percentage: 11, color: '#8247E5' },
          { network: 'Arbitrum', value: 1500, walletCount: 2, percentage: 2, color: '#96BEDC' }
        ];

        setData(mockData);

      } catch (err: any) {
        console.error('Error loading network data:', err);
        setError(err.message || 'Failed to load network data');
        toast({
          title: "Error",
          description: "Failed to load network distribution. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadNetworkData();
  }, [toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Network Distribution
          </CardTitle>
          <CardDescription>Loading network data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading chart...</span>
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
            <PieChart className="h-5 w-5" />
            Network Distribution
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

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Network Distribution
        </CardTitle>
        <CardDescription>
          Total portfolio: ${totalValue.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div 
            className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50" 
            style={{ height: height - 100 }}
          >
            <div className="text-center">
              <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Pie chart will be rendered here
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.network} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.network}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.walletCount} wallets
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ${item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
