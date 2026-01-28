/**
 * Principal Protected Note Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PrincipalProtectedNoteInput } from '@/services/tokens/metadata';

interface PrincipalProtectedNoteFormProps {
  value: Partial<PrincipalProtectedNoteInput>;
  onChange: (value: Partial<PrincipalProtectedNoteInput>) => void;
}

export function PrincipalProtectedNoteForm({ value, onChange }: PrincipalProtectedNoteFormProps) {
  const updateField = <K extends keyof PrincipalProtectedNoteInput>(
    field: K,
    fieldValue: PrincipalProtectedNoteInput[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      {/* Token Basics */}
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name *</Label>
              <Input id="name" placeholder="Principal Protected Note 2029" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="PPEN29" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI *</Label>
            <Input id="uri" placeholder="ar://..." value={value.uri || ''} onChange={(e) => updateField('uri', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Issuer */}
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
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input id="maturityDate" type="date" value={value.maturityDate || ''} onChange={(e) => updateField('maturityDate', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select value={value.currency} onValueChange={(v) => updateField('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals *</Label>
            <Input id="decimals" type="number" min="0" max="9" value={value.decimals || 6} onChange={(e) => updateField('decimals', parseInt(e.target.value))} />
          </div>
        </CardContent>
      </Card>
      {/* Protection Terms */}
      <Card>
        <CardHeader><CardTitle className="text-base">Protection Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protectionLevel">Protection Level (%) *</Label>
              <Input id="protectionLevel" type="number" step="0.01" placeholder="100" value={value.protectionLevel || ''} onChange={(e) => updateField('protectionLevel', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="protectionType">Protection Type *</Label>
              <Select value={value.protectionType} onValueChange={(v) => updateField('protectionType', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hard">Hard (Guaranteed)</SelectItem>                <SelectItem value="soft">Soft (Conditional)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Underlying Asset */}
      <Card>
        <CardHeader><CardTitle className="text-base">Underlying Asset</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="underlying">Ticker *</Label>
              <Input id="underlying" placeholder="QQQ" value={value.underlying || ''} onChange={(e) => updateField('underlying', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="underlyingName">Full Name *</Label>
              <Input id="underlyingName" placeholder="Nasdaq-100 ETF" value={value.underlyingName || ''} onChange={(e) => updateField('underlyingName', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="initialPrice">Initial Price *</Label>
              <Input id="initialPrice" type="number" step="0.01" placeholder="450.00" value={value.initialPrice || ''} onChange={(e) => updateField('initialPrice', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Participation */}
      <Card>
        <CardHeader><CardTitle className="text-base">Participation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upsideParticipation">Upside (%) *</Label>
              <Input id="upsideParticipation" type="number" step="0.01" placeholder="80" value={value.upsideParticipation || ''} onChange={(e) => updateField('upsideParticipation', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="downsideProtection">Downside Protection (%) *</Label>
              <Input id="downsideProtection" type="number" step="0.01" placeholder="100" value={value.downsideProtection || ''} onChange={(e) => updateField('downsideProtection', parseFloat(e.target.value))} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="capLevel">Cap Level (%)</Label>
              <Input id="capLevel" type="number" step="0.01" placeholder="200" value={value.capLevel || ''} onChange={(e) => updateField('capLevel', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Oracle */}
      <Card>
        <CardHeader><CardTitle className="text-base">Oracle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider *</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth</SelectItem>                <SelectItem value="chainlink">Chainlink</SelectItem>                <SelectItem value="switchboard">Switchboard</SelectItem>
                </SelectContent>
              </Select>
            </div>\n            <div className="space-y-2">
              <Label htmlFor="oracleAddress">Oracle Address *</Label>
              <Input id="oracleAddress" placeholder="ABC...XYZ" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Redemption */}
      <Card>
        <CardHeader><CardTitle className="text-base">Redemption</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionVault">Redemption Vault *</Label>
              <Input id="redemptionVault" placeholder="DEF...123" value={value.redemptionVault || ''} onChange={(e) => updateField('redemptionVault', e.target.value)} />
            </div>\n            <div className="space-y-2">
              <Label htmlFor="redemptionMethod">Redemption Method *</Label>
              <Select value={value.redemptionMethod} onValueChange={(v) => updateField('redemptionMethod', v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maturity-only">Maturity Only</SelectItem>                <SelectItem value="early-redemption">Early Redemption</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}