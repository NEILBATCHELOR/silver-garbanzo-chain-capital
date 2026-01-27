/**
 * Venture Capital Fund Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VentureCapitalFundInput } from '@/services/tokens/metadata';

interface VentureCapitalFundFormProps {
  value: Partial<VentureCapitalFundInput>;
  onChange: (value: Partial<VentureCapitalFundInput>) => void;
}

export function VentureCapitalFundForm({ value, onChange }: VentureCapitalFundFormProps) {
  const updateField = <K extends keyof VentureCapitalFundInput>(
    field: K,
    fieldValue: VentureCapitalFundInput[K]
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
              <Input id="name" placeholder="VC Fund II Series 2026 Class A" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="VCFII-A" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="VC Fund II LP" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input id="jurisdiction" placeholder="DE" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fund Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundManager">Fund Manager *</Label>
              <Input id="fundManager" placeholder="Chain Ventures Management" value={value.fundManager || ''} onChange={(e) => updateField('fundManager', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage *</Label>
              <Select value={value.stage} onValueChange={(v) => updateField('stage', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="early_stage">Early Stage</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="late_stage">Late Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vintageYear">Vintage Year *</Label>
              <Input id="vintageYear" placeholder="2026" value={value.vintageYear || ''} onChange={(e) => updateField('vintageYear', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector *</Label>
              <Input id="sector" placeholder="technology" value={value.sector || ''} onChange={(e) => updateField('sector', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="geography">Geography *</Label>
            <Input id="geography" placeholder="north_america" value={value.geography || ''} onChange={(e) => updateField('geography', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fund Size & Capital</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundSize">Fund Size *</Label>
              <Input id="fundSize" type="number" placeholder="100000000" value={value.fundSize || ''} onChange={(e) => updateField('fundSize', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capitalCalled">Capital Called *</Label>
              <Input id="capitalCalled" type="number" placeholder="25000000" value={value.capitalCalled || ''} onChange={(e) => updateField('capitalCalled', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributedReturns">Distributed Returns *</Label>
              <Input id="distributedReturns" type="number" placeholder="0" value={value.distributedReturns || ''} onChange={(e) => updateField('distributedReturns', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkSize">Check Size</Label>
              <Input id="checkSize" placeholder="2000000-10000000" value={value.checkSize || ''} onChange={(e) => updateField('checkSize', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCompanies">Target Companies</Label>
              <Input id="targetCompanies" placeholder="15-20" value={value.targetCompanies || ''} onChange={(e) => updateField('targetCompanies', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fees & Carry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee (%) *</Label>
              <Input id="managementFee" type="number" step="0.01" placeholder="2.00" value={value.managementFee || ''} onChange={(e) => updateField('managementFee', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carriedInterest">Carried Interest (%) *</Label>
              <Input id="carriedInterest" type="number" step="0.01" placeholder="20" value={value.carriedInterest || ''} onChange={(e) => updateField('carriedInterest', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hurdleRate">Hurdle Rate (%) *</Label>
              <Input id="hurdleRate" type="number" step="0.01" placeholder="8.00" value={value.hurdleRate || ''} onChange={(e) => updateField('hurdleRate', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpCommitment">GP Commitment (%)</Label>
              <Input id="gpCommitment" type="number" step="0.01" placeholder="1.00" value={value.gpCommitment || ''} onChange={(e) => updateField('gpCommitment', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Term & Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundLife">Fund Life (years) *</Label>
              <Input id="fundLife" type="number" placeholder="10" value={value.fundLife || ''} onChange={(e) => updateField('fundLife', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investmentPeriod">Investment Period (years) *</Label>
              <Input id="investmentPeriod" type="number" placeholder="5" value={value.investmentPeriod || ''} onChange={(e) => updateField('investmentPeriod', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredReturn">Preferred Return (%)</Label>
              <Input id="preferredReturn" type="number" step="0.01" placeholder="8.00" value={value.preferredReturn || ''} onChange={(e) => updateField('preferredReturn', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inceptionDate">Inception Date *</Label>
              <Input id="inceptionDate" type="date" value={value.inceptionDate || ''} onChange={(e) => updateField('inceptionDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedExit">Expected Exit Date</Label>
              <Input id="expectedExit" type="date" value={value.expectedExit || ''} onChange={(e) => updateField('expectedExit', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valuation & Performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuationMethod">Valuation Method *</Label>
              <Input id="valuationMethod" value="fair_market_value" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastValuationDate">Last Valuation Date *</Label>
              <Input id="lastValuationDate" type="date" value={value.lastValuationDate || ''} onChange={(e) => updateField('lastValuationDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="1.05" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="irr">IRR (%)</Label>
              <Input id="irr" type="number" step="0.01" placeholder="18.5" value={value.irr || ''} onChange={(e) => updateField('irr', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moic">MOIC</Label>
              <Input id="moic" type="number" step="0.01" placeholder="1.05" value={value.moic || ''} onChange={(e) => updateField('moic', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="distributionFrequency">Distribution Frequency *</Label>
            <Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="as_realized">As Realized</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lpAgreementUri">LP Agreement URI</Label>
              <Input id="lpAgreementUri" placeholder="ar://..." value={value.lpAgreementUri || ''} onChange={(e) => updateField('lpAgreementUri', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionDocsUri">Subscription Docs URI</Label>
              <Input id="subscriptionDocsUri" placeholder="ar://..." value={value.subscriptionDocsUri || ''} onChange={(e) => updateField('subscriptionDocsUri', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
