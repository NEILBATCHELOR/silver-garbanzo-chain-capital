/**
 * Autocallable Metadata Form
 * 
 * Comprehensive form for Autocallable structured product metadata
 * Generates Token-2022 compatible on-chain metadata
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { AutocallableInput } from '@/services/tokens/metadata';

interface AutocallableFormProps {
  value: Partial<AutocallableInput>;
  onChange: (value: Partial<AutocallableInput>) => void;
}

export function AutocallableForm({ value, onChange }: AutocallableFormProps) {
  const updateField = <K extends keyof AutocallableInput>(
    field: K,
    fieldValue: AutocallableInput[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      {/* Token Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                placeholder="Autocallable S&P 500 Note 2026"
                value={value.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                Max 32 bytes ({value.name?.length || 0}/32)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="ACSPX26"
                value={value.symbol || ''}
                onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Max 10 bytes ({value.symbol?.length || 0}/10)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI (Arweave/IPFS) *</Label>
            <Input
              id="uri"
              placeholder="ar://abc123def456 or ipfs://Qm..."
              value={value.uri || ''}
              onChange={(e) => updateField('uri', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Full metadata document location
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals *</Label>
              <Input
                id="decimals"
                type="number"
                min="0"
                max="9"
                value={value.decimals || 6}
                onChange={(e) => updateField('decimals', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={value.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productSubtype">Product Type *</Label>
              <Select 
                value={value.productSubtype} 
                onValueChange={(v) => updateField('productSubtype', v as any)}
              >
                <SelectTrigger id="productSubtype">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barrier">Barrier</SelectItem>
                  <SelectItem value="phoenix">Phoenix</SelectItem>
                  <SelectItem value="worst-of">Worst-of</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issuer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issuer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuer">Issuer *</Label>
              <Input
                id="issuer"
                placeholder="Chain Capital LLC"
                value={value.issuer || ''}
                onChange={(e) => updateField('issuer', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input
                id="jurisdiction"
                placeholder="US"
                value={value.jurisdiction || ''}
                onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                type="date"
                value={value.issueDate || ''}
                onChange={(e) => updateField('issueDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input
                id="maturityDate"
                type="date"
                value={value.maturityDate || ''}
                onChange={(e) => updateField('maturityDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Underlying Asset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Underlying Asset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="underlying">Ticker *</Label>
              <Input
                id="underlying"
                placeholder="SPX"
                value={value.underlying || ''}
                onChange={(e) => updateField('underlying', e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="underlyingName">Full Name *</Label>
              <Input
                id="underlyingName"
                placeholder="S&P 500 Index"
                value={value.underlyingName || ''}
                onChange={(e) => updateField('underlyingName', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialPrice">Initial Price *</Label>
            <Input
              id="initialPrice"
              type="number"
              step="0.01"
              placeholder="5000.00"
              value={value.initialPrice || ''}
              onChange={(e) => updateField('initialPrice', parseFloat(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Autocallable Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autocallable Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All barrier/protection levels are expressed as % of initial price
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barrierLevel">Barrier Level (%) *</Label>
              <Input
                id="barrierLevel"
                type="number"
                step="0.01"
                placeholder="100"
                value={value.barrierLevel || ''}
                onChange={(e) => updateField('barrierLevel', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="knockInBarrier">Knock-In Barrier (%) *</Label>
              <Input
                id="knockInBarrier"
                type="number"
                step="0.01"
                placeholder="60"
                value={value.knockInBarrier || ''}
                onChange={(e) => updateField('knockInBarrier', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="protectionBarrier">Protection Barrier (%)</Label>
              <Input
                id="protectionBarrier"
                type="number"
                step="0.01"
                placeholder="80"
                value={value.protectionBarrier || ''}
                onChange={(e) => updateField('protectionBarrier', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="couponRate">Coupon Rate (%) *</Label>
              <Input
                id="couponRate"
                type="number"
                step="0.01"
                placeholder="8.50"
                value={value.couponRate || ''}
                onChange={(e) => updateField('couponRate', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="couponType">Coupon Type *</Label>
              <Select 
                value={value.couponType} 
                onValueChange={(v) => updateField('couponType', v as any)}
              >
                <SelectTrigger id="couponType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Memory Feature</span>
                <Switch
                  checked={value.memoryFeature || false}
                  onCheckedChange={(checked) => updateField('memoryFeature', checked)}
                />
              </Label>
              <p className="text-xs text-muted-foreground pt-6">
                Accumulates missed coupons
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observation & Call Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observation & Call Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observationFreq">Observation Frequency *</Label>
              <Select 
                value={value.observationFreq} 
                onValueChange={(v) => updateField('observationFreq', v as any)}
              >
                <SelectTrigger id="observationFreq">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callType">Call Type *</Label>
              <Select 
                value={value.callType} 
                onValueChange={(v) => updateField('callType', v as any)}
              >
                <SelectTrigger id="callType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="american">American (Continuous)</SelectItem>
                  <SelectItem value="european">European (Maturity Only)</SelectItem>
                  <SelectItem value="bermudan">Bermudan (Specific Dates)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstObsDate">First Observation Date *</Label>
              <Input
                id="firstObsDate"
                type="date"
                value={value.firstObsDate || ''}
                onChange={(e) => updateField('firstObsDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalObsDate">Final Observation Date *</Label>
              <Input
                id="finalObsDate"
                type="date"
                value={value.finalObsDate || ''}
                onChange={(e) => updateField('finalObsDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Oracle & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oracle & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider *</Label>
              <Select 
                value={value.oracleProvider} 
                onValueChange={(v) => updateField('oracleProvider', v as any)}
              >
                <SelectTrigger id="oracleProvider">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth Network</SelectItem>
                  <SelectItem value="chainlink">Chainlink</SelectItem>
                  <SelectItem value="switchboard">Switchboard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuationMethod">Valuation Method *</Label>
              <Select 
                value={value.valuationMethod} 
                onValueChange={(v) => updateField('valuationMethod', v as any)}
              >
                <SelectTrigger id="valuationMethod">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end-of-day">End of Day</SelectItem>
                  <SelectItem value="intraday">Intraday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleAddress">Oracle Address (Solana) *</Label>
              <Input
                id="oracleAddress"
                placeholder="GVXRSBjFk6e6J3NbVPXoh9QVeQzQP4FbLFJzLDQZkE"
                value={value.oracleAddress || ''}
                onChange={(e) => updateField('oracleAddress', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixingTime">Fixing Time (UTC) *</Label>
              <Input
                id="fixingTime"
                placeholder="16:00UTC"
                value={value.fixingTime || ''}
                onChange={(e) => updateField('fixingTime', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemption Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redemption Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="redemptionVault">Redemption Vault Address *</Label>
            <Input
              id="redemptionVault"
              placeholder="HvYxUf1C7BZzJRQkTGQBQjXQWUVqbPFDd7RQFZQY8m"
              value={value.redemptionVault || ''}
              onChange={(e) => updateField('redemptionVault', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionMethod">Redemption Method *</Label>
              <Select 
                value={value.redemptionMethod} 
                onValueChange={(v) => updateField('redemptionMethod', v as any)}
              >
                <SelectTrigger id="redemptionMethod">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic (Keeper Service)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlementDays">Settlement Days *</Label>
              <Input
                id="settlementDays"
                type="number"
                min="0"
                placeholder="2"
                value={value.settlementDays || ''}
                onChange={(e) => updateField('settlementDays', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participation & Cap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participation & Cap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upsideParticipation">Upside Participation (%) *</Label>
              <Input
                id="upsideParticipation"
                type="number"
                step="0.01"
                placeholder="100"
                value={value.upsideParticipation || ''}
                onChange={(e) => updateField('upsideParticipation', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downsideParticipation">Downside Participation (%) *</Label>
              <Input
                id="downsideParticipation"
                type="number"
                step="0.01"
                placeholder="100"
                value={value.downsideParticipation || ''}
                onChange={(e) => updateField('downsideParticipation', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cap">Cap (%)</Label>
              <Input
                id="cap"
                type="number"
                step="0.01"
                placeholder="150"
                value={value.cap || ''}
                onChange={(e) => updateField('cap', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* URIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document URIs (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospectusUri">Prospectus URI (Arweave/IPFS)</Label>
            <Input
              id="prospectusUri"
              placeholder="ar://prospectus-abc123"
              value={value.prospectusUri || ''}
              onChange={(e) => updateField('prospectusUri', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="termSheetUri">Term Sheet URI (Arweave/IPFS)</Label>
            <Input
              id="termSheetUri"
              placeholder="ar://termsheet-def456"
              value={value.termSheetUri || ''}
              onChange={(e) => updateField('termSheetUri', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
