/**
 * Mutual Fund Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MutualFundInput } from '@/services/tokens/metadata';

interface MutualFundFormProps {
  value: Partial<MutualFundInput>;
  onChange: (value: Partial<MutualFundInput>) => void;
}

export function MutualFundForm({ value, onChange }: MutualFundFormProps) {
  const updateField = <K extends keyof MutualFundInput>(
    field: K,
    fieldValue: MutualFundInput[K]
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
              <Input id="name" placeholder="Global Equity Fund" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="GEF" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Label htmlFor="fundType">Fund Type *</Label>
              <Select value={value.fundType} onValueChange={(v) => updateField('fundType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_end">Open-End</SelectItem>                <SelectItem value="closed_end">Closed-End</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input id="category" placeholder="global_equity" value={value.category || ''} onChange={(e) => updateField('category', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="fundManager">Fund Manager *</Label>
              <Input id="fundManager" placeholder="Chain Capital Asset Management" value={value.fundManager || ''} onChange={(e) => updateField('fundManager', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="inceptionDate">Inception Date *</Label>
              <Input id="inceptionDate" type="date" value={value.inceptionDate || ''} onChange={(e) => updateField('inceptionDate', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="fiscalYearEnd">Fiscal Year End *</Label>
              <Input id="fiscalYearEnd" placeholder="12-31" value={value.fiscalYearEnd || ''} onChange={(e) => updateField('fiscalYearEnd', e.target.value)} />
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
                  <SelectItem value="nav">NAV</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="navFrequency">NAV Frequency *</Label>
              <Select value={value.navFrequency} onValueChange={(v) => updateField('navFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>                <SelectItem value="weekly">Weekly</SelectItem>                <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="navCalculationTime">NAV Calculation Time *</Label>
              <Input id="navCalculationTime" placeholder="16:00EST" value={value.navCalculationTime || ''} onChange={(e) => updateField('navCalculationTime', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="125.43" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="previousNav">Previous NAV</Label>
              <Input id="previousNav" type="number" step="0.01" placeholder="124.87" value={value.previousNav || ''} onChange={(e) => updateField('previousNav', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Fees</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee (%) *</Label>
              <Input id="managementFee" type="number" step="0.01" placeholder="0.75" value={value.managementFee || ''} onChange={(e) => updateField('managementFee', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="performanceFee">Performance Fee (%)</Label>
              <Input id="performanceFee" type="number" step="0.01" placeholder="20" value={value.performanceFee || ''} onChange={(e) => updateField('performanceFee', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="entranceFee">Entrance Fee (%)</Label>
              <Input id="entranceFee" type="number" step="0.01" placeholder="0.00" value={value.entranceFee || ''} onChange={(e) => updateField('entranceFee', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="exitFee">Exit Fee (%)</Label>
              <Input id="exitFee" type="number" step="0.01" placeholder="0.00" value={value.exitFee || ''} onChange={(e) => updateField('exitFee', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="hurdleRate">Hurdle Rate (%)</Label>
              <Input id="hurdleRate" type="number" step="0.01" placeholder="5.00" value={value.hurdleRate || ''} onChange={(e) => updateField('hurdleRate', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aum">AUM *</Label>
              <Input id="aum" type="number" step="0.01" placeholder="50000000" value={value.aum || ''} onChange={(e) => updateField('aum', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="sharesOutstanding">Shares Outstanding *</Label>
              <Input id="sharesOutstanding" type="number" step="0.01" placeholder="398754" value={value.sharesOutstanding || ''} onChange={(e) => updateField('sharesOutstanding', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="portfolioHoldings">Portfolio Holdings</Label>
              <Input id="portfolioHoldings" type="number" step="0.01" placeholder="127" value={value.portfolioHoldings || ''} onChange={(e) => updateField('portfolioHoldings', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Subscriptions/Redemptions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionFrequency">Subscription Frequency *</Label>
              <Select value={value.subscriptionFrequency} onValueChange={(v) => updateField('subscriptionFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>                <SelectItem value="weekly">Weekly</SelectItem>                <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionFrequency">Redemption Frequency *</Label>
              <Select value={value.redemptionFrequency} onValueChange={(v) => updateField('redemptionFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>                <SelectItem value="weekly">Weekly</SelectItem>                <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="minInvestment">Min Investment</Label>
              <Input id="minInvestment" type="number" step="0.01" placeholder="1000" value={value.minInvestment || ''} onChange={(e) => updateField('minInvestment', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionNoticeDays">Redemption Notice (days)</Label>
              <Input id="redemptionNoticeDays" type="number" step="0.01" placeholder="3" value={value.redemptionNoticeDays || ''} onChange={(e) => updateField('redemptionNoticeDays', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}