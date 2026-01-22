/**
 * Market Launch Form Component
 * 
 * Form for launching new derivative markets (perpetuals and futures)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Loader2, Info, Rocket } from 'lucide-react';
import { DerivativesBackendService } from '@/services/derivatives/DerivativesBackendService';

interface MarketLaunchFormProps {
  projectId?: string;
  productId?: string;
  onSuccess?: () => void;
}

export const MarketLaunchForm: React.FC<MarketLaunchFormProps> = ({ 
  projectId, 
  productId,
  onSuccess 
}) => {
  const { toast } = useToast();
  const [marketType, setMarketType] = useState<'perpetual' | 'expiry_future'>('perpetual');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    ticker: '',
    quoteDenom: 'peggy0xdac17f...',
    oracleBase: '',
    oracleQuote: '',
    oracleType: 'BAND' as 'BAND' | 'PYTH' | 'CHAINLINK' | 'PROVIDER',
    initialMarginRatio: '0.05',
    maintenanceMarginRatio: '0.025',
    makerFeeRate: '0.001',
    takerFeeRate: '0.002',
    minPriceTickSize: '0.01',
    minQuantityTickSize: '1',
    minNotional: '10',
    productType: '',
    notes: '',
    // Perpetual specific
    fundingInterval: '3600',
    fundingRateCoefficient: '0.0001',
    // Expiry future specific
    expiryDate: '',
    settlementType: 'cash' as 'cash' | 'physical'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLaunchMarket = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!formData.ticker) {
        throw new Error('Please enter a ticker symbol');
      }

      // Get deployer address and private key
      const deployerAddress = localStorage.getItem('injectiveAddress');
      const privateKey = localStorage.getItem('injectivePrivateKey');

      if (!deployerAddress || !privateKey) {
        throw new Error('Please connect your wallet first');
      }

      let result;

      if (marketType === 'perpetual') {
        result = await DerivativesBackendService.launchPerpetualMarket({
          projectId,
          productId,
          blockchain: 'injective',
          network: 'testnet',
          ticker: formData.ticker,
          quoteDenom: formData.quoteDenom,
          oracleBase: formData.oracleBase,
          oracleQuote: formData.oracleQuote,
          oracleType: formData.oracleType,
          initialMarginRatio: formData.initialMarginRatio,
          maintenanceMarginRatio: formData.maintenanceMarginRatio,
          makerFeeRate: formData.makerFeeRate,
          takerFeeRate: formData.takerFeeRate,
          minPriceTickSize: formData.minPriceTickSize,
          minQuantityTickSize: formData.minQuantityTickSize,
          minNotional: formData.minNotional,
          productType: formData.productType || undefined,
          notes: formData.notes || undefined,
          deployerAddress,
          privateKey,
          fundingInterval: parseInt(formData.fundingInterval),
          fundingRateCoefficient: formData.fundingRateCoefficient
        });
      } else {
        result = await DerivativesBackendService.launchExpiryFuture({
          projectId,
          productId,
          blockchain: 'injective',
          network: 'testnet',
          ticker: formData.ticker,
          quoteDenom: formData.quoteDenom,
          oracleBase: formData.oracleBase,
          oracleQuote: formData.oracleQuote,
          oracleType: formData.oracleType,
          initialMarginRatio: formData.initialMarginRatio,
          maintenanceMarginRatio: formData.maintenanceMarginRatio,
          makerFeeRate: formData.makerFeeRate,
          takerFeeRate: formData.takerFeeRate,
          minPriceTickSize: formData.minPriceTickSize,
          minQuantityTickSize: formData.minQuantityTickSize,
          minNotional: formData.minNotional,
          productType: formData.productType || undefined,
          notes: formData.notes || undefined,
          deployerAddress,
          privateKey,
          expiryDate: formData.expiryDate,
          settlementType: formData.settlementType
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to launch market');
      }

      toast({
        title: 'Market Launched!',
        description: (
          <div className="space-y-1">
            <p>Market ID: {result.data?.marketId}</p>
            <p>Tx: {result.data?.txHash?.substring(0, 20)}...</p>
          </div>
        ),
        duration: 10000
      });

      // Reset form
      setFormData({
        ticker: '',
        quoteDenom: 'peggy0xdac17f...',
        oracleBase: '',
        oracleQuote: '',
        oracleType: 'BAND',
        initialMarginRatio: '0.05',
        maintenanceMarginRatio: '0.025',
        makerFeeRate: '0.001',
        takerFeeRate: '0.002',
        minPriceTickSize: '0.01',
        minQuantityTickSize: '1',
        minNotional: '10',
        productType: '',
        notes: '',
        fundingInterval: '3600',
        fundingRateCoefficient: '0.0001',
        expiryDate: '',
        settlementType: 'cash'
      });

      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Error launching market:', err);
      const errorMsg = err.message || 'Failed to launch market';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Launch Derivative Market
        </CardTitle>
        <CardDescription>
          Deploy a new perpetual futures or expiry futures market
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Market Type Selection */}
        <Tabs value={marketType} onValueChange={(v) => setMarketType(v as typeof marketType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="perpetual" disabled={isLoading}>Perpetual</TabsTrigger>
            <TabsTrigger value="expiry_future" disabled={isLoading}>Expiry Future</TabsTrigger>
          </TabsList>

          <TabsContent value="perpetual" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Perpetual futures have no expiry date and use funding rates to keep prices anchored to spot.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="expiry_future" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Expiry futures settle at a specific date based on settlement price.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Basic Market Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker *</Label>
            <Input
              id="ticker"
              placeholder="BTC/USDT"
              value={formData.ticker}
              onChange={(e) => handleInputChange('ticker', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quoteDenom">Quote Denom *</Label>
            <Input
              id="quoteDenom"
              placeholder="peggy0x..."
              value={formData.quoteDenom}
              onChange={(e) => handleInputChange('quoteDenom', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Oracle Configuration */}
        <div className="space-y-4">
          <Label>Oracle Configuration</Label>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleType">Type</Label>
              <Select
                value={formData.oracleType}
                onValueChange={(v) => handleInputChange('oracleType', v)}
                disabled={isLoading}
              >
                <SelectTrigger id="oracleType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAND">Band Protocol</SelectItem>
                  <SelectItem value="PYTH">Pyth Network</SelectItem>
                  <SelectItem value="CHAINLINK">Chainlink</SelectItem>
                  <SelectItem value="PROVIDER">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oracleBase">Base Oracle</Label>
              <Input
                id="oracleBase"
                placeholder="inj1..."
                value={formData.oracleBase}
                onChange={(e) => handleInputChange('oracleBase', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oracleQuote">Quote Oracle</Label>
              <Input
                id="oracleQuote"
                placeholder="inj1..."
                value={formData.oracleQuote}
                onChange={(e) => handleInputChange('oracleQuote', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Margin Requirements */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialMarginRatio">Initial Margin Ratio</Label>
            <Input
              id="initialMarginRatio"
              type="number"
              step="0.001"
              placeholder="0.05"
              value={formData.initialMarginRatio}
              onChange={(e) => handleInputChange('initialMarginRatio', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Max leverage: {(1 / parseFloat(formData.initialMarginRatio || '0.05')).toFixed(0)}x
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceMarginRatio">Maintenance Margin</Label>
            <Input
              id="maintenanceMarginRatio"
              type="number"
              step="0.001"
              placeholder="0.025"
              value={formData.maintenanceMarginRatio}
              onChange={(e) => handleInputChange('maintenanceMarginRatio', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Fee Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="makerFeeRate">Maker Fee Rate</Label>
            <Input
              id="makerFeeRate"
              type="number"
              step="0.0001"
              placeholder="0.001"
              value={formData.makerFeeRate}
              onChange={(e) => handleInputChange('makerFeeRate', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {(parseFloat(formData.makerFeeRate || '0') * 100).toFixed(2)}%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="takerFeeRate">Taker Fee Rate</Label>
            <Input
              id="takerFeeRate"
              type="number"
              step="0.0001"
              placeholder="0.002"
              value={formData.takerFeeRate}
              onChange={(e) => handleInputChange('takerFeeRate', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {(parseFloat(formData.takerFeeRate || '0') * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Tick Sizes */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPriceTickSize">Min Price Tick</Label>
            <Input
              id="minPriceTickSize"
              placeholder="0.01"
              value={formData.minPriceTickSize}
              onChange={(e) => handleInputChange('minPriceTickSize', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minQuantityTickSize">Min Qty Tick</Label>
            <Input
              id="minQuantityTickSize"
              placeholder="1"
              value={formData.minQuantityTickSize}
              onChange={(e) => handleInputChange('minQuantityTickSize', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minNotional">Min Notional</Label>
            <Input
              id="minNotional"
              placeholder="10"
              value={formData.minNotional}
              onChange={(e) => handleInputChange('minNotional', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Type-specific fields */}
        {marketType === 'perpetual' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundingInterval">Funding Interval (sec)</Label>
              <Input
                id="fundingInterval"
                type="number"
                placeholder="3600"
                value={formData.fundingInterval}
                onChange={(e) => handleInputChange('fundingInterval', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {parseInt(formData.fundingInterval || '3600') / 3600} hours
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingRateCoefficient">Funding Coefficient</Label>
              <Input
                id="fundingRateCoefficient"
                placeholder="0.0001"
                value={formData.fundingRateCoefficient}
                onChange={(e) => handleInputChange('fundingRateCoefficient', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {marketType === 'expiry_future' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                type="datetime-local"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlementType">Settlement Type</Label>
              <Select
                value={formData.settlementType}
                onValueChange={(v) => handleInputChange('settlementType', v)}
                disabled={isLoading}
              >
                <SelectTrigger id="settlementType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash Settlement</SelectItem>
                  <SelectItem value="physical">Physical Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="productType">Product Type (optional)</Label>
            <Input
              id="productType"
              placeholder="bond, reit, fund, etc."
              value={formData.productType}
              onChange={(e) => handleInputChange('productType', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this market..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={isLoading}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleLaunchMarket}
          disabled={!formData.ticker || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Launching Market...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Launch {marketType === 'perpetual' ? 'Perpetual' : 'Expiry Future'} Market
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MarketLaunchForm;
