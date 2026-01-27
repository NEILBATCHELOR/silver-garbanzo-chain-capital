/**
 * Oil & Gas Asset Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OilGasAssetInput } from '@/services/tokens/metadata';

interface OilGasAssetFormProps {
  value: Partial<OilGasAssetInput>;
  onChange: (value: Partial<OilGasAssetInput>) => void;
}

export function OilGasAssetForm({ value, onChange }: OilGasAssetFormProps) {
  const updateField = <K extends keyof OilGasAssetInput>(field: K, fieldValue: OilGasAssetInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Permian Basin Oil Wells Series 2026" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="PERM26" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Permian Resources SPV" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="TX" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Asset Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Energy Type *</Label><Input value="oil_gas" disabled /></div>
            <div className="space-y-2"><Label>Asset Stage *</Label><Select value={value.assetStage} onValueChange={(v) => updateField('assetStage', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="producing">Producing</SelectItem><SelectItem value="development">Development</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Project Name *</Label><Input placeholder="Permian Portfolio A" value={value.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input placeholder="Texas, USA" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Well Count</Label><Input type="number" placeholder="24" value={value.wellCount || ''} onChange={(e) => updateField('wellCount', parseInt(e.target.value))} /></div>
            <div className="space-y-2"><Label>Acreage</Label><Input type="number" placeholder="15000" value={value.acreage || ''} onChange={(e) => updateField('acreage', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Formation</Label><Input placeholder="Wolfcamp" value={value.formation || ''} onChange={(e) => updateField('formation', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Production</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Oil Production (bpd)</Label><Input type="number" placeholder="1200" value={value.oilProductionBpd || ''} onChange={(e) => updateField('oilProductionBpd', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Gas Production (mcfd)</Label><Input type="number" placeholder="3500" value={value.gasProductionMcfd || ''} onChange={(e) => updateField('gasProductionMcfd', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>NGL Production (bpd)</Label><Input type="number" placeholder="180" value={value.nglProductionBpd || ''} onChange={(e) => updateField('nglProductionBpd', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Decline Rate (% annual)</Label><Input type="number" step="0.1" placeholder="8" value={value.avgWellDeclineRate || ''} onChange={(e) => updateField('avgWellDeclineRate', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Economics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Breakeven Price ($/bbl) *</Label><Input type="number" step="0.01" placeholder="42.00" value={value.breakEvenPrice || ''} onChange={(e) => updateField('breakEvenPrice', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Current Oil Price</Label><Input type="number" step="0.01" placeholder="75.00" value={value.currentOilPrice || ''} onChange={(e) => updateField('currentOilPrice', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Netback per BOE</Label><Input type="number" step="0.01" placeholder="48.50" value={value.netbackPerBoe || ''} onChange={(e) => updateField('netbackPerBoe', parseFloat(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Annual Net Revenue *</Label><Input type="number" placeholder="18250000" value={value.annualNetRevenue || ''} onChange={(e) => updateField('annualNetRevenue', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>OPEX *</Label><Input type="number" placeholder="4500000" value={value.opex || ''} onChange={(e) => updateField('opex', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Capital Budget</Label><Input type="number" placeholder="2000000" value={value.capitalBudget || ''} onChange={(e) => updateField('capitalBudget', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Reserves & Returns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Proved Reserves (BOE)</Label><Input type="number" placeholder="5400000" value={value.provedReserves || ''} onChange={(e) => updateField('provedReserves', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Probable Reserves (BOE)</Label><Input type="number" placeholder="3200000" value={value.probableReserves || ''} onChange={(e) => updateField('probableReserves', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Reserve Life (years)</Label><Input type="number" step="0.1" placeholder="12.3" value={value.reserveLife || ''} onChange={(e) => updateField('reserveLife', parseFloat(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Projected IRR (%) *</Label><Input type="number" step="0.01" placeholder="15.2" value={value.projectedIrr || ''} onChange={(e) => updateField('projectedIrr', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Cash Yield (%) *</Label><Input type="number" step="0.01" placeholder="12.5" value={value.cashYield || ''} onChange={(e) => updateField('cashYield', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Distribution Frequency *</Label><Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Distribution per Token</Label><Input type="number" step="0.01" placeholder="1.25" value={value.distributionPerToken || ''} onChange={(e) => updateField('distributionPerToken', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Operating Agreement URI</Label><Input placeholder="ar://..." value={value.operatingAgreementUri || ''} onChange={(e) => updateField('operatingAgreementUri', e.target.value)} /></div>
            <div className="space-y-2"><Label>Reserve Report URI</Label><Input placeholder="ar://..." value={value.reserveReportUri || ''} onChange={(e) => updateField('reserveReportUri', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
