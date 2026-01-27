/**
 * Government Bond Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GovernmentBondInput } from '@/services/tokens/metadata';

interface GovernmentBondFormProps {
  value: Partial<GovernmentBondInput>;
  onChange: (value: Partial<GovernmentBondInput>) => void;
}

export function GovernmentBondForm({ value, onChange }: GovernmentBondFormProps) {
  const updateField = <K extends keyof GovernmentBondInput>(
    field: K,
    fieldValue: GovernmentBondInput[K]
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
              <Input id="name" placeholder="US Treasury Note 2.5% 2031" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="UST31" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
                  <SelectItem value="GBP">GBP</SelectItem>
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
              <Input id="issuer" placeholder="US Treasury" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
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
                  <SelectItem value="treasury_note">Treasury Note</SelectItem>
                  <SelectItem value="treasury_bond">Treasury Bond</SelectItem>
                  <SelectItem value="treasury_bill">Treasury Bill</SelectItem>
                  <SelectItem value="municipal">Municipal Bond</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cusip">CUSIP</Label>
              <Input id="cusip" placeholder="912828YK0" value={value.cusip || ''} onChange={(e) => updateField('cusip', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isin">ISIN</Label>
              <Input id="isin" placeholder="US912828YK03" value={value.isin || ''} onChange={(e) => updateField('isin', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditRating">Credit Rating *</Label>
            <Input id="creditRating" placeholder="AAA" value={value.creditRating || ''} onChange={(e) => updateField('creditRating', e.target.value)} />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponRate">Coupon Rate (%) *</Label>
              <Input id="couponRate" type="number" step="0.01" placeholder="2.50" value={value.couponRate || ''} onChange={(e) => updateField('couponRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponFrequency">Coupon Frequency *</Label>
              <Select value={value.couponFrequency} onValueChange={(v) => updateField('couponFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuationMethod">Valuation Method *</Label>
              <Select value={value.valuationMethod} onValueChange={(v) => updateField('valuationMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytm">Yield to Maturity</SelectItem>
                  <SelectItem value="discount">Discount Method</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="benchmarkSpread">Benchmark Spread (bps)</Label>
              <Input id="benchmarkSpread" type="number" step="0.01" placeholder="0.00" value={value.benchmarkSpread || ''} onChange={(e) => updateField('benchmarkSpread', parseFloat(e.target.value))} />
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
              <Input id="settlementDays" type="number" placeholder="1" value={value.settlementDays || ''} onChange={(e) => updateField('settlementDays', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentVault">Payment Vault</Label>
              <Input id="paymentVault" placeholder="Vault address" value={value.paymentVault || ''} onChange={(e) => updateField('paymentVault', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
