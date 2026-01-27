/**
 * Rebasing Stablecoin Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RebasingStablecoinInput } from '@/services/tokens/metadata';

interface RebasingStablecoinFormProps {
  value: Partial<RebasingStablecoinInput>;
  onChange: (value: Partial<RebasingStablecoinInput>) => void;
}

export function RebasingStablecoinForm({ value, onChange }: RebasingStablecoinFormProps) {
  const updateField = <K extends keyof RebasingStablecoinInput>(field: K, fieldValue: RebasingStablecoinInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Rebasing USD" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="rUSD" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Decentralized" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="N/A" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stablecoin Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Stablecoin Type *</Label><Input value="elastic_supply" disabled /></div>
            <div className="space-y-2"><Label>Pegged Currency *</Label><Input placeholder="USD" value={value.peggedCurrency || ''} onChange={(e) => updateField('peggedCurrency', e.target.value.toUpperCase())} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Rebase Mechanism</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Rebase Frequency *</Label><Select value={value.rebaseFrequency} onValueChange={(v) => updateField('rebaseFrequency', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Rebase Time</Label><Input placeholder="00:00UTC" value={value.rebaseTime || ''} onChange={(e) => updateField('rebaseTime', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Last Rebase</Label><Input type="datetime-local" value={value.lastRebase || ''} onChange={(e) => updateField('lastRebase', e.target.value)} /></div>
            <div className="space-y-2"><Label>Last Rebase Rate (%)</Label><Input type="number" step="0.01" placeholder="+0.12" value={value.lastRebaseRate || ''} onChange={(e) => updateField('lastRebaseRate', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Rebase History URI</Label><Input placeholder="ar://..." value={value.rebaseHistory || ''} onChange={(e) => updateField('rebaseHistory', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Target & Threshold</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Target Price *</Label><Input type="number" step="0.01" placeholder="1.00" value={value.targetPrice || ''} onChange={(e) => updateField('targetPrice', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Current Price *</Label><Input type="number" step="0.0001" placeholder="1.0012" value={value.currentPrice || ''} onChange={(e) => updateField('currentPrice', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Rebase Threshold (%) *</Label><Input type="number" step="0.01" placeholder="0.05" value={value.rebaseThreshold || ''} onChange={(e) => updateField('rebaseThreshold', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Supply</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Total Supply *</Label><Input type="number" placeholder="25000000" value={value.totalSupply || ''} onChange={(e) => updateField('totalSupply', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Supply Change 24h</Label><Input type="number" placeholder="+30000" value={value.supplyChange24h || ''} onChange={(e) => updateField('supplyChange24h', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle & Program</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Price Oracle *</Label><Input placeholder="Oracle name" value={value.priceOracle || ''} onChange={(e) => updateField('priceOracle', e.target.value)} /></div>
            <div className="space-y-2"><Label>Oracle Address</Label><Input placeholder="Feed address" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Rebase Program</Label><Input placeholder="Program address" value={value.rebaseProgram || ''} onChange={(e) => updateField('rebaseProgram', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Documentation URI</Label><Input placeholder="ar://..." value={value.docsUri || ''} onChange={(e) => updateField('docsUri', e.target.value)} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
