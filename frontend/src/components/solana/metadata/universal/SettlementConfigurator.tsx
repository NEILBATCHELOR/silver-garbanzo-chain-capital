/**
 * Settlement Configurator - Configure digital asset delivery and redemption
 * Part of Universal Structured Product Framework Phase 4
 * 
 * Supports:
 * - Cash settlement
 * - Physical delivery (SPL tokens)
 * - Automatic/manual redemption
 * - Vault address configuration
 * - T+N settlement timing
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CoinsIcon } from 'lucide-react';
import type { SettlementConfiguration } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface SettlementConfiguratorProps {
  settlement: SettlementConfiguration;
  onChange: (settlement: SettlementConfiguration) => void;
}

export function SettlementConfigurator({ settlement, onChange }: SettlementConfiguratorProps) {
  const updateField = <K extends keyof SettlementConfiguration>(
    field: K,
    value: SettlementConfiguration[K]
  ) => {
    onChange({ ...settlement, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CoinsIcon className="h-5 w-5" />
          Settlement & Redemption
          <Badge variant={settlement.settlementMethod === 'automatic' ? 'default' : 'secondary'}>
            {settlement.settlementMethod === 'automatic' ? 'Automatic' : 'Manual'}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure how digital assets are delivered at maturity or early redemption
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settlement Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settlementType">Settlement Type *</Label>
            <Select
              value={settlement.settlementType}
              onValueChange={(v) => updateField('settlementType', v as SettlementConfiguration['settlementType'])}
            >
              <SelectTrigger id="settlementType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex flex-col">
                    <span className="font-medium">Cash Settlement</span>
                    <span className="text-xs text-muted-foreground">Deliver USDC/stablecoins</span>
                  </div>
                </SelectItem>
                <SelectItem value="physical">
                  <div className="flex flex-col">
                    <span className="font-medium">Physical Delivery</span>
                    <span className="text-xs text-muted-foreground">Deliver underlying SPL tokens</span>
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex flex-col">
                    <span className="font-medium">Hybrid</span>
                    <span className="text-xs text-muted-foreground">Cash or physical (issuer choice)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlementMethod">Settlement Method *</Label>
            <Select
              value={settlement.settlementMethod}
              onValueChange={(v) => updateField('settlementMethod', v as SettlementConfiguration['settlementMethod'])}
            >
              <SelectTrigger id="settlementMethod"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">
                  <div className="flex flex-col">
                    <span className="font-medium">Automatic</span>
                    <span className="text-xs text-muted-foreground">Keeper triggers settlement</span>
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex flex-col">
                    <span className="font-medium">Manual</span>
                    <span className="text-xs text-muted-foreground">Issuer executes manually</span>
                  </div>
                </SelectItem>
                <SelectItem value="claim_based">
                  <div className="flex flex-col">
                    <span className="font-medium">Claim-Based</span>
                    <span className="text-xs text-muted-foreground">Users claim redemption</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Settlement Timing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settlementDays">Settlement Days (T+N) *</Label>
            <Input
              id="settlementDays"
              type="number"
              min="0"
              max="10"
              placeholder="2"
              value={settlement.settlementDays}
              onChange={(e) => updateField('settlementDays', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Number of business days after trigger (typically T+2)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlementCurrency">Settlement Currency</Label>
            <Select
              value={settlement.settlementCurrency}
              onValueChange={(v) => updateField('settlementCurrency', v)}
            >
              <SelectTrigger id="settlementCurrency"><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SOL">SOL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vault Configuration */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Vault Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="redemptionVault">Redemption Vault Address *</Label>
            <Input
              id="redemptionVault"
              placeholder="HvYxUf1C7BZzJRQkTGQBQjXQWUVqbPFDd7RQFZQY8m"
              value={settlement.redemptionVault}
              onChange={(e) => updateField('redemptionVault', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Solana address that holds settlement funds or tokens
            </p>
          </div>
        </div>

        {/* Physical Delivery (if applicable) */}
        {settlement.settlementType === 'physical' && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Physical Delivery Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Input
                id="deliveryInstructions"
                placeholder="SPL token mint address or delivery method"
                value={
                  typeof settlement.deliveryInstructions === 'string'
                    ? settlement.deliveryInstructions
                    : settlement.deliveryInstructions?.tokenMint || ''
                }
                onChange={(e) => {
                  const value = e.target.value;
                  updateField('deliveryInstructions', {
                    deliveryType: 'digital',
                    tokenMint: value,
                    blockchain: 'solana'
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* Early Settlement */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="earlySettlement" className="text-base font-medium cursor-pointer">
                Early Settlement Allowed
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow investors to settle before maturity (with penalty)
              </p>
            </div>
            <Switch
              id="earlySettlement"
              checked={settlement.earlySettlementAllowed === 'true'}
              onCheckedChange={(checked) => updateField('earlySettlementAllowed', checked ? 'true' : 'false')}
            />
          </div>
          {settlement.earlySettlementAllowed === 'true' && (
            <div className="space-y-2">
              <Label htmlFor="earlySettlementPenalty">Early Settlement Penalty (%)</Label>
              <Input
                id="earlySettlementPenalty"
                type="number"
                step="0.01"
                placeholder="2.00"
                value={settlement.earlySettlementPenalty || ''}
                onChange={(e) => updateField('earlySettlementPenalty', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Automatic Settlement Configuration */}
        {settlement.settlementMethod === 'automatic' && (
          <div className="rounded-lg bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">⚡ Automatic Settlement</h4>
            <p className="text-sm text-muted-foreground">
              A Clockwork keeper will monitor barriers and automatically trigger settlement when conditions are met.
              Ensure the redemption vault has sufficient funds/tokens before maturity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
