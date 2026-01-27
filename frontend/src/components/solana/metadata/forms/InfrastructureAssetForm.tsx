/**
 * Infrastructure Asset Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InfrastructureAssetInput } from '@/services/tokens/metadata';

interface InfrastructureAssetFormProps {
  value: Partial<InfrastructureAssetInput>;
  onChange: (value: Partial<InfrastructureAssetInput>) => void;
}

export function InfrastructureAssetForm({ value, onChange }: InfrastructureAssetFormProps) {
  const updateField = <K extends keyof InfrastructureAssetInput>(
    field: K,
    fieldValue: InfrastructureAssetInput[K]
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
              <Input id="name" placeholder="Toll Road Concession 2026-2046" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="TOLL46" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="Highway 101 SPV LLC" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input id="jurisdiction" placeholder="CA" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Input id="issueDate" type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Sector *</Label>
              <Select value={value.sector} onValueChange={(v) => updateField('sector', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="telecom">Telecommunications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type *</Label>
              <Input id="assetType" placeholder="toll_road" value={value.assetType || ''} onChange={(e) => updateField('assetType', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input id="projectName" placeholder="Highway 101 Concession" value={value.projectName || ''} onChange={(e) => updateField('projectName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" placeholder="California, USA" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Concession Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="concessionStart">Concession Start</Label>
              <Input id="concessionStart" type="date" value={value.concessionStart || ''} onChange={(e) => updateField('concessionStart', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concessionEnd">Concession End</Label>
              <Input id="concessionEnd" type="date" value={value.concessionEnd || ''} onChange={(e) => updateField('concessionEnd', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concessionYears">Concession Years</Label>
              <Input id="concessionYears" type="number" placeholder="20" value={value.concessionYears || ''} onChange={(e) => updateField('concessionYears', parseInt(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financial Structure</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectValue">Project Value *</Label>
              <Input id="projectValue" type="number" placeholder="850000000" value={value.projectValue || ''} onChange={(e) => updateField('projectValue', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equityInvestment">Equity Investment *</Label>
              <Input id="equityInvestment" type="number" placeholder="340000000" value={value.equityInvestment || ''} onChange={(e) => updateField('equityInvestment', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtFinancing">Debt Financing *</Label>
              <Input id="debtFinancing" type="number" placeholder="510000000" value={value.debtFinancing || ''} onChange={(e) => updateField('debtFinancing', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsorEquity">Sponsor Equity</Label>
              <Input id="sponsorEquity" type="number" placeholder="51000000" value={value.sponsorEquity || ''} onChange={(e) => updateField('sponsorEquity', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Model</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenueType">Revenue Type *</Label>
              <Input id="revenueType" placeholder="toll_fees" value={value.revenueType || ''} onChange={(e) => updateField('revenueType', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualRevenue">Annual Revenue *</Label>
              <Input id="annualRevenue" type="number" placeholder="159687500" value={value.annualRevenue || ''} onChange={(e) => updateField('annualRevenue', parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annualOpex">Annual OPEX *</Label>
              <Input id="annualOpex" type="number" placeholder="25000000" value={value.annualOpex || ''} onChange={(e) => updateField('annualOpex', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ebitda">EBITDA *</Label>
              <Input id="ebitda" type="number" placeholder="134687500" value={value.ebitda || ''} onChange={(e) => updateField('ebitda', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtService">Debt Service</Label>
              <Input id="debtService" type="number" placeholder="35000000" value={value.debtService || ''} onChange={(e) => updateField('debtService', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Returns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectedIrr">Projected IRR (%) *</Label>
              <Input id="projectedIrr" type="number" step="0.01" placeholder="12.5" value={value.projectedIrr || ''} onChange={(e) => updateField('projectedIrr', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectedEquityMultiple">Projected Equity Multiple</Label>
              <Input id="projectedEquityMultiple" placeholder="2.8x" value={value.projectedEquityMultiple || ''} onChange={(e) => updateField('projectedEquityMultiple', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashYield">Cash Yield (%) *</Label>
              <Input id="cashYield" type="number" step="0.01" placeholder="8.2" value={value.cashYield || ''} onChange={(e) => updateField('cashYield', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Distributions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distributionFrequency">Distribution Frequency *</Label>
              <Select value={value.distributionFrequency} onValueChange={(v) => updateField('distributionFrequency', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributionWaterfall">Distribution Waterfall</Label>
              <Input id="distributionWaterfall" placeholder="debt_first" value={value.distributionWaterfall || ''} onChange={(e) => updateField('distributionWaterfall', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastDistribution">Last Distribution</Label>
              <Input id="lastDistribution" type="date" value={value.lastDistribution || ''} onChange={(e) => updateField('lastDistribution', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk Factors</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trafficRisk">Traffic Risk</Label>
              <Input id="trafficRisk" placeholder="moderate" value={value.trafficRisk || ''} onChange={(e) => updateField('trafficRisk', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regulatoryRisk">Regulatory Risk</Label>
              <Input id="regulatoryRisk" placeholder="low" value={value.regulatoryRisk || ''} onChange={(e) => updateField('regulatoryRisk', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitionRisk">Competition Risk</Label>
              <Input id="competitionRisk" placeholder="low" value={value.competitionRisk || ''} onChange={(e) => updateField('competitionRisk', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concessionAgreementUri">Concession Agreement URI</Label>
            <Input id="concessionAgreementUri" placeholder="ar://..." value={value.concessionAgreementUri || ''} onChange={(e) => updateField('concessionAgreementUri', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
