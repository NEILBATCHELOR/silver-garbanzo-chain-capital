/**
 * Invoice Receivable Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { InvoiceReceivableInput } from '@/services/tokens/metadata';

interface InvoiceReceivableFormProps {
  value: Partial<InvoiceReceivableInput>;
  onChange: (value: Partial<InvoiceReceivableInput>) => void;
}

export function InvoiceReceivableForm({ value, onChange }: InvoiceReceivableFormProps) {
  const updateField = <K extends keyof InvoiceReceivableInput>(
    field: K,
    fieldValue: InvoiceReceivableInput[K]
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
              <Input id="name" placeholder="Medicaid Invoice Pool Series 2026-A" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="MIP26-A" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Pool Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receivableType">Receivable Type *</Label>
              <Input id="receivableType" placeholder="medicaid" value={value.receivableType || ''} onChange={(e) => updateField('receivableType', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceCount">Invoice Count *</Label>
              <Input id="invoiceCount" type="number" step="0.01" placeholder="247" value={value.invoiceCount || ''} onChange={(e) => updateField('invoiceCount', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalFaceValue">Total Face Value *</Label>
              <Input id="totalFaceValue" type="number" step="0.01" placeholder="5000000" value={value.totalFaceValue || ''} onChange={(e) => updateField('totalFaceValue', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountRate">Discount Rate (%) *</Label>
              <Input id="discountRate" type="number" step="0.01" placeholder="13.00" value={value.discountRate || ''} onChange={(e) => updateField('discountRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input id="purchasePrice" type="number" step="0.01" placeholder="4350000" value={value.purchasePrice || ''} onChange={(e) => updateField('purchasePrice', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Payer Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryPayer">Primary Payer *</Label>
              <Input id="primaryPayer" placeholder="State Medicaid" value={value.primaryPayer || ''} onChange={(e) => updateField('primaryPayer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payerState">Payer State</Label>
              <Input id="payerState" placeholder="California" value={value.payerState || ''} onChange={(e) => updateField('payerState', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payerCreditRating">Payer Credit Rating</Label>
              <Input id="payerCreditRating" placeholder="AA+" value={value.payerCreditRating || ''} onChange={(e) => updateField('payerCreditRating', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultHistory">Default History (%)</Label>
              <Input id="defaultHistory" type="number" step="0.01" placeholder="0.00" value={value.defaultHistory || ''} onChange={(e) => updateField('defaultHistory', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Receivables Stats</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightedAvgMaturity">Weighted Avg Maturity (days) *</Label>
              <Input id="weightedAvgMaturity" type="number" step="0.01" placeholder="45" value={value.weightedAvgMaturity || ''} onChange={(e) => updateField('weightedAvgMaturity', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oldestInvoice">Oldest Invoice (days)</Label>
              <Input id="oldestInvoice" type="number" step="0.01" placeholder="90" value={value.oldestInvoice || ''} onChange={(e) => updateField('oldestInvoice', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newestInvoice">Newest Invoice (days)</Label>
              <Input id="newestInvoice" type="number" step="0.01" placeholder="15" value={value.newestInvoice || ''} onChange={(e) => updateField('newestInvoice', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgInvoiceSize">Avg Invoice Size</Label>
              <Input id="avgInvoiceSize" type="number" step="0.01" placeholder="20243" value={value.avgInvoiceSize || ''} onChange={(e) => updateField('avgInvoiceSize', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedRecovery">Expected Recovery (%) *</Label>
              <Input id="expectedRecovery" type="number" step="0.01" placeholder="98.5" value={value.expectedRecovery || ''} onChange={(e) => updateField('expectedRecovery', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedLoss">Expected Loss (%) *</Label>
              <Input id="expectedLoss" type="number" step="0.01" placeholder="1.5" value={value.expectedLoss || ''} onChange={(e) => updateField('expectedLoss', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="historicRecovery">Historic Recovery (%)</Label>
              <Input id="historicRecovery" type="number" step="0.01" placeholder="99.2" value={value.historicRecovery || ''} onChange={(e) => updateField('historicRecovery', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgCollectionDays">Avg Collection (days)</Label>
              <Input id="avgCollectionDays" type="number" step="0.01" placeholder="42" value={value.avgCollectionDays || ''} onChange={(e) => updateField('avgCollectionDays', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Returns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annualizedYield">Annualized Yield (%) *</Label>
              <Input id="annualizedYield" type="number" step="0.01" placeholder="13.0" value={value.annualizedYield || ''} onChange={(e) => updateField('annualizedYield', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="irr">IRR (%)</Label>
              <Input id="irr" type="number" step="0.01" placeholder="13.8" value={value.irr || ''} onChange={(e) => updateField('irr', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paybackPeriod">Payback Period (years)</Label>
              <Input id="paybackPeriod" type="number" step="0.01" placeholder="0.35" value={value.paybackPeriod || ''} onChange={(e) => updateField('paybackPeriod', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Servicing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servicer">Servicer *</Label>
              <Input id="servicer" placeholder="Healthcare Finance Servicing" value={value.servicer || ''} onChange={(e) => updateField('servicer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicingFee">Servicing Fee (%)</Label>
              <Input id="servicingFee" type="number" step="0.01" placeholder="2.00" value={value.servicingFee || ''} onChange={(e) => updateField('servicingFee', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collectionMethod">Collection Method</Label>
              <Input id="collectionMethod" placeholder="electronic_remittance" value={value.collectionMethod || ''} onChange={(e) => updateField('collectionMethod', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}