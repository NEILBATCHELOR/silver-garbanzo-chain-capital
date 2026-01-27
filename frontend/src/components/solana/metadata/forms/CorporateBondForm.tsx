/**
 * Corporate Bond Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CorporateBondInput } from '@/services/tokens/metadata';

interface CorporateBondFormProps {
  value: Partial<CorporateBondInput>;
  onChange: (value: Partial<CorporateBondInput>) => void;
}

export function CorporateBondForm({ value, onChange }: CorporateBondFormProps) {
  const updateField = <K extends keyof CorporateBondInput>(
    field: K,
    fieldValue: CorporateBondInput[K]
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
              <Input id="name" placeholder="Apple Inc 3.5% Senior Notes 2030" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="AAPL30" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date</Label>
              <Input id="maturityDate" type="date" value={value.maturityDate || ''} onChange={(e) => updateField('maturityDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Bond Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bondType">Bond Type *</Label>
              <Select value={value.bondType} onValueChange={(v) => updateField('bondType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="senior_unsecured">Senior Unsecured</SelectItem>\n                <SelectItem value="senior_secured">Senior Secured</SelectItem>\n                <SelectItem value="subordinated">Subordinated</SelectItem>\n                <SelectItem value="convertible">Convertible</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="cusip">CUSIP</Label>
              <Input id="cusip" placeholder="037833CG2" value={value.cusip || ''} onChange={(e) => updateField('cusip', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="isin">ISIN</Label>
              <Input id="isin" placeholder="US037833CG20" value={value.isin || ''} onChange={(e) => updateField('isin', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="creditRating">Credit Rating *</Label>
              <Input id="creditRating" placeholder="AA+" value={value.creditRating || ''} onChange={(e) => updateField('creditRating', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parValue">Par Value *</Label>
              <Input id="parValue" type="number" step="0.01" placeholder="1000" value={value.parValue || ''} onChange={(e) => updateField('parValue', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="couponRate">Coupon Rate (%) *</Label>
              <Input id="couponRate" type="number" step="0.01" placeholder="3.50" value={value.couponRate || ''} onChange={(e) => updateField('couponRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="couponFrequency">Coupon Frequency *</Label>
              <Select value={value.couponFrequency} onValueChange={(v) => updateField('couponFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>\n                <SelectItem value="quarterly">Quarterly</SelectItem>\n                <SelectItem value="semi-annual">Semi-Annual</SelectItem>\n                <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuationMethod">Valuation Method *</Label>
              <Select value={value.valuationMethod} onValueChange={(v) => updateField('valuationMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytm">Yield to Maturity</SelectItem>\n                <SelectItem value="mark_to_market">Mark to Market</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentYield">Current Yield (%)</Label>
              <Input id="currentYield" type="number" step="0.01" placeholder="3.45" value={value.currentYield || ''} onChange={(e) => updateField('currentYield', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="durationYears">Duration (years)</Label>
              <Input id="durationYears" type="number" step="0.01" placeholder="3.8" value={value.durationYears || ''} onChange={(e) => updateField('durationYears', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Callable *</span>
                <Switch checked={value.callable || false} onCheckedChange={(checked) => updateField('callable', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Putable *</span>
                <Switch checked={value.putable || false} onCheckedChange={(checked) => updateField('putable', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="callDate">Call Date</Label>
              <Input id="callDate" type="date" value={value.callDate || ''} onChange={(e) => updateField('callDate', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="callPrice">Call Price</Label>
              <Input id="callPrice" type="number" step="0.01" placeholder="1025" value={value.callPrice || ''} onChange={(e) => updateField('callPrice', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Settlement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settlementDays">Settlement Days *</Label>
              <Input id="settlementDays" type="number" step="0.01" placeholder="2" value={value.settlementDays || ''} onChange={(e) => updateField('settlementDays', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="paymentVault">Payment Vault</Label>
              <Input id="paymentVault" placeholder="Vault address" value={value.paymentVault || ''} onChange={(e) => updateField('paymentVault', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}