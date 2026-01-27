/**
 * Fiat-Backed Stablecoin Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FiatBackedStablecoinInput } from '@/services/tokens/metadata';

interface FiatBackedStablecoinFormProps {
  value: Partial<FiatBackedStablecoinInput>;
  onChange: (value: Partial<FiatBackedStablecoinInput>) => void;
}

export function FiatBackedStablecoinForm({ value, onChange }: FiatBackedStablecoinFormProps) {
  const updateField = <K extends keyof FiatBackedStablecoinInput>(
    field: K,
    fieldValue: FiatBackedStablecoinInput[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input id="name" placeholder="USD Stablecoin" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="USDCC" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI *</Label>
            <Input id="uri" placeholder="ar://..." value={value.uri || ''} onChange={(e) => updateField('uri', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals *</Label>
              <Input id="decimals" type="number" min="0" max="9" value={value.decimals || 6} onChange={(e) => updateField('decimals', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={value.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Issuer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuer">Issuer *</Label>
              <Input id="issuer" placeholder="Chain Capital LLC" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input id="jurisdiction" placeholder="US" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Stablecoin Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stablecoinType">Type *</Label>
              <Select value={value.stablecoinType} onValueChange={(v) => updateField('stablecoinType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiat_backed">Fiat-Backed</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="peggedCurrency">Pegged Currency *</Label>
              <Input id="peggedCurrency" placeholder="USD" value={value.peggedCurrency || ''} onChange={(e) => updateField('peggedCurrency', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Backing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backingRatio">Backing Ratio (%) *</Label>
              <Input id="backingRatio" type="number" step="0.01" placeholder="100" value={value.backingRatio || ''} onChange={(e) => updateField('backingRatio', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="reserveType">Reserve Type *</Label>
              <Input id="reserveType" placeholder="cash_equivalents" value={value.reserveType || ''} onChange={(e) => updateField('reserveType', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="reserveAssets">Reserve Assets</Label>
              <Input id="reserveAssets" placeholder="us_treasuries:70%,cash:30%" value={value.reserveAssets || ''} onChange={(e) => updateField('reserveAssets', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="custodian">Custodian *</Label>
              <Input id="custodian" placeholder="State Street Bank" value={value.custodian || ''} onChange={(e) => updateField('custodian', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="custodianAddress">Custodian Address</Label>
              <Input id="custodianAddress" placeholder="CUSTODY...VAULT" value={value.custodianAddress || ''} onChange={(e) => updateField('custodianAddress', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Attestation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attestationFrequency">Attestation Frequency *</Label>
              <Select value={value.attestationFrequency} onValueChange={(v) => updateField('attestationFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>\n                <SelectItem value="weekly">Weekly</SelectItem>\n                <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="auditor">Auditor *</Label>
              <Input id="auditor" placeholder="Grant Thornton" value={value.auditor || ''} onChange={(e) => updateField('auditor', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastAttestationDate">Last Attestation Date *</Label>
              <Input id="lastAttestationDate" type="date" value={value.lastAttestationDate || ''} onChange={(e) => updateField('lastAttestationDate', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="attestationUri">Attestation URI</Label>
              <Input id="attestationUri" placeholder="ar://attestation" value={value.attestationUri || ''} onChange={(e) => updateField('attestationUri', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Supply</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalSupply">Total Supply *</Label>
              <Input id="totalSupply" type="number" step="0.01" placeholder="500000000" value={value.totalSupply || ''} onChange={(e) => updateField('totalSupply', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="circulatingSupply">Circulating Supply *</Label>
              <Input id="circulatingSupply" type="number" step="0.01" placeholder="500000000" value={value.circulatingSupply || ''} onChange={(e) => updateField('circulatingSupply', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Redemption</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionMethod">Redemption Method *</Label>
              <Select value={value.redemptionMethod} onValueChange={(v) => updateField('redemptionMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_demand">On Demand</SelectItem>\n                <SelectItem value="periodic">Periodic</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionFee">Redemption Fee (%)</Label>
              <Input id="redemptionFee" type="number" step="0.01" placeholder="0.10" value={value.redemptionFee || ''} onChange={(e) => updateField('redemptionFee', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault</Label>
              <Input id="redemptionVault" placeholder="REDEEM...VAULT" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="minRedemption">Min Redemption</Label>
              <Input id="minRedemption" type="number" step="0.01" placeholder="100" value={value.minRedemption || ''} onChange={(e) => updateField('minRedemption', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}