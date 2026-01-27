/**
 * Underlying Builder - Add and configure underlying assets
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Supports:
 * - Single asset
 * - Multi-asset baskets
 * - Worst-of/best-of configurations
 * - Oracle configuration per asset
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import type { UnderlyingAsset, UnderlyingType, BasketConfiguration } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface UnderlyingBuilderProps {
  underlyings: UnderlyingAsset[];
  basket?: BasketConfiguration;
  onChange: (underlyings: UnderlyingAsset[], basket?: BasketConfiguration) => void;
}

const underlyingTypes: { value: UnderlyingType; label: string }[] = [
  { value: 'equity_single', label: 'Single Stock' },
  { value: 'equity_index', label: 'Equity Index' },
  { value: 'equity_basket', label: 'Equity Basket' },
  { value: 'interest_rate', label: 'Interest Rate' },
  { value: 'inflation_index', label: 'Inflation Index' },
  { value: 'fx_spot', label: 'FX Spot' },
  { value: 'commodity_spot', label: 'Commodity Spot' },
  { value: 'commodity_futures', label: 'Commodity Futures' },
  { value: 'volatility_index', label: 'Volatility Index' },
  { value: 'crypto_asset', label: 'Cryptocurrency' }
];

const oracleProviders: Array<'pyth' | 'chainlink' | 'switchboard'> = ['pyth', 'chainlink', 'switchboard'];

const basketTypes: Array<BasketConfiguration['basketType']> = [
  'worst_of',
  'best_of',
  'average',
  'nth_best',
  'rainbow',
  'weighted_basket'
];

export function UnderlyingBuilder({ underlyings, basket, onChange }: UnderlyingBuilderProps) {
  const [newUnderlying, setNewUnderlying] = useState<Partial<UnderlyingAsset>>({
    type: 'equity_single',
    oracleProvider: 'pyth'
  });

  const addUnderlying = () => {
    if (!newUnderlying.identifier || !newUnderlying.name || !newUnderlying.oracleAddress) {
      return;
    }

    const underlying: UnderlyingAsset = {
      identifier: newUnderlying.identifier,
      name: newUnderlying.name,
      type: newUnderlying.type || 'equity_single',
      initialPrice: newUnderlying.initialPrice,
      currentPrice: newUnderlying.currentPrice,
      weight: newUnderlying.weight,
      oracleAddress: newUnderlying.oracleAddress,
      oracleProvider: newUnderlying.oracleProvider || 'pyth',
      currency: newUnderlying.currency,
      exchange: newUnderlying.exchange,
      sector: newUnderlying.sector
    };

    onChange([...underlyings, underlying], basket);
    setNewUnderlying({ type: 'equity_single', oracleProvider: 'pyth' });
  };

  const removeUnderlying = (index: number) => {
    const updated = underlyings.filter((_, i) => i !== index);
    onChange(updated, basket);
  };

  const updateBasket = (basketConfig: Partial<BasketConfiguration>) => {
    onChange(underlyings, { ...basket, ...basketConfig } as BasketConfiguration);
  };

  const isMultiAsset = underlyings.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Underlying Assets
          {isMultiAsset && <Badge variant="secondary">{underlyings.length} Assets</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Underlyings */}
        {underlyings.length > 0 && (
          <div className="space-y-3">
            {underlyings.map((underlying, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{underlying.identifier}</span>
                    <Badge variant="outline">{underlying.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{underlying.name}</p>
                  {underlying.weight && (
                    <p className="text-xs text-muted-foreground">Weight: {underlying.weight}%</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUnderlying(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Multi-Asset Basket Configuration */}
        {isMultiAsset && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Basket Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basket Type</Label>
                <Select
                  value={basket?.basketType}
                  onValueChange={(v) => updateBasket({ basketType: v as BasketConfiguration['basketType'] })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {basketTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {basket?.basketType === 'nth_best' && (
                <div className="space-y-2">
                  <Label>N (Position)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2 for 2nd best"
                    value={basket?.n || ''}
                    onChange={(e) => updateBasket({ n: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add New Underlying */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Add Underlying Asset</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Identifier (Ticker) *</Label>
              <Input
                placeholder="SPX, AAPL, BTC, etc."
                value={newUnderlying.identifier || ''}
                onChange={(e) => setNewUnderlying({ ...newUnderlying, identifier: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="S&P 500 Index"
                value={newUnderlying.name || ''}
                onChange={(e) => setNewUnderlying({ ...newUnderlying, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Select
                value={newUnderlying.type}
                onValueChange={(v) => setNewUnderlying({ ...newUnderlying, type: v as UnderlyingType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {underlyingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Price</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={newUnderlying.initialPrice || ''}
                onChange={(e) => setNewUnderlying({ ...newUnderlying, initialPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Oracle Provider *</Label>
              <Select
                value={newUnderlying.oracleProvider}
                onValueChange={(v) => setNewUnderlying({ ...newUnderlying, oracleProvider: v as typeof oracleProviders[number] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {oracleProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Oracle Address *</Label>
              <Input
                placeholder="GVXRSBjFk6e6J3Nb..."
                value={newUnderlying.oracleAddress || ''}
                onChange={(e) => setNewUnderlying({ ...newUnderlying, oracleAddress: e.target.value })}
              />
            </div>
            {isMultiAsset && (
              <div className="space-y-2">
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="33.33"
                  value={newUnderlying.weight || ''}
                  onChange={(e) => setNewUnderlying({ ...newUnderlying, weight: e.target.value })}
                />
              </div>
            )}
          </div>
          <Button onClick={addUnderlying} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Underlying Asset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
