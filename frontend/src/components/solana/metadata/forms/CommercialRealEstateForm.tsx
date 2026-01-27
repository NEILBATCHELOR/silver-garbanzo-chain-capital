/**
 * Commercial Real Estate Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CommercialRealEstateInput } from '@/services/tokens/metadata';

interface CommercialRealEstateFormProps {
  value: Partial<CommercialRealEstateInput>;
  onChange: (value: Partial<CommercialRealEstateInput>) => void;
}

export function CommercialRealEstateForm({ value, onChange }: CommercialRealEstateFormProps) {
  const updateField = <K extends keyof CommercialRealEstateInput>(
    field: K,
    fieldValue: CommercialRealEstateInput[K]
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
              <Input id="name" placeholder="Manhattan Office Tower - Series A" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="MHTO-A" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Property Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select value={value.propertyType} onValueChange={(v) => updateField('propertyType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>\n                <SelectItem value="retail">Retail</SelectItem>\n                <SelectItem value="industrial">Industrial</SelectItem>\n                <SelectItem value="multifamily">Multifamily</SelectItem>\n                <SelectItem value="hotel">Hotel</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="propertyClass">Property Class *</Label>
              <Select value={value.propertyClass} onValueChange={(v) => updateField('propertyClass', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="class_a">Class A</SelectItem>\n                <SelectItem value="class_b">Class B</SelectItem>\n                <SelectItem value="class_c">Class C</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name *</Label>
              <Input id="propertyName" placeholder="One Madison Square" value={value.propertyName || ''} onChange={(e) => updateField('propertyName', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" placeholder="23 Madison Ave, New York, NY" value={value.address || ''} onChange={(e) => updateField('address', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="squareFeet">Square Feet *</Label>
              <Input id="squareFeet" type="number" step="0.01" placeholder="850000" value={value.squareFeet || ''} onChange={(e) => updateField('squareFeet', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="floors">Floors</Label>
              <Input id="floors" type="number" step="0.01" placeholder="47" value={value.floors || ''} onChange={(e) => updateField('floors', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Year Built *</Label>
              <Input id="yearBuilt" placeholder="2018" value={value.yearBuilt || ''} onChange={(e) => updateField('yearBuilt', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="yearRenovated">Year Renovated</Label>
              <Input id="yearRenovated" placeholder="2024" value={value.yearRenovated || ''} onChange={(e) => updateField('yearRenovated', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Financial Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input id="purchasePrice" type="number" step="0.01" placeholder="425000000" value={value.purchasePrice || ''} onChange={(e) => updateField('purchasePrice', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value *</Label>
              <Input id="currentValue" type="number" step="0.01" placeholder="450000000" value={value.currentValue || ''} onChange={(e) => updateField('currentValue', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="ltv">LTV (%) *</Label>
              <Input id="ltv" type="number" step="0.01" placeholder="60" value={value.ltv || ''} onChange={(e) => updateField('ltv', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="debt">Debt *</Label>
              <Input id="debt" type="number" step="0.01" placeholder="270000000" value={value.debt || ''} onChange={(e) => updateField('debt', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="equity">Equity *</Label>
              <Input id="equity" type="number" step="0.01" placeholder="180000000" value={value.equity || ''} onChange={(e) => updateField('equity', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Operating Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occupancyRate">Occupancy Rate (%) *</Label>
              <Input id="occupancyRate" type="number" step="0.01" placeholder="94" value={value.occupancyRate || ''} onChange={(e) => updateField('occupancyRate', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="tenantCount">Tenant Count</Label>
              <Input id="tenantCount" type="number" step="0.01" placeholder="32" value={value.tenantCount || ''} onChange={(e) => updateField('tenantCount', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="avgLeaseYears">Avg Lease (years)</Label>
              <Input id="avgLeaseYears" type="number" step="0.01" placeholder="7.2" value={value.avgLeaseYears || ''} onChange={(e) => updateField('avgLeaseYears', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="annualNoi">Annual NOI *</Label>
              <Input id="annualNoi" type="number" step="0.01" placeholder="32000000" value={value.annualNoi || ''} onChange={(e) => updateField('annualNoi', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="capRate">Cap Rate (%) *</Label>
              <Input id="capRate" type="number" step="0.01" placeholder="7.1" value={value.capRate || ''} onChange={(e) => updateField('capRate', parseFloat(e.target.value))} />
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
                  <SelectItem value="cap_rate">Cap Rate</SelectItem>\n                <SelectItem value="dcf">DCF</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastAppraisalDate">Last Appraisal Date *</Label>
              <Input id="lastAppraisalDate" type="date" value={value.lastAppraisalDate || ''} onChange={(e) => updateField('lastAppraisalDate', e.target.value)} />
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
                  <SelectItem value="monthly">Monthly</SelectItem>\n                <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="annualizedYield">Annualized Yield (%) *</Label>
              <Input id="annualizedYield" type="number" step="0.01" placeholder="6.5" value={value.annualizedYield || ''} onChange={(e) => updateField('annualizedYield', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastDistribution">Last Distribution Date</Label>
              <Input id="lastDistribution" type="date" value={value.lastDistribution || ''} onChange={(e) => updateField('lastDistribution', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="distributionPerToken">Distribution Per Token</Label>
              <Input id="distributionPerToken" type="number" step="0.01" placeholder="1.625" value={value.distributionPerToken || ''} onChange={(e) => updateField('distributionPerToken', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}