/**
 * Reverse Convertible Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReverseConvertibleInput } from '@/services/tokens/metadata';

interface ReverseConvertibleFormProps {
  value: Partial<ReverseConvertibleInput>;
  onChange: (value: Partial<ReverseConvertibleInput>) => void;
}

export function ReverseConvertibleForm({ value, onChange }: ReverseConvertibleFormProps) {
  const updateField = <K extends keyof ReverseConvertibleInput>(
    field: K,
    fieldValue: ReverseConvertibleInput[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      {/* Token Basics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input id="name" placeholder="Reverse Convertible TSLA 15% 2027" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="RCTSLA27" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI *</Label>
            <Input id="uri" placeholder="ar://..." value={value.uri || ''} onChange={(e) => updateField('uri', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Issuer */}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input id="maturityDate" type="date" value={value.maturityDate || ''} onChange={(e) => updateField('maturityDate', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select value={value.currency} onValueChange={(v) => updateField('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals *</Label>
            <Input id="decimals" type="number" min="0" max="9" value={value.decimals || 6} onChange={(e) => updateField('decimals', parseInt(e.target.value))} />
          </div>
        </CardContent>
      </Card>
      {/* Underlying */}
      <Card>
        <CardHeader><CardTitle className="text-base">Underlying</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="underlying">Ticker *</Label>
              <Input id="underlying" placeholder="TSLA" value={value.underlying || ''} onChange={(e) => updateField('underlying', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="underlyingName">Full Name *</Label>
              <Input id="underlyingName" placeholder="Tesla Inc" value={value.underlyingName || ''} onChange={(e) => updateField('underlyingName', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="initialPrice">Initial Price *</Label>
              <Input id="initialPrice" type="number" step="0.01" placeholder="250.00" value={value.initialPrice || ''} onChange={(e) => updateField('initialPrice', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="strikePrice">Strike Price *</Label>
              <Input id="strikePrice" type="number" step="0.01" placeholder="200.00" value={value.strikePrice || ''} onChange={(e) => updateField('strikePrice', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Coupon */}
      <Card>
        <CardHeader><CardTitle className="text-base">Coupon</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="couponRate">Coupon Rate (%) *</Label>
              <Input id="couponRate" type="number" step="0.01" placeholder="15.00" value={value.couponRate || ''} onChange={(e) => updateField('couponRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="couponFrequency">Coupon Frequency *</Label>
              <Select value={value.couponFrequency} onValueChange={(v) => updateField('couponFrequency', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>\n                <SelectItem value="quarterly">Quarterly</SelectItem>\n                <SelectItem value="semi-annual">Semi-Annual</SelectItem>\n                <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="couponType">Coupon Type *</Label>
              <Select value={value.couponType} onValueChange={(v) => updateField('couponType', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>\n                <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Conversion */}
      <Card>
        <CardHeader><CardTitle className="text-base">Conversion</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="knockInBarrier">Knock-In Barrier (%) *</Label>
              <Input id="knockInBarrier" type="number" step="0.01" placeholder="80" value={value.knockInBarrier || ''} onChange={(e) => updateField('knockInBarrier', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="conversionRatio">Conversion Ratio *</Label>
              <Input id="conversionRatio" type="number" step="0.01" placeholder="1.00" value={value.conversionRatio || ''} onChange={(e) => updateField('conversionRatio', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="barrierType">Barrier Type *</Label>
              <Select value={value.barrierType} onValueChange={(v) => updateField('barrierType', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Continuous</SelectItem>\n                <SelectItem value="discrete">Discrete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Settlement */}
      <Card>
        <CardHeader><CardTitle className="text-base">Settlement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="observationType">Observation Type *</Label>
              <Select value={value.observationType} onValueChange={(v) => updateField('observationType', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Continuous</SelectItem>\n                <SelectItem value="discrete">Discrete</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="settlementType">Settlement Type *</Label>
              <Select value={value.settlementType} onValueChange={(v) => updateField('settlementType', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>\n                <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault *</Label>
              <Input id="redemptionVault" placeholder="VAULT...ADDR" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}