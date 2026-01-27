/**
 * REIT (Real Estate Investment Trust) Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { REITInput } from '@/services/tokens/metadata';

interface REITFormProps {
  value: Partial<REITInput>;
  onChange: (value: Partial<REITInput>) => void;
}

export function REITForm({ value, onChange }: REITFormProps) {
  const updateField = <K extends keyof REITInput>(
    field: K,
    fieldValue: REITInput[K]
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
              <Input id="name" placeholder="Industrial REIT Token" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="INDST" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="Industrial Properties REIT" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input id="jurisdiction" placeholder="MD" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">REIT Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reitType">REIT Type *</Label>
              <Select value={value.reitType} onValueChange={(v) => updateField('reitType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity REIT</SelectItem>
                  <SelectItem value="mortgage">Mortgage REIT</SelectItem>
                  <SelectItem value="hybrid">Hybrid REIT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector *</Label>
              <Input id="sector" placeholder="industrial" value={value.sector || ''} onChange={(e) => updateField('sector', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="geography">Geography *</Label>
            <Input id="geography" placeholder="US_nationwide" value={value.geography || ''} onChange={(e) => updateField('geography', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>REIT Qualified *</span>
              <Switch checked={value.reitQualified || false} onCheckedChange={(checked) => updateField('reitQualified', checked)} />
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Portfolio Composition</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyCount">Property Count *</Label>
              <Input id="propertyCount" type="number" placeholder="127" value={value.propertyCount || ''} onChange={(e) => updateField('propertyCount', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSquareFeet">Total Square Feet</Label>
              <Input id="totalSquareFeet" type="number" placeholder="25000000" value={value.totalSquareFeet || ''} onChange={(e) => updateField('totalSquareFeet', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgLeaseTerm">Avg Lease Term (years)</Label>
              <Input id="avgLeaseTerm" type="number" step="0.1" placeholder="8.2" value={value.avgLeaseTerm || ''} onChange={(e) => updateField('avgLeaseTerm', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyTypes">Property Types</Label>
            <Input id="propertyTypes" placeholder="warehouse:60%,distribution:30%,manufacturing:10%" value={value.propertyTypes || ''} onChange={(e) => updateField('propertyTypes', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financial Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aum">AUM *</Label>
              <Input id="aum" type="number" placeholder="5200000000" value={value.aum || ''} onChange={(e) => updateField('aum', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDebt">Total Debt *</Label>
              <Input id="totalDebt" type="number" placeholder="2100000000" value={value.totalDebt || ''} onChange={(e) => updateField('totalDebt', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtToEquity">Debt to Equity *</Label>
              <Input id="debtToEquity" type="number" step="0.01" placeholder="0.68" value={value.debtToEquity || ''} onChange={(e) => updateField('debtToEquity', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occupancyRate">Occupancy Rate (%) *</Label>
              <Input id="occupancyRate" type="number" step="0.1" placeholder="96.5" value={value.occupancyRate || ''} onChange={(e) => updateField('occupancyRate', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">FFO & AFFO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ffo">FFO (annual) *</Label>
              <Input id="ffo" type="number" placeholder="245000000" value={value.ffo || ''} onChange={(e) => updateField('ffo', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affo">AFFO (annual) *</Label>
              <Input id="affo" type="number" placeholder="230000000" value={value.affo || ''} onChange={(e) => updateField('affo', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ffoPerShare">FFO Per Share *</Label>
              <Input id="ffoPerShare" type="number" step="0.01" placeholder="4.20" value={value.ffoPerShare || ''} onChange={(e) => updateField('ffoPerShare', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutRatio">Payout Ratio (%) *</Label>
              <Input id="payoutRatio" type="number" step="0.01" placeholder="75" value={value.payoutRatio || ''} onChange={(e) => updateField('payoutRatio', parseFloat(e.target.value))} />
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
              <Input id="valuationMethod" value="nav" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="42.50" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceToNav">Price to NAV</Label>
              <Input id="priceToNav" type="number" step="0.01" placeholder="1.05" value={value.priceToNav || ''} onChange={(e) => updateField('priceToNav', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionFrequency">Distribution Frequency *</Label>
              <Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dividendYield">Dividend Yield (%) *</Label>
              <Input id="dividendYield" type="number" step="0.01" placeholder="5.2" value={value.dividendYield || ''} onChange={(e) => updateField('dividendYield', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualizedDividend">Annualized Dividend *</Label>
              <Input id="annualizedDividend" type="number" step="0.01" placeholder="2.21" value={value.annualizedDividend || ''} onChange={(e) => updateField('annualizedDividend', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastDistribution">Last Distribution Date</Label>
            <Input id="lastDistribution" type="date" value={value.lastDistribution || ''} onChange={(e) => updateField('lastDistribution', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
