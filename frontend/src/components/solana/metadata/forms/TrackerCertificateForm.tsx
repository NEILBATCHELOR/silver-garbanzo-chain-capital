/**
 * Tracker Certificate Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrackerCertificateInput } from '@/services/tokens/metadata';

interface TrackerCertificateFormProps {
  value: Partial<TrackerCertificateInput>;
  onChange: (value: Partial<TrackerCertificateInput>) => void;
}

export function TrackerCertificateForm({ value, onChange }: TrackerCertificateFormProps) {
  const updateField = <K extends keyof TrackerCertificateInput>(
    field: K,
    fieldValue: TrackerCertificateInput[K]
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
              <Input id="name" placeholder="Tech Giants Basket Certificate" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="TECHG" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="Chain Capital Certificates" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
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
        <CardHeader><CardTitle className="text-base">Tracker Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackerType">Tracker Type *</Label>
              <Select value={value.trackerType} onValueChange={(v) => updateField('trackerType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Asset</SelectItem>
                  <SelectItem value="basket">Basket</SelectItem>
                  <SelectItem value="index">Index</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rebalanceFrequency">Rebalance Frequency</Label>
              <Select value={value.rebalanceFrequency} onValueChange={(v) => updateField('rebalanceFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="basket">Basket Composition</Label>
            <Input id="basket" placeholder="AAPL:25,MSFT:25,GOOGL:25,AMZN:25" value={value.basket || ''} onChange={(e) => updateField('basket', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastRebalance">Last Rebalance Date</Label>
            <Input id="lastRebalance" type="date" value={value.lastRebalance || ''} onChange={(e) => updateField('lastRebalance', e.target.value)} />
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
                  <SelectItem value="intraday">Intraday</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentNav">Current NAV *</Label>
              <Input id="currentNav" type="number" step="0.01" placeholder="1234.56" value={value.currentNav || ''} onChange={(e) => updateField('currentNav', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fees & Performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementFee">Management Fee (%) *</Label>
              <Input id="managementFee" type="number" step="0.01" placeholder="0.50" value={value.managementFee || ''} onChange={(e) => updateField('managementFee', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingError">Tracking Error (%)</Label>
              <Input id="trackingError" type="number" step="0.01" placeholder="0.12" value={value.trackingError || ''} onChange={(e) => updateField('trackingError', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider *</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth</SelectItem>
                  <SelectItem value="chainlink">Chainlink</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oracleAddresses">Oracle Addresses</Label>
              <Input id="oracleAddresses" placeholder="Comma-separated addresses" value={value.oracleAddresses || ''} onChange={(e) => updateField('oracleAddresses', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Redemption</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionMethod">Redemption Method *</Label>
              <Select value={value.redemptionMethod} onValueChange={(v) => updateField('redemptionMethod', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault</Label>
              <Input id="redemptionVault" placeholder="Vault address" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="basketCompositionUri">Basket Composition URI</Label>
            <Input id="basketCompositionUri" placeholder="ar://..." value={value.basketCompositionUri || ''} onChange={(e) => updateField('basketCompositionUri', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
