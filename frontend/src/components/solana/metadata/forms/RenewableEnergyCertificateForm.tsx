/**
 * Renewable Energy Certificate Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { RenewableEnergyCertificateInput } from '@/services/tokens/metadata';

interface RenewableEnergyCertificateFormProps {
  value: Partial<RenewableEnergyCertificateInput>;
  onChange: (value: Partial<RenewableEnergyCertificateInput>) => void;
}

export function RenewableEnergyCertificateForm({ value, onChange }: RenewableEnergyCertificateFormProps) {
  const updateField = <K extends keyof RenewableEnergyCertificateInput>(field: K, fieldValue: RenewableEnergyCertificateInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Solar Renewable Energy Certificate 2026" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="SREC26" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Mojave Solar SPV" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="CA" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Certificate Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Certificate Type *</Label><Select value={value.certificateType} onValueChange={(v) => updateField('certificateType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="srec">SREC (Solar)</SelectItem><SelectItem value="rec">REC (General)</SelectItem><SelectItem value="go">GO (Guarantee of Origin)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Energy Source *</Label><Select value={value.energySource} onValueChange={(v) => updateField('energySource', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solar">Solar</SelectItem><SelectItem value="wind">Wind</SelectItem><SelectItem value="hydro">Hydro</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Project Name *</Label><Input placeholder="Mojave Solar Farm" value={value.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Project ID *</Label><Input placeholder="SREC-CA-2468" value={value.projectId || ''} onChange={(e) => updateField('projectId', e.target.value)} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input placeholder="California, USA" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Capacity (MW)</Label><Input type="number" placeholder="50" value={value.capacity || ''} onChange={(e) => updateField('capacity', parseFloat(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Certificate Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>MWh Per Credit *</Label><Input type="number" placeholder="1" value={value.mwhPerCredit || ''} onChange={(e) => updateField('mwhPerCredit', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Vintage Year *</Label><Input placeholder="2026" value={value.vintageYear || ''} onChange={(e) => updateField('vintageYear', e.target.value)} /></div>
            <div className="space-y-2"><Label>Vintage Quarter</Label><Input placeholder="Q1" value={value.vintageQuarter || ''} onChange={(e) => updateField('vintageQuarter', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Generation Date *</Label><Input type="date" value={value.generationDate || ''} onChange={(e) => updateField('generationDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Total MWh *</Label><Input type="number" placeholder="25000" value={value.totalMwh || ''} onChange={(e) => updateField('totalMwh', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Certification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Certifying Body *</Label><Input placeholder="California Energy Commission" value={value.certifyingBody || ''} onChange={(e) => updateField('certifyingBody', e.target.value)} /></div>
            <div className="space-y-2"><Label>Registry ID *</Label><Input placeholder="CEC-SREC-2468-Q1-2026" value={value.registryId || ''} onChange={(e) => updateField('registryId', e.target.value)} /></div>
            <div className="space-y-2"><Label>Verification Date *</Label><Input type="date" value={value.verificationDate || ''} onChange={(e) => updateField('verificationDate', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Certification URI</Label><Input placeholder="ar://..." value={value.certificationUri || ''} onChange={(e) => updateField('certificationUri', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Compliance Market</Label><Input placeholder="california_rps" value={value.complianceMarket || ''} onChange={(e) => updateField('complianceMarket', e.target.value)} /></div>
            <div className="space-y-2"><Label>Compliance Year</Label><Input placeholder="2026" value={value.complianceYear || ''} onChange={(e) => updateField('complianceYear', e.target.value)} /></div>
            <div className="space-y-2"><Label>Eligible Programs</Label><Input placeholder="RPS,Cap-and-Trade" value={value.eligiblePrograms || ''} onChange={(e) => updateField('eligiblePrograms', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Retirement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label className="flex items-center justify-between"><span>Retired *</span><Switch checked={value.retired || false} onCheckedChange={(checked) => updateField('retired', checked)} /></Label></div>
            <div className="space-y-2"><Label>Retirement Date</Label><Input type="date" value={value.retirementDate || ''} onChange={(e) => updateField('retirementDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Retirement Program</Label><Input placeholder="Program address" value={value.retirementProgram || ''} onChange={(e) => updateField('retirementProgram', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>REC Agreement URI</Label><Input placeholder="ar://..." value={value.recAgreementUri || ''} onChange={(e) => updateField('recAgreementUri', e.target.value)} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
