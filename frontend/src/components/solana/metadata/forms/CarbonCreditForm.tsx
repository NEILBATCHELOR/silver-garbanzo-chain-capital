/**
 * Carbon Credit Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CarbonCreditInput } from '@/services/tokens/metadata';

interface CarbonCreditFormProps {
  value: Partial<CarbonCreditInput>;
  onChange: (value: Partial<CarbonCreditInput>) => void;
}

export function CarbonCreditForm({ value, onChange }: CarbonCreditFormProps) {
  const updateField = <K extends keyof CarbonCreditInput>(
    field: K,
    fieldValue: CarbonCreditInput[K]
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
              <Input id="name" placeholder="Verified Carbon Credit - Forestry 2026" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="VCC-F26" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Credit Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditType">Credit Type *</Label>
              <Input id="creditType" placeholder="vcs" value={value.creditType || ''} onChange={(e) => updateField('creditType', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="methodology">Methodology</Label>
              <Input id="methodology" placeholder="VM0015" value={value.methodology || ''} onChange={(e) => updateField('methodology', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input id="projectName" placeholder="Amazon Rainforest REDD+" value={value.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID *</Label>
              <Input id="projectId" placeholder="VCS-2468" value={value.projectId || ''} onChange={(e) => updateField('projectId', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" placeholder="Brazil" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type *</Label>
              <Input id="projectType" placeholder="forestry" value={value.projectType || ''} onChange={(e) => updateField('projectType', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hectares">Hectares</Label>
              <Input id="hectares" type="number" step="0.01" placeholder="150000" value={value.hectares || ''} onChange={(e) => updateField('hectares', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Carbon Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="co2ePerCredit">CO2e Per Credit (tonnes) *</Label>
              <Input id="co2ePerCredit" type="number" step="0.01" placeholder="1" value={value.co2ePerCredit || ''} onChange={(e) => updateField('co2ePerCredit', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vintageYear">Vintage Year *</Label>
              <Input id="vintageYear" placeholder="2026" value={value.vintageYear || ''} onChange={(e) => updateField('vintageYear', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalCredits">Total Credits *</Label>
              <Input id="totalCredits" type="number" step="0.01" placeholder="500000" value={value.totalCredits || ''} onChange={(e) => updateField('totalCredits', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retiredCredits">Retired Credits *</Label>
              <Input id="retiredCredits" type="number" step="0.01" placeholder="0" value={value.retiredCredits || ''} onChange={(e) => updateField('retiredCredits', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remainingCredits">Remaining Credits *</Label>
              <Input id="remainingCredits" type="number" step="0.01" placeholder="500000" value={value.remainingCredits || ''} onChange={(e) => updateField('remainingCredits', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Verification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verifier">Verifier *</Label>
              <Input id="verifier" placeholder="Verra" value={value.verifier || ''} onChange={(e) => updateField('verifier', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationDate">Verification Date *</Label>
              <Input id="verificationDate" type="date" value={value.verificationDate || ''} onChange={(e) => updateField('verificationDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationStatus">Status *</Label>
              <Input id="verificationStatus" placeholder="approved" value={value.verificationStatus || ''} onChange={(e) => updateField('verificationStatus', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registry">Registry *</Label>
              <Input id="registry" placeholder="Verra Registry" value={value.registry || ''} onChange={(e) => updateField('registry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registryId">Registry ID *</Label>
              <Input id="registryId" placeholder="VCS-2468-2026" value={value.registryId || ''} onChange={(e) => updateField('registryId', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumberRange">Serial Number Range</Label>
              <Input id="serialNumberRange" placeholder="100001-600000" value={value.serialNumberRange || ''} onChange={(e) => updateField('serialNumberRange', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Retirement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retirementMethod">Retirement Method *</Label>
              <Select value={value.retirementMethod} onValueChange={(val) => updateField('retirementMethod', val as 'on_chain' | 'registry')}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_chain">On-Chain</SelectItem>
                  <SelectItem value="registry">Registry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirementProgram">Retirement Program</Label>
              <Input id="retirementProgram" placeholder="RETIRE...PROGRAM" value={value.retirementProgram || ''} onChange={(e) => updateField('retirementProgram', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
