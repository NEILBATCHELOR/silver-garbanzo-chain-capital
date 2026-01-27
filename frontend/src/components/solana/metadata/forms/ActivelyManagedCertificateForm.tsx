/**
 * Actively Managed Certificate Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ActivelyManagedCertificateInput } from '@/services/tokens/metadata';

interface ActivelyManagedCertificateFormProps {
  value: Partial<ActivelyManagedCertificateInput>;
  onChange: (value: Partial<ActivelyManagedCertificateInput>) => void;
}

export function ActivelyManagedCertificateForm({ value, onChange }: ActivelyManagedCertificateFormProps) {
  const updateField = <K extends keyof ActivelyManagedCertificateInput>(
    field: K,
    fieldValue: ActivelyManagedCertificateInput[K]
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
              <Input id="name" placeholder="Dynamic Tech Portfolio Certificate" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="DTPC" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
                  <SelectItem value="CHF">CHF</SelectItem>
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
              <Input id="issuer" placeholder="Chain Capital Securities" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input id="jurisdiction" placeholder="CH" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy *</Label>
              <Input id="strategy" placeholder="long_short_equity" value={value.strategy || ''} onChange={(e) => updateField('strategy', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioManager">Portfolio Manager *</Label>
              <Input id="portfolioManager" placeholder="Chain Capital Trading" value={value.portfolioManager || ''} onChange={(e) => updateField('portfolioManager', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inceptionDate">Inception Date *</Label>
              <Input id="inceptionDate" type="date" value={value.inceptionDate || ''} onChange={(e) => updateField('inceptionDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rebalanceFrequency">Rebalance Frequency *</Label>
              <Select value={value.rebalanceFrequency} onValueChange={(v) => updateField('rebalanceFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="navFrequency">NAV Frequency *</Label>
              <Select value={value.navFrequency} onValueChange={(v) => updateField('navFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="1050.23" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fees</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee (%) *</Label>
              <Input id="managementFee" type="number" step="0.01" placeholder="1.50" value={value.managementFee || ''} onChange={(e) => updateField('managementFee', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performanceFee">Performance Fee (%)</Label>
              <Input id="performanceFee" type="number" step="0.01" placeholder="20" value={value.performanceFee || ''} onChange={(e) => updateField('performanceFee', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hurdleRate">Hurdle Rate (%)</Label>
              <Input id="hurdleRate" type="number" step="0.01" placeholder="8.00" value={value.hurdleRate || ''} onChange={(e) => updateField('hurdleRate', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Portfolio Composition</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="longExposure">Long Exposure (%)</Label>
              <Input id="longExposure" type="number" step="0.01" placeholder="120" value={value.longExposure || ''} onChange={(e) => updateField('longExposure', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortExposure">Short Exposure (%)</Label>
              <Input id="shortExposure" type="number" step="0.01" placeholder="20" value={value.shortExposure || ''} onChange={(e) => updateField('shortExposure', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netExposure">Net Exposure (%)</Label>
              <Input id="netExposure" type="number" step="0.01" placeholder="100" value={value.netExposure || ''} onChange={(e) => updateField('netExposure', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leverage">Leverage</Label>
              <Input id="leverage" placeholder="1.2x" value={value.leverage || ''} onChange={(e) => updateField('leverage', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beta">Beta</Label>
              <Input id="beta" type="number" step="0.01" placeholder="1.15" value={value.beta || ''} onChange={(e) => updateField('beta', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharpeRatio">Sharpe Ratio</Label>
              <Input id="sharpeRatio" type="number" step="0.01" placeholder="1.8" value={value.sharpeRatio || ''} onChange={(e) => updateField('sharpeRatio', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volatility">Volatility (%)</Label>
              <Input id="volatility" type="number" step="0.01" placeholder="18.5" value={value.volatility || ''} onChange={(e) => updateField('volatility', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="riskDisclosureUri">Risk Disclosure URI</Label>
            <Input id="riskDisclosureUri" placeholder="ar://..." value={value.riskDisclosureUri || ''} onChange={(e) => updateField('riskDisclosureUri', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
