/**
 * Commodity Spot Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CommoditySpotInput } from '@/services/tokens/metadata';

interface CommoditySpotFormProps {
  value: Partial<CommoditySpotInput>;
  onChange: (value: Partial<CommoditySpotInput>) => void;
}

export function CommoditySpotForm({ value, onChange }: CommoditySpotFormProps) {
  const updateField = <K extends keyof CommoditySpotInput>(
    field: K,
    fieldValue: CommoditySpotInput[K]
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
              <Input id="name" placeholder="Gold Spot Token" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="XAUGRAM" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Commodity Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity *</Label>
              <Input id="commodity" placeholder="gold" value={value.commodity || ''} onChange={(e) => updateField('commodity', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input id="unit" placeholder="gram" value={value.unit || ''} onChange={(e) => updateField('unit', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="purity">Purity</Label>
              <Input id="purity" placeholder="999.9" value={value.purity || ''} onChange={(e) => updateField('purity', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="form">Form *</Label>
              <Select value={value.form} onValueChange={(v) => updateField('form', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allocated">Allocated</SelectItem>                <SelectItem value="unallocated">Unallocated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Custody</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vault">Vault</Label>
              <Input id="vault" placeholder="Zurich Vault A" value={value.vault || ''} onChange={(e) => updateField('vault', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="vaultAddress">Vault Address</Label>
              <Input id="vaultAddress" placeholder="VAULT...ADDR" value={value.vaultAddress || ''} onChange={(e) => updateField('vaultAddress', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="custodian">Custodian *</Label>
              <Input id="custodian" placeholder="Loomis International" value={value.custodian || ''} onChange={(e) => updateField('custodian', e.target.value)} />
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
                  <SelectItem value="mark_to_market">Mark to Market</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider *</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth</SelectItem>                <SelectItem value="chainlink">Chainlink</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="oracleAddress">Oracle Address *</Label>
              <Input id="oracleAddress" placeholder="GOLD...FEED" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Physical Backing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backingRatio">Backing Ratio (%) *</Label>
              <Input id="backingRatio" type="number" step="0.01" placeholder="100" value={value.backingRatio || ''} onChange={(e) => updateField('backingRatio', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="totalPhysicalGrams">Total Physical (grams)</Label>
              <Input id="totalPhysicalGrams" type="number" step="0.01" placeholder="1000000" value={value.totalPhysicalGrams || ''} onChange={(e) => updateField('totalPhysicalGrams', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="auditFrequency">Audit Frequency</Label>
              <Select value={value.auditFrequency} onValueChange={(v) => updateField('auditFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>                <SelectItem value="quarterly">Quarterly</SelectItem>                <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastAuditDate">Last Audit Date</Label>
              <Input id="lastAuditDate" type="date" value={value.lastAuditDate || ''} onChange={(e) => updateField('lastAuditDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Redemption</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Physical Redemption *</span>
                <Switch checked={value.physicalRedemption || false} onCheckedChange={(checked) => updateField('physicalRedemption', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="minRedemptionUnits">Min Redemption Units</Label>
              <Input id="minRedemptionUnits" type="number" step="0.01" placeholder="100" value={value.minRedemptionUnits || ''} onChange={(e) => updateField('minRedemptionUnits', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionFee">Redemption Fee (%)</Label>
              <Input id="redemptionFee" type="number" step="0.01" placeholder="0.50" value={value.redemptionFee || ''} onChange={(e) => updateField('redemptionFee', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}