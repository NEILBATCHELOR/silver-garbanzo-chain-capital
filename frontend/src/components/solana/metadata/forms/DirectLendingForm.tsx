/**
 * Direct Lending / Credit Fund Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { DirectLendingInput } from '@/services/tokens/metadata';

interface DirectLendingFormProps {
  value: Partial<DirectLendingInput>;
  onChange: (value: Partial<DirectLendingInput>) => void;
}

export function DirectLendingForm({ value, onChange }: DirectLendingFormProps) {
  const updateField = <K extends keyof DirectLendingInput>(
    field: K,
    fieldValue: DirectLendingInput[K]
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
              <Input id="name" placeholder="Senior Secured Loan SME Portfolio" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="SSL-SME" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Fund Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debtType">Debt Type *</Label>
              <Select value={value.debtType} onValueChange={(v) => updateField('debtType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="senior_secured">Senior Secured</SelectItem>                <SelectItem value="mezzanine">Mezzanine</SelectItem>                <SelectItem value="unitranche">Unitranche</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="borrowerType">Borrower Type *</Label>
              <Select value={value.borrowerType} onValueChange={(v) => updateField('borrowerType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sme">SME</SelectItem>                <SelectItem value="corporate">Corporate</SelectItem>                <SelectItem value="real_estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanCount">Loan Count *</Label>
              <Input id="loanCount" type="number" step="0.01" placeholder="47" value={value.loanCount || ''} onChange={(e) => updateField('loanCount', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="totalCommitment">Total Commitment *</Label>
              <Input id="totalCommitment" type="number" step="0.01" placeholder="25000000" value={value.totalCommitment || ''} onChange={(e) => updateField('totalCommitment', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="outstandingPrincipal">Outstanding Principal *</Label>
              <Input id="outstandingPrincipal" type="number" step="0.01" placeholder="23500000" value={value.outstandingPrincipal || ''} onChange={(e) => updateField('outstandingPrincipal', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="weightedAvgMaturity">Weighted Avg Maturity (years) *</Label>
              <Input id="weightedAvgMaturity" type="number" step="0.01" placeholder="3.2" value={value.weightedAvgMaturity || ''} onChange={(e) => updateField('weightedAvgMaturity', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate *</Label>
              <Input id="interestRate" placeholder="SOFR+550" value={value.interestRate || ''} onChange={(e) => updateField('interestRate', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentSofr">Current SOFR (%)</Label>
              <Input id="currentSofr" type="number" step="0.01" placeholder="5.30" value={value.currentSofr || ''} onChange={(e) => updateField('currentSofr', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="allInRate">All-In Rate (%) *</Label>
              <Input id="allInRate" type="number" step="0.01" placeholder="10.80" value={value.allInRate || ''} onChange={(e) => updateField('allInRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="paymentFrequency">Payment Frequency *</Label>
              <Select value={value.paymentFrequency} onValueChange={(v) => updateField('paymentFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Credit Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightedAvgLtv">Weighted Avg LTV (%)</Label>
              <Input id="weightedAvgLtv" type="number" step="0.01" placeholder="65" value={value.weightedAvgLtv || ''} onChange={(e) => updateField('weightedAvgLtv', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="defaultRate">Default Rate (%)</Label>
              <Input id="defaultRate" type="number" step="0.01" placeholder="1.2" value={value.defaultRate || ''} onChange={(e) => updateField('defaultRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="recoveryRate">Recovery Rate (%)</Label>
              <Input id="recoveryRate" type="number" step="0.01" placeholder="85" value={value.recoveryRate || ''} onChange={(e) => updateField('recoveryRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="creditRatingAvg">Avg Credit Rating</Label>
              <Input id="creditRatingAvg" placeholder="B+" value={value.creditRatingAvg || ''} onChange={(e) => updateField('creditRatingAvg', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Collateral</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collateralType">Collateral Type *</Label>
              <Input id="collateralType" placeholder="business_assets" value={value.collateralType || ''} onChange={(e) => updateField('collateralType', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="collateralCoverage">Collateral Coverage (%) *</Label>
              <Input id="collateralCoverage" type="number" step="0.01" placeholder="150" value={value.collateralCoverage || ''} onChange={(e) => updateField('collateralCoverage', parseFloat(e.target.value))} />
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
                  <SelectItem value="model_based">Model Based</SelectItem>                <SelectItem value="mark_to_market">Mark to Market</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV (% of par) *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="98.50" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="yieldToMaturity">Yield to Maturity (%)</Label>
              <Input id="yieldToMaturity" type="number" step="0.01" placeholder="11.2" value={value.yieldToMaturity || ''} onChange={(e) => updateField('yieldToMaturity', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionFrequency">Distribution Frequency *</Label>
              <Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastDistribution">Last Distribution Date</Label>
              <Input id="lastDistribution" type="date" value={value.lastDistribution || ''} onChange={(e) => updateField('lastDistribution', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="annualizedYield">Annualized Yield (%) *</Label>
              <Input id="annualizedYield" type="number" step="0.01" placeholder="10.5" value={value.annualizedYield || ''} onChange={(e) => updateField('annualizedYield', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}