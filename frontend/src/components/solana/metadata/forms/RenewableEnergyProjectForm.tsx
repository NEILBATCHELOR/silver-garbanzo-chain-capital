/**
 * Renewable Energy Project Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RenewableEnergyProjectInput } from '@/services/tokens/metadata';

interface RenewableEnergyProjectFormProps {
  value: Partial<RenewableEnergyProjectInput>;
  onChange: (value: Partial<RenewableEnergyProjectInput>) => void;
}

export function RenewableEnergyProjectForm({ value, onChange }: RenewableEnergyProjectFormProps) {
  const updateField = <K extends keyof RenewableEnergyProjectInput>(field: K, fieldValue: RenewableEnergyProjectInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Desert Solar Farm 50MW Series A" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="SOLAR-A" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Mojave Solar SPV LLC" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="CA" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Energy Type *</Label><Select value={value.energyType} onValueChange={(v) => updateField('energyType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solar">Solar</SelectItem><SelectItem value="wind">Wind</SelectItem><SelectItem value="hydro">Hydro</SelectItem><SelectItem value="geothermal">Geothermal</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Project Stage *</Label><Select value={value.projectStage} onValueChange={(v) => updateField('projectStage', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="development">Development</SelectItem><SelectItem value="construction">Construction</SelectItem><SelectItem value="operational">Operational</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Project Name *</Label><Input placeholder="Mojave Solar Farm" value={value.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input placeholder="California, USA" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Capacity (MW) *</Label><Input type="number" placeholder="50" value={value.capacity || ''} onChange={(e) => updateField('capacity', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>COD Date</Label><Input type="date" value={value.codDate || ''} onChange={(e) => updateField('codDate', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Generation & Revenue</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Annual MWh Production</Label><Input type="number" placeholder="100000" value={value.annualMwhProduction || ''} onChange={(e) => updateField('annualMwhProduction', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Capacity Factor (%)</Label><Input type="number" step="0.1" placeholder="23" value={value.capacityFactor || ''} onChange={(e) => updateField('capacityFactor', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Annual Revenue</Label><Input type="number" placeholder="4500000" value={value.annualRevenue || ''} onChange={(e) => updateField('annualRevenue', parseFloat(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>PPA Price ($/MWh)</Label><Input type="number" step="0.01" placeholder="45.00" value={value.ppaPrice || ''} onChange={(e) => updateField('ppaPrice', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>PPA Counterparty</Label><Input placeholder="SoCal Edison" value={value.ppaCounterparty || ''} onChange={(e) => updateField('ppaCounterparty', e.target.value)} /></div>
            <div className="space-y-2"><Label>PPA Expiry Date</Label><Input type="date" value={value.ppaExpiryDate || ''} onChange={(e) => updateField('ppaExpiryDate', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financial Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Project Cost *</Label><Input type="number" placeholder="45000000" value={value.projectCost || ''} onChange={(e) => updateField('projectCost', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Equity Invested *</Label><Input type="number" placeholder="13500000" value={value.equityInvested || ''} onChange={(e) => updateField('equityInvested', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Debt Financing *</Label><Input type="number" placeholder="31500000" value={value.debtFinancing || ''} onChange={(e) => updateField('debtFinancing', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>LTV (%)</Label><Input type="number" placeholder="70" value={value.ltv || ''} onChange={(e) => updateField('ltv', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Returns & Environmental</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Projected IRR (%) *</Label><Input type="number" step="0.01" placeholder="11.8" value={value.projectedIrr || ''} onChange={(e) => updateField('projectedIrr', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Cash Yield (%) *</Label><Input type="number" step="0.01" placeholder="7.5" value={value.cashYield || ''} onChange={(e) => updateField('cashYield', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Payback Period (years)</Label><Input type="number" step="0.1" placeholder="9.2" value={value.paybackPeriod || ''} onChange={(e) => updateField('paybackPeriod', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>CO2 Avoided (metric tons/year)</Label><Input type="number" placeholder="50000" value={value.co2AvoidedAnnually || ''} onChange={(e) => updateField('co2AvoidedAnnually', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Distribution Frequency *</Label><Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Last Distribution</Label><Input type="date" value={value.lastDistribution || ''} onChange={(e) => updateField('lastDistribution', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>PPA URI</Label><Input placeholder="ar://..." value={value.ppaUri || ''} onChange={(e) => updateField('ppaUri', e.target.value)} /></div>
            <div className="space-y-2"><Label>Interconnection URI</Label><Input placeholder="ar://..." value={value.interconnectionUri || ''} onChange={(e) => updateField('interconnectionUri', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
