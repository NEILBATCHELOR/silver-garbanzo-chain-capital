/**
 * Fractionalization Module Configuration Component
 * ✅ ENHANCED: Complete fractionalization setup with token details
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Share2, DollarSign } from 'lucide-react';
import type { ModuleConfigProps, FractionalizationModuleConfig } from '../types';

export function FractionalizationModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<FractionalizationModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        enabled: false,
        minFractions: 0,
        maxFractions: undefined,
        fractionPrice: undefined,
        buyoutMultiplier: undefined,
        fractionTokenName: undefined,
        fractionTokenSymbol: undefined,
        tradingEnabled: undefined
      });
    } else {
      onChange({
        enabled: true,
        minFractions: config.minFractions || 100,
        maxFractions: config.maxFractions,
        fractionPrice: config.fractionPrice,
        buyoutMultiplier: config.buyoutMultiplier || 1.5,
        fractionTokenName: config.fractionTokenName,
        fractionTokenSymbol: config.fractionTokenSymbol,
        tradingEnabled: config.tradingEnabled !== false
      });
    }
  };

  const calculateBuyoutPrice = () => {
    if (!config.fractionPrice || !config.buyoutMultiplier) return null;
    const price = parseFloat(config.fractionPrice);
    const fractions = config.maxFractions || config.minFractions;
    return (price * fractions * config.buyoutMultiplier).toFixed(6);
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Fractionalization Module</Label>
          <p className="text-xs text-muted-foreground">
            Split NFTs into fungible fractions for shared ownership
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Enable fractional ownership of high-value NFTs. Perfect for art, real estate, 
              or expensive collectibles where multiple parties want shared ownership.
            </AlertDescription>
          </Alert>

          {/* Fraction Configuration */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <Share2 className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Fraction Configuration</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Minimum Fractions *</Label>
                  <Input
                    type="number"
                    value={config.minFractions}
                    onChange={(e) => onChange({
                      ...config,
                      minFractions: parseInt(e.target.value) || 0
                    })}
                    placeholder="100"
                    disabled={disabled}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum shares per NFT
                  </p>
                  {errors?.['minFractions'] && (
                    <p className="text-xs text-destructive mt-1">{errors['minFractions']}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Maximum Fractions</Label>
                  <Input
                    type="number"
                    value={config.maxFractions || ''}
                    onChange={(e) => onChange({
                      ...config,
                      maxFractions: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder="10000"
                    disabled={disabled}
                    min={config.minFractions || 1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum shares (optional)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Fraction Token Details */}
          <Card className="p-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Fraction Token Details</Label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Token Name</Label>
                  <Input
                    value={config.fractionTokenName || ''}
                    onChange={(e) => onChange({
                      ...config,
                      fractionTokenName: e.target.value || undefined
                    })}
                    placeholder="My NFT Fractions"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Name for fraction tokens
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Token Symbol</Label>
                  <Input
                    value={config.fractionTokenSymbol || ''}
                    onChange={(e) => onChange({
                      ...config,
                      fractionTokenSymbol: e.target.value || undefined
                    })}
                    placeholder="FRAC"
                    disabled={disabled}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Symbol for fraction tokens
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing Configuration */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-primary" />
                <Label className="text-sm font-medium">Pricing Configuration</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fraction Price (ETH)</Label>
                  <Input
                    type="text"
                    value={config.fractionPrice || ''}
                    onChange={(e) => onChange({
                      ...config,
                      fractionPrice: e.target.value || undefined
                    })}
                    placeholder="0.01"
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Price per fraction in ETH
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Buyout Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.buyoutMultiplier || 1.5}
                    onChange={(e) => onChange({
                      ...config,
                      buyoutMultiplier: parseFloat(e.target.value) || 1.5
                    })}
                    placeholder="1.5"
                    disabled={disabled}
                    min="1"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Multiplier for buyout price
                  </p>
                </div>
              </div>

              {config.fractionPrice && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {calculateBuyoutPrice() && (
                      <>
                        <strong>Buyout Price:</strong> {calculateBuyoutPrice()} ETH{' '}
                        ({config.fractionPrice} × {config.maxFractions || config.minFractions} × {config.buyoutMultiplier})
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>

          {/* Trading Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">Trading Options</Label>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tradingEnabled"
                  checked={config.tradingEnabled !== false}
                  onChange={(e) => onChange({
                    ...config,
                    tradingEnabled: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="tradingEnabled" className="text-xs font-normal cursor-pointer">
                  Enable fraction trading (allow buying/selling of fractions)
                </Label>
              </div>
            </div>
          </Card>

          {/* Examples */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-sm">Fractionalization Examples</Label>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>Art Piece:</strong> 1,000 fractions × $10 each = $10,000 total value</p>
                <p><strong>Real Estate:</strong> 10,000 fractions × $100 each = $1M property</p>
                <p><strong>Rare Collectible:</strong> 500 fractions × $20 each = $10,000 item</p>
                <p><strong>Buyout Example:</strong> With 1.5× multiplier, buyout = $15,000 (prevents hostile takeovers)</p>
              </div>
            </div>
          </Card>

          {/* Pre-deployment Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Fractionalization parameters will be 
              set when the token deploys. NFT owners can then fractionalize their tokens according 
              to these rules.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
