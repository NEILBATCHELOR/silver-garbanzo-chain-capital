/**
 * Credit-Linked Note Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreditLinkedNoteInput } from '@/services/tokens/metadata';

interface CreditLinkedNoteFormProps {
  value: Partial<CreditLinkedNoteInput>;
  onChange: (value: Partial<CreditLinkedNoteInput>) => void;
}

export function CreditLinkedNoteForm({ value, onChange }: CreditLinkedNoteFormProps) {
  const updateField = <K extends keyof CreditLinkedNoteInput>(
    field: K,
    fieldValue: CreditLinkedNoteInput[K]
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
              <Input id="name" placeholder="CLN Reference Entity XYZ 2028" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="CLNXYZ28" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input id="maturityDate" type="date" value={value.maturityDate || ''} onChange={(e) => updateField('maturityDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">CLN Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clnType">CLN Type *</Label>
              <Select value={value.clnType} onValueChange={(v) => updateField('clnType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_name">Single Name</SelectItem>
                  <SelectItem value="basket">Basket</SelectItem>
                  <SelectItem value="index">Index</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditRating">Credit Rating *</Label>
              <Input id="creditRating" placeholder="BBB" value={value.creditRating || ''} onChange={(e) => updateField('creditRating', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Reference Entity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceEntity">Reference Entity *</Label>
              <Input id="referenceEntity" placeholder="XYZ Corporation" value={value.referenceEntity || ''} onChange={(e) => updateField('referenceEntity', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceEntityLEI">Reference Entity LEI</Label>
              <Input id="referenceEntityLEI" placeholder="LEI123456789" value={value.referenceEntityLEI || ''} onChange={(e) => updateField('referenceEntityLEI', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceObligation">Reference Obligation</Label>
            <Input id="referenceObligation" placeholder="XYZ 5% 2030" value={value.referenceObligation || ''} onChange={(e) => updateField('referenceObligation', e.target.value)} />
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
              <Input id="couponRate" type="number" step="0.01" placeholder="7.50" value={value.couponRate || ''} onChange={(e) => updateField('couponRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couponFrequency">Coupon Frequency *</Label>
              <Select value={value.couponFrequency} onValueChange={(v) => updateField('couponFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Credit Event Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditEvents">Credit Events *</Label>
              <Input id="creditEvents" placeholder="bankruptcy,failure_to_pay,restructuring" value={value.creditEvents || ''} onChange={(e) => updateField('creditEvents', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryRate">Recovery Rate (%) *</Label>
              <Input id="recoveryRate" type="number" step="0.01" placeholder="40" value={value.recoveryRate || ''} onChange={(e) => updateField('recoveryRate', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settlementMethod">Settlement Method *</Label>
              <Select value={value.settlementMethod} onValueChange={(v) => updateField('settlementMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="isdaDefinitions">ISDA Definitions</Label>
              <Input id="isdaDefinitions" placeholder="2014" value={value.isdaDefinitions || ''} onChange={(e) => updateField('isdaDefinitions', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle & Settlement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chainlink">Chainlink</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditEventOracle">Credit Event Oracle</Label>
              <Input id="creditEventOracle" placeholder="Oracle address" value={value.creditEventOracle || ''} onChange={(e) => updateField('creditEventOracle', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault *</Label>
              <Input id="redemptionVault" placeholder="Vault address" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlementDays">Settlement Days *</Label>
              <Input id="settlementDays" type="number" placeholder="5" value={value.settlementDays || ''} onChange={(e) => updateField('settlementDays', parseInt(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
