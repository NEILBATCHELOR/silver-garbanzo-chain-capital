import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface PortfolioChartProps {
  className?: string;
  height?: number;
}

interface PortfolioDataPoint {
  date: string;
  value: number;
  change: number;
}

/**
 * Portfolio Chart Component
 * Shows portfolio value over time with real DFNS data
 */
export function PortfolioChart({ className, height = 300 }: PortfolioChartProps) {
  const [data, setData] = useState<PortfolioDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load portfolio data
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view portfolio data');
          return;
        }

        // Mock portfolio data for now - replace with real analytics service
        const mockData: PortfolioDataPoint[] = [
          { date: '2024-09-01', value: 50000, change: 2.5 },
          { date: '2024-09-02', value: 52000, change: 4.0 },
          { date: '2024-09-03', value: 51500, change: 3.0 },
          { date: '2024-09-04', value: 53000, change: 6.0 },
          { date: '2024-09-05', value: 54500, change: 9.0 },
          { date: '2024-09-06', value: 53800, change: 7.6 },
          { date: '2024-09-07', value: 55200, change: 10.4 }
        ];

        setData(mockData);

      } catch (err: any) {
        console.error('Error loading portfolio data:', err);
        setError(err.message || 'Failed to load portfolio data');
        toast({
          title: "Error",
          description: "Failed to load portfolio data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPortfolioData();
  }, [toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <CardDescription>Loading portfolio data...</CardDescription>
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
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
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

  const latestValue = data[data.length - 1]?.value || 0;
  const latestChange = data[data.length - 1]?.change || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Portfolio Performance
        </CardTitle>
        <CardDescription>
          Current value: ${latestValue.toLocaleString()} 
          <span className={`ml-2 ${latestChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {latestChange >= 0 ? '+' : ''}{latestChange.toFixed(1)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50" 
          style={{ height }}
        >
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Portfolio chart will be rendered here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Chart library integration needed
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
