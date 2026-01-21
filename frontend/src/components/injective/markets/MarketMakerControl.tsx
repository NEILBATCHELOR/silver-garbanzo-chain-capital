/**
 * MarketMakerControl Component
 * 
 * Control panel for creating and managing market makers
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Settings, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { MultiExchangeService } from '@/services/exchange';
import { useNavigate } from 'react-router-dom';

export const MarketMakerControl: React.FC = () => {
  const navigate = useNavigate();
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleDeployMarketMaker = async () => {
    setDeploying(true);
    setResult(null);

    try {
      const result = await MultiExchangeService.deployMarketMaker({
        userId: 'backend', // TODO: Get from auth context
        blockchain: 'injective',
        environment: 'testnet', // TODO: Get from network selector
        contractName: 'Chain Capital Market Maker',
        backendOracleAddress: '0x...', // TODO: Get from config
        productType: 'bond'
      });

      if (result.success) {
        setResult({
          success: true,
          message: `Market maker deployed at ${result.contractAddress}`
        });
      } else {
        setResult({
          success: false,
          message: result.error || 'Deployment failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Maker Controls</CardTitle>
        <CardDescription>
          Deploy and manage automated market makers for your products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={handleDeployMarketMaker}
            disabled={deploying}
            className="w-full"
          >
            {deploying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Deploy Market Maker
              </>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={() => navigate('/injective/markets/configure')}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Markets
          </Button>

          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Result Alert */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Market Maker:</strong> Automatically provides liquidity by placing buy and sell orders
            around the NAV price.
          </p>
          <p>
            <strong>Spread:</strong> The difference between buy and sell prices, typically 0.5-2%.
          </p>
          <p>
            <strong>Order Size:</strong> The amount of liquidity provided on each side of the order book.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
