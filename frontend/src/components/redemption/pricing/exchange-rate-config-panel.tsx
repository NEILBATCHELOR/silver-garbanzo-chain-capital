/**
 * ExchangeRateConfigPanel Component
 * 
 * Admin panel for configuring exchange rates for tokens with:
 * - Token selection
 * - Currency selection (USDC/USDT)
 * - Update frequency configuration
 * - Price source selection (checkboxes)
 * - Fallback rate setting
 * - Max deviation threshold
 * - Multi-source requirement toggle
 * - Save configuration
 * 
 * @priority Medium-Low (Admin)
 * @usage Admin settings page, token configuration
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useConfigureExchangeRate } from '@/infrastructure/redemption/pricing/hooks';
import { Currency, PriceSourceType } from '@/infrastructure/redemption/pricing/types';
import { cn } from '@/utils/utils';

interface ExchangeRateConfigPanelProps {
  tokenId?: string;
  onSuccess?: () => void;
  className?: string;
}

interface SourceOption {
  type: PriceSourceType;
  provider: string;
  label: string;
  description: string;
}

const AVAILABLE_SOURCES: SourceOption[] = [
  {
    type: PriceSourceType.ORACLE,
    provider: 'chainlink',
    label: 'Chainlink',
    description: 'Decentralized oracle network'
  },
  {
    type: PriceSourceType.ORACLE,
    provider: 'pyth',
    label: 'Pyth Network',
    description: 'High-frequency price feeds'
  },
  {
    type: PriceSourceType.MARKET,
    provider: 'coingecko',
    label: 'CoinGecko',
    description: 'Market data aggregator'
  },
  {
    type: PriceSourceType.MARKET,
    provider: 'coinmarketcap',
    label: 'CoinMarketCap',
    description: 'Cryptocurrency market data'
  }
];

export function ExchangeRateConfigPanel({
  tokenId: initialTokenId,
  onSuccess,
  className
}: ExchangeRateConfigPanelProps) {
  const { configure, loading, error } = useConfigureExchangeRate();

  // Form state
  const [tokenId, setTokenId] = useState(initialTokenId || '');
  const [currency, setCurrency] = useState<Currency>(Currency.USDC);
  const [updateFrequency, setUpdateFrequency] = useState('300'); // 5 minutes
  const [selectedSources, setSelectedSources] = useState<string[]>(['chainlink', 'pyth']);
  const [fallbackRate, setFallbackRate] = useState('');
  const [maxDeviation, setMaxDeviation] = useState('5'); // 5%
  const [requireMultiSource, setRequireMultiSource] = useState(true);
  const [success, setSuccess] = useState(false);

  // Handle source toggle
  const toggleSource = (provider: string) => {
    setSelectedSources((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  // Validate form
  const isValid = () => {
    if (!tokenId) return false;
    if (selectedSources.length === 0) return false;
    if (requireMultiSource && selectedSources.length < 2) return false;
    if (parseInt(updateFrequency) < 60) return false; // Minimum 1 minute
    if (maxDeviation && (parseFloat(maxDeviation) < 0 || parseFloat(maxDeviation) > 100)) {
      return false;
    }
    return true;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!isValid()) {
      return;
    }

    const sources = selectedSources.map((provider) => {
      const source = AVAILABLE_SOURCES.find((s) => s.provider === provider);
      return {
        type: source?.type || PriceSourceType.ORACLE,
        provider,
        references: [], // Required by PriceSource interface
        methodology: 'realtime'
      };
    });

    const result = await configure({
      tokenId,
      currency,
      baseCurrency: Currency.USDC, // Default base currency for exchange rate calculations
      updateFrequency: parseInt(updateFrequency),
      sources,
      fallbackRate: fallbackRate ? parseFloat(fallbackRate) : undefined,
      maxDeviation: maxDeviation ? parseFloat(maxDeviation) : undefined,
      requireMultiSource
    });

    if (result) {
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Exchange Rate Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic exchange rate updates for tokens
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Exchange rate configuration saved successfully
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="tokenId">Token ID</Label>
            <Input
              id="tokenId"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Enter token ID..."
              disabled={!!initialTokenId}
              required
            />
            <p className="text-xs text-muted-foreground">
              The unique identifier for the token
            </p>
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency">Settlement Currency</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.USDC}>USDC</SelectItem>
                <SelectItem value={Currency.USDT}>USDT</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The stablecoin used for settlement
            </p>
          </div>

          <Separator />

          {/* Update Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Update Frequency (seconds)</Label>
            <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="900">15 minutes</SelectItem>
                <SelectItem value="1800">30 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to fetch new exchange rates
            </p>
          </div>

          <Separator />

          {/* Price Sources */}
          <div className="space-y-3">
            <Label>Price Sources</Label>
            <div className="space-y-3">
              {AVAILABLE_SOURCES.map((source) => (
                <div key={source.provider} className="flex items-start space-x-3">
                  <Checkbox
                    id={source.provider}
                    checked={selectedSources.includes(source.provider)}
                    onCheckedChange={() => toggleSource(source.provider)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={source.provider}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {source.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select at least one price source
            </p>
          </div>

          <Separator />

          {/* Multi-Source Requirement */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Multiple Sources</Label>
              <p className="text-xs text-muted-foreground">
                Require data from at least 2 sources for better accuracy
              </p>
            </div>
            <Switch
              checked={requireMultiSource}
              onCheckedChange={setRequireMultiSource}
            />
          </div>

          {requireMultiSource && selectedSources.length < 2 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Multi-source mode requires at least 2 price sources to be selected
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Fallback Rate */}
          <div className="space-y-2">
            <Label htmlFor="fallback">Fallback Rate (Optional)</Label>
            <Input
              id="fallback"
              type="number"
              step="0.000001"
              value={fallbackRate}
              onChange={(e) => setFallbackRate(e.target.value)}
              placeholder="1.00"
            />
            <p className="text-xs text-muted-foreground">
              Rate to use if all sources fail (with 8 decimal precision)
            </p>
          </div>

          {/* Max Deviation */}
          <div className="space-y-2">
            <Label htmlFor="deviation">Max Deviation (%)</Label>
            <Input
              id="deviation"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={maxDeviation}
              onChange={(e) => setMaxDeviation(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum allowed price deviation between sources (0-100%)
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Changes will be applied immediately
          </p>
          <Button type="submit" disabled={!isValid() || loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
