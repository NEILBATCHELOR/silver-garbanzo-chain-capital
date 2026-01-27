/**
 * Commodity-Backed Stablecoin Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CommodityBackedStablecoinInput } from '@/services/tokens/metadata';

interface CommodityBackedStablecoinFormProps {
  value: Partial<CommodityBackedStablecoinInput>;
  onChange: (value: Partial<CommodityBackedStablecoinInput>) => void;
}

export function CommodityBackedStablecoinForm({ value, onChange }: CommodityBackedStablecoinFormProps) {
  const updateField = <K extends keyof CommodityBackedStablecoinInput>(field: K, fieldValue: CommodityBackedStablecoinInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Gold-Backed Stablecoin" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="XAUG" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
          </div>
          <div className="space-y-2"><Label>Metadata URI *</Label><Input placeholder="ar://..." value={value.uri || ''} onChange={(e) => updateField('uri', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Decimals *</Label><Input type="number" min="0" max="9" value={value.decimals || 6} onChange={(e) => updateField('decimals', parseInt(e.target.value))} /></div>
            <div className="space-y-2"><Label>Currency *</Label><Select value={value.currency} onValueChange={(v) => updateField('currency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Issuer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Chain Capital Commodities" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="CH" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stablecoin Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Stablecoin Type *</Label><Input value="commodity_backed" disabled /></div>
            <div className="space-y-2"><Label>Backed Commodity *</Label><Input placeholder="gold" value={value.backedCommodity || ''} onChange={(e) => updateField('backedCommodity', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Backing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Backing Ratio (%) *</Label><Input type="number" placeholder="100" value={value.backingRatio || ''} onChange={(e) => updateField('backingRatio', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Commodity Unit *</Label><Input placeholder="gram" value={value.commodityUnit || ''} onChange={(e) => updateField('commodityUnit', e.target.value)} /></div>
            <div className="space-y-2"><Label>Tokens Per Unit *</Label><Input type="number" placeholder="1" value={value.tokensPerUnit || ''} onChange={(e) => updateField('tokensPerUnit', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Purity</Label><Input placeholder="999.9" value={value.purity || ''} onChange={(e) => updateField('purity', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Total Physical (grams)</Label><Input type="number" placeholder="10000000" value={value.totalPhysicalGrams || ''} onChange={(e) => updateField('totalPhysicalGrams', parseFloat(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Custody</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Custodian *</Label><Input placeholder="Loomis International" value={value.custodian || ''} onChange={(e) => updateField('custodian', e.target.value)} /></div>
            <div className="space-y-2"><Label>Vault Location *</Label><Input placeholder="Zurich, Switzerland" value={value.vaultLocation || ''} onChange={(e) => updateField('vaultLocation', e.target.value)} /></div>
            <div className="space-y-2"><Label>Vault Address</Label><Input placeholder="Vault address" value={value.vaultAddress || ''} onChange={(e) => updateField('vaultAddress', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Insurance Value</Label><Input type="number" placeholder="600000000" value={value.insuranceValue || ''} onChange={(e) => updateField('insuranceValue', parseFloat(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Audit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Audit Frequency *</Label><Select value={value.auditFrequency} onValueChange={(v) => updateField('auditFrequency', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Last Audit Date *</Label><Input type="date" value={value.lastAuditDate || ''} onChange={(e) => updateField('lastAuditDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Auditor *</Label><Input placeholder="Bureau Veritas" value={value.auditor || ''} onChange={(e) => updateField('auditor', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Audit Report URI</Label><Input placeholder="ar://..." value={value.auditReportUri || ''} onChange={(e) => updateField('auditReportUri', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Oracle Provider *</Label><Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pyth">Pyth</SelectItem><SelectItem value="chainlink">Chainlink</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Oracle Address *</Label><Input placeholder="Oracle feed address" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Current Gold Price ($/gram)</Label><Input type="number" step="0.01" placeholder="60.00" value={value.currentGoldPrice || ''} onChange={(e) => updateField('currentGoldPrice', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Redemption</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label className="flex items-center justify-between"><span>Physical Redemption *</span><Switch checked={value.physicalRedemption || false} onCheckedChange={(checked) => updateField('physicalRedemption', checked)} /></Label></div>
            <div className="space-y-2"><Label>Min Redemption</Label><Input type="number" placeholder="100" value={value.minRedemption || ''} onChange={(e) => updateField('minRedemption', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Redemption Fee (%)</Label><Input type="number" step="0.01" placeholder="2.00" value={value.redemptionFee || ''} onChange={(e) => updateField('redemptionFee', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
