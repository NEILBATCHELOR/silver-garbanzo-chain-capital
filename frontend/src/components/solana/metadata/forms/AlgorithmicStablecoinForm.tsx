/**
 * Algorithmic Stablecoin Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AlgorithmicStablecoinInput } from '@/services/tokens/metadata';

interface AlgorithmicStablecoinFormProps {
  value: Partial<AlgorithmicStablecoinInput>;
  onChange: (value: Partial<AlgorithmicStablecoinInput>) => void;
}

export function AlgorithmicStablecoinForm({ value, onChange }: AlgorithmicStablecoinFormProps) {
  const updateField = <K extends keyof AlgorithmicStablecoinInput>(field: K, fieldValue: AlgorithmicStablecoinInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Algorithmic USD" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="aUSD" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Stablecoin Type *</Label><Select value={value.stablecoinType} onValueChange={(v) => updateField('stablecoinType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pure_algorithmic">Pure Algorithmic</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Pegged Currency *</Label><Input placeholder="USD" value={value.peggedCurrency || ''} onChange={(e) => updateField('peggedCurrency', e.target.value.toUpperCase())} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mechanism</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Mechanism Type *</Label><Select value={value.mechanismType} onValueChange={(v) => updateField('mechanismType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="seigniorage">Seigniorage</SelectItem><SelectItem value="rebase">Rebase</SelectItem><SelectItem value="dual_token">Dual Token</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Algorithm Address</Label><Input placeholder="Program address" value={value.algorithmAddress || ''} onChange={(e) => updateField('algorithmAddress', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Shares Token</Label><Input placeholder="aUSD_SHARES" value={value.sharesToken || ''} onChange={(e) => updateField('sharesToken', e.target.value)} /></div>
            <div className="space-y-2"><Label>Bonds Token</Label><Input placeholder="aUSD_BONDS" value={value.bondsToken || ''} onChange={(e) => updateField('bondsToken', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">State</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Current Peg *</Label><Input type="number" step="0.0001" placeholder="1.0015" value={value.currentPeg || ''} onChange={(e) => updateField('currentPeg', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label className="flex items-center justify-between"><span>Expansion Phase</span><Switch checked={value.expansionPhase || false} onCheckedChange={(checked) => updateField('expansionPhase', checked)} /></Label></div>
          </div>
          <div className="space-y-2"><Label className="flex items-center justify-between"><span>Contraction Phase</span><Switch checked={value.contractionPhase || false} onCheckedChange={(checked) => updateField('contractionPhase', checked)} /></Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Supply Dynamics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Total Supply *</Label><Input type="number" placeholder="50000000" value={value.totalSupply || ''} onChange={(e) => updateField('totalSupply', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Target Supply</Label><Input type="number" placeholder="50750000" value={value.targetSupply || ''} onChange={(e) => updateField('targetSupply', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Daily Rebase Rate (%)</Label><Input type="number" step="0.01" placeholder="0.05" value={value.dailyRebaseRate || ''} onChange={(e) => updateField('dailyRebaseRate', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Last Rebase Time</Label><Input type="datetime-local" value={value.lastRebaseTime || ''} onChange={(e) => updateField('lastRebaseTime', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Peg Oracle *</Label><Input placeholder="Oracle address" value={value.pegOracle || ''} onChange={(e) => updateField('pegOracle', e.target.value)} /></div>
            <div className="space-y-2"><Label>Oracle Address</Label><Input placeholder="Feed address" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Update Frequency (seconds)</Label><Input type="number" placeholder="60" value={value.oracleUpdateFreq || ''} onChange={(e) => updateField('oracleUpdateFreq', parseInt(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Governance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Governance Token</Label><Input placeholder="AGOV" value={value.governanceToken || ''} onChange={(e) => updateField('governanceToken', e.target.value)} /></div>
            <div className="space-y-2"><Label>DAO Address</Label><Input placeholder="DAO address" value={value.daoAddress || ''} onChange={(e) => updateField('daoAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Proposal Threshold</Label><Input type="number" placeholder="100000" value={value.proposalThreshold || ''} onChange={(e) => updateField('proposalThreshold', parseInt(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Whitepaper URI</Label><Input placeholder="ar://..." value={value.whitepaper || ''} onChange={(e) => updateField('whitepaper', e.target.value)} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
