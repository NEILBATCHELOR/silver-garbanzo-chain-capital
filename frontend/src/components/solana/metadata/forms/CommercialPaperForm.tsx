/**
 * Commercial Paper Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CommercialPaperInput } from '@/services/tokens/metadata';

interface CommercialPaperFormProps {
  value: Partial<CommercialPaperInput>;
  onChange: (value: Partial<CommercialPaperInput>) => void;
}

export function CommercialPaperForm({ value, onChange }: CommercialPaperFormProps) {
  const updateField = <K extends keyof CommercialPaperInput>(
    field: K,
    fieldValue: CommercialPaperInput[K]
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
              <Input id="name" placeholder="Microsoft CP 90-Day 5.2% 2026" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="MSFTCP26" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="Microsoft Corporation" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
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
        <CardHeader><CardTitle className="text-base">Commercial Paper Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpType">CP Type *</Label>
              <Select value={value.cpType} onValueChange={(v) => updateField('cpType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="secured">Secured</SelectItem>
                  <SelectItem value="unsecured">Unsecured</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditRating">Credit Rating *</Label>
              <Input id="creditRating" placeholder="A-1+" value={value.creditRating || ''} onChange={(e) => updateField('creditRating', e.target.value)} />
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
              <Input id="parValue" type="number" step="0.01" placeholder="100000" value={value.parValue || ''} onChange={(e) => updateField('parValue', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountRate">Discount Rate (%) *</Label>
              <Input id="discountRate" type="number" step="0.01" placeholder="5.20" value={value.discountRate || ''} onChange={(e) => updateField('discountRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maturityDays">Maturity Days *</Label>
              <Input id="maturityDays" type="number" placeholder="90" value={value.maturityDays || ''} onChange={(e) => updateField('maturityDays', parseInt(e.target.value))} />
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
              <Input id="valuationMethod" value="discount" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPrice">Current Price *</Label>
              <Input id="currentPrice" type="number" step="0.01" placeholder="98.71" value={value.currentPrice || ''} onChange={(e) => updateField('currentPrice', parseFloat(e.target.value))} />
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
              <Input id="settlementDays" type="number" placeholder="0" value={value.settlementDays || 0} onChange={(e) => updateField('settlementDays', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault *</Label>
              <Input id="redemptionVault" placeholder="Vault address" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
