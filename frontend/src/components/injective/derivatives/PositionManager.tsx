/**
 * Position Manager Component
 * 
 * Interface for opening and closing derivative positions
 * 
 * UPDATED: Now uses DerivativesBackendService for position opening
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, TrendingDown, AlertTriangle, Loader2, Info } from 'lucide-react';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';
import type { DerivativeMarket } from '@/services/derivatives/types';

interface PositionManagerProps {
  market?: DerivativeMarket;
  projectId?: string;
  userAddress?: string;
  onSuccess?: () => void;
}

export const PositionManager: React.FC<PositionManagerProps> = ({ 
  market, 
  projectId, 
  userAddress: propUserAddress,
  onSuccess 
}) => {
  const { toast } = useToast();
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get user address from props or localStorage
  const userAddress = propUserAddress || localStorage.getItem('injectiveAddress') || '';

  // Handle case where no market is selected
  if (!market) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Position</CardTitle>
          <CardDescription>
            Select a market to open a position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please select a market from the Markets tab to open a position.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const maxLeverage = 1 / parseFloat(market.initialMarginRatio || '0.05'); // e.g., 0.05 = 20x

  const handleOpenPosition = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!userAddress) {
        throw new Error('User address not found. Please connect your wallet.');
      }

      if (!quantity || parseFloat(quantity) <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
        throw new Error('Please enter a valid price for limit order');
      }

      // Get private key (in production, use secure key management)
      const privateKey = localStorage.getItem('injectivePrivateKey');
      if (!privateKey) {
        throw new Error('Private key not found. Please connect your wallet.');
      }

      // Call backend service
      const result = await DerivativesBackendService.openPosition({
        marketId: market.marketId,
        blockchain: market.blockchain,
        network: market.network,
        userAddress,
        subaccountId: '0', // Default subaccount
        isLong: side === 'long',
        quantity,
        leverage: parseInt(leverage),
        orderType,
        price: orderType === 'limit' ? price : undefined,
        privateKey,
        maintenanceMarginRatio: market.maintenanceMarginRatio
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to open position');
      }

      const successMsg = `Successfully opened ${side} position\nTx: ${result.data?.txHash?.substring(0, 20)}...`;
      setSuccess(successMsg);
      
      toast({
        title: 'Position Opened',
        description: (
          <div className="space-y-1">
            <p>Position ID: {result.data?.positionId}</p>
            <p>Required Margin: ${result.data?.requiredMargin}</p>
            <p>Liquidation Price: ${result.data?.liquidationPrice}</p>
            <p>Estimated Fees: ${result.data?.estimatedFees}</p>
          </div>
        ),
        duration: 10000
      });

      // Clear form
      setQuantity('');
      setPrice('');
      setLeverage('1');

      // Call success callback
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Error opening position:', err);
      const errorMsg = err.message || 'Failed to open position';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMargin = () => {
    if (!quantity) return '0';
    const qty = parseFloat(quantity);
    const lev = parseFloat(leverage);
    const pr = orderType === 'limit' && price ? parseFloat(price) : 100; // Use 100 as default
    
    return DerivativesBackendService.calculateRequiredMargin(
      quantity,
      pr.toString(),
      lev
    );
  };

  const calculateLiquidationPrice = () => {
    if (!quantity) return '0';
    const pr = orderType === 'limit' && price ? parseFloat(price) : 100;
    const lev = parseFloat(leverage);
    
    return DerivativesBackendService.calculateLiquidationPrice(
      pr.toString(),
      lev,
      side === 'long',
      market.maintenanceMarginRatio || '0.025'
    );
  };

  const calculateEstimatedFees = () => {
    if (!quantity) return '0';
    const qty = parseFloat(quantity);
    const pr = orderType === 'limit' && price ? parseFloat(price) : 100;
    const feeRate = orderType === 'market' 
      ? parseFloat(market.takerFeeRate || '0.002')
      : parseFloat(market.makerFeeRate || '0.001');
    
    return (qty * pr * feeRate).toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{market.ticker}</span>
          <div className="flex gap-2">
            <Badge variant="outline">{market.marketType}</Badge>
            <Badge variant="secondary">{market.network}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Open a position in this derivative market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error/Success Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{success}</AlertDescription>
          </Alert>
        )}

        {/* Side Selection */}
        <div className="space-y-2">
          <Label>Side</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === 'long' ? 'default' : 'outline'}
              onClick={() => setSide('long')}
              className="w-full"
              disabled={isLoading}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Long
            </Button>
            <Button
              variant={side === 'short' ? 'destructive' : 'outline'}
              onClick={() => setSide('short')}
              className="w-full"
              disabled={isLoading}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Short
            </Button>
          </div>
        </div>

        {/* Order Type */}
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market" disabled={isLoading}>Market</TabsTrigger>
            <TabsTrigger value="limit" disabled={isLoading}>Limit</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step={market.minQuantityTickSize || '0.01'}
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Min: {market.minQuantityTickSize || '0.01'} | 
            Tick size: {market.minQuantityTickSize || '0.01'}
          </p>
        </div>

        {/* Price (for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step={market.minPriceTickSize || '0.01'}
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Tick size: {market.minPriceTickSize || '0.01'}
            </p>
          </div>
        )}

        {/* Leverage */}
        <div className="space-y-2">
          <Label htmlFor="leverage">
            Leverage: {leverage}x
          </Label>
          <Input
            id="leverage"
            type="range"
            min="1"
            max={Math.floor(maxLeverage).toString()}
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Max leverage: {Math.floor(maxLeverage)}x
          </p>
        </div>

        {/* Position Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Required Margin:</span>
            <span className="font-semibold">${calculateMargin()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Liquidation Price:</span>
            <span className="font-semibold text-red-600">${calculateLiquidationPrice()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Fees:</span>
            <span className="font-semibold">${calculateEstimatedFees()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fee Rate:</span>
            <span className="font-semibold">
              {orderType === 'market' 
                ? `${parseFloat(market.takerFeeRate || '0') * 100}% (Taker)`
                : `${parseFloat(market.makerFeeRate || '0') * 100}% (Maker)`
              }
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleOpenPosition}
          disabled={
            !userAddress ||
            !quantity || 
            (orderType === 'limit' && !price) || 
            isLoading
          }
          variant={side === 'long' ? 'default' : 'destructive'}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Opening Position...
            </>
          ) : (
            `Open ${side === 'long' ? 'Long' : 'Short'} Position`
          )}
        </Button>

        {!userAddress && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please connect your Injective wallet to open positions
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PositionManager;
