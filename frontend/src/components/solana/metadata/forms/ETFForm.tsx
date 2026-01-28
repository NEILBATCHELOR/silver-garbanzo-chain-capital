/**
 * ETF Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ETFInput } from '@/services/tokens/metadata';

interface ETFFormProps {
  value: Partial<ETFInput>;
  onChange: (value: Partial<ETFInput>) => void;
}

export function ETFForm({ value, onChange }: ETFFormProps) {
  const updateField = <K extends keyof ETFInput>(
    field: K,
    fieldValue: ETFInput[K]
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
              <Input id="name" placeholder="S&P 500 ETF" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="SPY" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">ETF Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etfType">ETF Type *</Label>
              <Select value={value.etfType} onValueChange={(v) => updateField('etfType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity</SelectItem>                <SelectItem value="fixed_income">Fixed Income</SelectItem>                <SelectItem value="commodity">Commodity</SelectItem>                <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="indexTracked">Index Tracked</Label>
              <Input id="indexTracked" placeholder="S&P 500" value={value.indexTracked || ''} onChange={(e) => updateField('indexTracked', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange *</Label>
              <Input id="exchange" placeholder="NYSE" value={value.exchange || ''} onChange={(e) => updateField('exchange', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="primaryMarket">Primary Market *</Label>
              <Input id="primaryMarket" placeholder="authorized_participants" value={value.primaryMarket || ''} onChange={(e) => updateField('primaryMarket', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="creationUnit">Creation Unit *</Label>
              <Input id="creationUnit" type="number" step="0.01" placeholder="50000" value={value.creationUnit || ''} onChange={(e) => updateField('creationUnit', parseFloat(e.target.value))} />
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
                  <SelectItem value="intraday">Intraday</SelectItem>                <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="iNavProvider">iNAV Provider</Label>
              <Input id="iNavProvider" placeholder="NYSE" value={value.iNavProvider || ''} onChange={(e) => updateField('iNavProvider', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="445.23" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="marketPrice">Market Price</Label>
              <Input id="marketPrice" type="number" step="0.01" placeholder="445.28" value={value.marketPrice || ''} onChange={(e) => updateField('marketPrice', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="premiumDiscount">Premium/Discount (%)</Label>
              <Input id="premiumDiscount" type="number" step="0.01" placeholder="0.01" value={value.premiumDiscount || ''} onChange={(e) => updateField('premiumDiscount', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Fees</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expenseRatio">Expense Ratio (%) *</Label>
              <Input id="expenseRatio" type="number" step="0.01" placeholder="0.09" value={value.expenseRatio || ''} onChange={(e) => updateField('expenseRatio', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee (%) *</Label>
              <Input id="managementFee" type="number" step="0.01" placeholder="0.09" value={value.managementFee || ''} onChange={(e) => updateField('managementFee', parseFloat(e.target.value))} />
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
              <Input id="aum" type="number" step="0.01" placeholder="420000000000" value={value.aum || ''} onChange={(e) => updateField('aum', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="holdingsCount">Holdings Count *</Label>
              <Input id="holdingsCount" type="number" step="0.01" placeholder="503" value={value.holdingsCount || ''} onChange={(e) => updateField('holdingsCount', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="topHoldingPercent">Top Holding (%)</Label>
              <Input id="topHoldingPercent" type="number" step="0.01" placeholder="7.2" value={value.topHoldingPercent || ''} onChange={(e) => updateField('topHoldingPercent', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}