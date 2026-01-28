/**
 * Common Stock Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CommonStockInput } from '@/services/tokens/metadata';

interface CommonStockFormProps {
  value: Partial<CommonStockInput>;
  onChange: (value: Partial<CommonStockInput>) => void;
}

export function CommonStockForm({ value, onChange }: CommonStockFormProps) {
  const updateField = <K extends keyof CommonStockInput>(
    field: K,
    fieldValue: CommonStockInput[K]
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
              <Input id="name" placeholder="Apple Inc Common Stock" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="AAPL" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Label htmlFor="maturityDate">Maturity Date</Label>
              <Input id="maturityDate" type="date" value={value.maturityDate || ''} onChange={(e) => updateField('maturityDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" placeholder="Apple Inc" value={value.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="securityType">Security Type *</Label>
              <Select value={value.securityType} onValueChange={(v) => updateField('securityType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>                <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker Symbol</Label>
              <Input id="ticker" placeholder="AAPL" value={value.ticker || ''} onChange={(e) => updateField('ticker', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="cusip">CUSIP</Label>
              <Input id="cusip" placeholder="037833100" value={value.cusip || ''} onChange={(e) => updateField('cusip', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="isin">ISIN</Label>
              <Input id="isin" placeholder="US0378331005" value={value.isin || ''} onChange={(e) => updateField('isin', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Input id="exchange" placeholder="NASDAQ" value={value.exchange || ''} onChange={(e) => updateField('exchange', e.target.value)} />
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
              <Select value={value.valuationMethod} onValueChange={(v) => updateField('valuationMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_to_market">Mark to Market</SelectItem>                <SelectItem value="dcf">DCF</SelectItem>                <SelectItem value="comparable">Comparable Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth</SelectItem>                <SelectItem value="chainlink">Chainlink</SelectItem>                <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="oracleAddress">Oracle Address</Label>
              <Input id="oracleAddress" placeholder="Oracle address if applicable" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Dividends</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dividendYield">Dividend Yield (%)</Label>
              <Input id="dividendYield" type="number" step="0.01" placeholder="0.50" value={value.dividendYield || ''} onChange={(e) => updateField('dividendYield', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="dividendFrequency">Dividend Frequency</Label>
              <Select value={value.dividendFrequency} onValueChange={(v) => updateField('dividendFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>                <SelectItem value="semi-annual">Semi-Annual</SelectItem>                <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="exDividendDate">Ex-Dividend Date</Label>
              <Input id="exDividendDate" type="date" value={value.exDividendDate || ''} onChange={(e) => updateField('exDividendDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Rights & Shares</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Voting Rights *</span>
                <Switch checked={value.votingRights || false} onCheckedChange={(checked) => updateField('votingRights', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="sharesOutstanding">Shares Outstanding</Label>
              <Input id="sharesOutstanding" type="number" step="0.01" placeholder="15500000000" value={value.sharesOutstanding || ''} onChange={(e) => updateField('sharesOutstanding', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}