/**
 * Crypto-Backed Stablecoin Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CryptoBackedStablecoinInput } from '@/services/tokens/metadata';

interface CryptoBackedStablecoinFormProps {
  value: Partial<CryptoBackedStablecoinInput>;
  onChange: (value: Partial<CryptoBackedStablecoinInput>) => void;
}

export function CryptoBackedStablecoinForm({ value, onChange }: CryptoBackedStablecoinFormProps) {
  const updateField = <K extends keyof CryptoBackedStablecoinInput>(field: K, fieldValue: CryptoBackedStablecoinInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Crypto-Backed USD" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="cbUSD" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
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
            <div className="space-y-2"><Label>Stablecoin Type *</Label><Input value="crypto_backed" disabled /></div>
            <div className="space-y-2"><Label>Pegged Currency *</Label><Input placeholder="USD" value={value.peggedCurrency || ''} onChange={(e) => updateField('peggedCurrency', e.target.value.toUpperCase())} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Collateral</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Collateral Ratio (%) *</Label><Input type="number" placeholder="150" value={value.collateralRatio || ''} onChange={(e) => updateField('collateralRatio', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Min Collateral Ratio (%) *</Label><Input type="number" placeholder="130" value={value.minCollateralRatio || ''} onChange={(e) => updateField('minCollateralRatio', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Liquidation Penalty (%) *</Label><Input type="number" placeholder="13" value={value.liquidationPenalty || ''} onChange={(e) => updateField('liquidationPenalty', parseFloat(e.target.value))} /></div>
          </div>
          <div className="space-y-2"><Label>Collateral Types</Label><Input placeholder="SOL:60%,BTC:30%,ETH:10%" value={value.collateralTypes || ''} onChange={(e) => updateField('collateralTypes', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Vault Address *</Label><Input placeholder="Vault address" value={value.vaultAddress || ''} onChange={(e) => updateField('vaultAddress', e.target.value)} /></div>
            <div className="space-y-2"><Label>Liquidation Engine</Label><Input placeholder="Program address" value={value.liquidationEngine || ''} onChange={(e) => updateField('liquidationEngine', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stability Mechanism</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Target Peg *</Label><Input type="number" step="0.01" placeholder="1.00" value={value.targetPeg || ''} onChange={(e) => updateField('targetPeg', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Current Peg *</Label><Input type="number" step="0.0001" placeholder="0.9998" value={value.currentPeg || ''} onChange={(e) => updateField('currentPeg', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Peg Deviation (%) *</Label><Input type="number" step="0.01" placeholder="0.02" value={value.pegDeviation || ''} onChange={(e) => updateField('pegDeviation', parseFloat(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Stability Fee (%)</Label><Input type="number" step="0.01" placeholder="2.00" value={value.stabilityFee || ''} onChange={(e) => updateField('stabilityFee', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Auction Duration (seconds)</Label><Input type="number" placeholder="360" value={value.auctionDuration || ''} onChange={(e) => updateField('auctionDuration', parseInt(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Oracle Provider *</Label><Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pyth">Pyth</SelectItem><SelectItem value="chainlink">Chainlink</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Collateral Oracles</Label><Input placeholder="Comma-separated addresses" value={value.collateralOracles || ''} onChange={(e) => updateField('collateralOracles', e.target.value)} /></div>
            <div className="space-y-2"><Label>Peg Oracle</Label><Input placeholder="Oracle address" value={value.pegOracle || ''} onChange={(e) => updateField('pegOracle', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Governance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Governance Token</Label><Input placeholder="CBGOV" value={value.governanceToken || ''} onChange={(e) => updateField('governanceToken', e.target.value)} /></div>
            <div className="space-y-2"><Label>DAO Address</Label><Input placeholder="DAO program address" value={value.daoAddress || ''} onChange={(e) => updateField('daoAddress', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Audit URI</Label><Input placeholder="ar://..." value={value.auditUri || ''} onChange={(e) => updateField('auditUri', e.target.value)} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
