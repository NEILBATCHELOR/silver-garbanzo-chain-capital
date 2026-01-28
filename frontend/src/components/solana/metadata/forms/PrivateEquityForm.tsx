/**
 * Private Equity Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { PrivateEquityInput } from '@/services/tokens/metadata';

interface PrivateEquityFormProps {
  value: Partial<PrivateEquityInput>;
  onChange: (value: Partial<PrivateEquityInput>) => void;
}

export function PrivateEquityForm({ value, onChange }: PrivateEquityFormProps) {
  const updateField = <K extends keyof PrivateEquityInput>(
    field: K,
    fieldValue: PrivateEquityInput[K]
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
              <Input id="name" placeholder="TechStartup Series A Preferred" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="TECH-A" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
        <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" placeholder="TechStartup Inc" value={value.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="securityType">Security Type *</Label>
              <Select value={value.securityType} onValueChange={(v) => updateField('securityType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preferred">Preferred</SelectItem>                <SelectItem value="common">Common</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="fundingRound">Funding Round</Label>
              <Select value={value.fundingRound} onValueChange={(v) => updateField('fundingRound', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seed">Seed</SelectItem>                <SelectItem value="series-a">Series A</SelectItem>                <SelectItem value="series-b">Series B</SelectItem>                <SelectItem value="series-c">Series C</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="sector">Sector *</Label>
              <Input id="sector" placeholder="SaaS" value={value.sector || ''} onChange={(e) => updateField('sector', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input id="foundedYear" placeholder="2024" value={value.foundedYear || ''} onChange={(e) => updateField('foundedYear', e.target.value)} />
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
                  <SelectItem value="dcf">DCF</SelectItem>                <SelectItem value="409a">409A Valuation</SelectItem>                <SelectItem value="comparable">Comparable Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="fairMarketValue">Fair Market Value *</Label>
              <Input id="fairMarketValue" type="number" step="0.01" placeholder="25000000" value={value.fairMarketValue || ''} onChange={(e) => updateField('fairMarketValue', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastRoundPrice">Last Round Price</Label>
              <Input id="lastRoundPrice" type="number" step="0.01" placeholder="10.00" value={value.lastRoundPrice || ''} onChange={(e) => updateField('lastRoundPrice', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="lastRoundDate">Last Round Date</Label>
              <Input id="lastRoundDate" type="date" value={value.lastRoundDate || ''} onChange={(e) => updateField('lastRoundDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Rights & Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liquidationPreference">Liquidation Preference (x)</Label>
              <Input id="liquidationPreference" type="number" step="0.01" placeholder="1.5" value={value.liquidationPreference || ''} onChange={(e) => updateField('liquidationPreference', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Participation Rights *</span>
                <Switch checked={value.participationRights || false} onCheckedChange={(checked) => updateField('participationRights', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Voting Rights *</span>
                <Switch checked={value.votingRights || false} onCheckedChange={(checked) => updateField('votingRights', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Pro-Rata Rights *</span>
                <Switch checked={value.proRataRights || false} onCheckedChange={(checked) => updateField('proRataRights', checked)} />
              </Label>
            </div>\n            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Drag-Along Rights *</span>
                <Switch checked={value.dragAlongRights || false} onCheckedChange={(checked) => updateField('dragAlongRights', checked)} />
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Restrictions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lockupPeriod">Lockup Period (days)</Label>
              <Input id="lockupPeriod" type="number" step="0.01" placeholder="365" value={value.lockupPeriod || ''} onChange={(e) => updateField('lockupPeriod', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="transferRestrictions">Transfer Restrictions</Label>
              <Input id="transferRestrictions" placeholder="ROFR" value={value.transferRestrictions || ''} onChange={(e) => updateField('transferRestrictions', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}