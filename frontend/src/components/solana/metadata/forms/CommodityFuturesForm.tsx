/**
 * Commodity Futures Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CommodityFuturesInput } from '@/services/tokens/metadata';

interface CommodityFuturesFormProps {
  value: Partial<CommodityFuturesInput>;
  onChange: (value: Partial<CommodityFuturesInput>) => void;
}

export function CommodityFuturesForm({ value, onChange }: CommodityFuturesFormProps) {
  const updateField = <K extends keyof CommodityFuturesInput>(
    field: K,
    fieldValue: CommodityFuturesInput[K]
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
              <Input id="name" placeholder="WTI Crude Oil Futures Mar 2027" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="CLH27" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} />
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
              <Input id="issuer" placeholder="Chain Capital Derivatives" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} />
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
        <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity *</Label>
              <Input id="commodity" placeholder="crude_oil" value={value.commodity || ''} onChange={(e) => updateField('commodity', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract">Contract *</Label>
              <Input id="contract" placeholder="WTI" value={value.contract || ''} onChange={(e) => updateField('contract', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractSize">Contract Size *</Label>
              <Input id="contractSize" type="number" placeholder="1000" value={value.contractSize || ''} onChange={(e) => updateField('contractSize', parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tickSize">Tick Size *</Label>
              <Input id="tickSize" type="number" step="0.01" placeholder="0.01" value={value.tickSize || ''} onChange={(e) => updateField('tickSize', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <Input id="deliveryLocation" placeholder="Cushing, OK" value={value.deliveryLocation || ''} onChange={(e) => updateField('deliveryLocation', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input id="expiryDate" type="date" value={value.expiryDate || ''} onChange={(e) => updateField('expiryDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryMonth">Delivery Month *</Label>
              <Input id="deliveryMonth" placeholder="2027-03" value={value.deliveryMonth || ''} onChange={(e) => updateField('deliveryMonth', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPrice">Current Price *</Label>
              <Input id="currentPrice" type="number" step="0.01" placeholder="75.43" value={value.currentPrice || ''} onChange={(e) => updateField('currentPrice', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlementPrice">Settlement Price</Label>
              <Input id="settlementPrice" type="number" step="0.01" placeholder="75.20" value={value.settlementPrice || ''} onChange={(e) => updateField('settlementPrice', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Oracle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oracleProvider">Oracle Provider *</Label>
              <Select value={value.oracleProvider} onValueChange={(v) => updateField('oracleProvider', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pyth">Pyth</SelectItem>
                  <SelectItem value="chainlink">Chainlink</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oracleAddress">Oracle Address *</Label>
              <Input id="oracleAddress" placeholder="Oracle feed address" value={value.oracleAddress || ''} onChange={(e) => updateField('oracleAddress', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Margin & Risk</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialMargin">Initial Margin</Label>
              <Input id="initialMargin" type="number" placeholder="5000" value={value.initialMargin || ''} onChange={(e) => updateField('initialMargin', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenanceMargin">Maintenance Margin</Label>
              <Input id="maintenanceMargin" type="number" placeholder="4000" value={value.maintenanceMargin || ''} onChange={(e) => updateField('maintenanceMargin', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Roll & Settlement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contango">Contango (%)</Label>
              <Input id="contango" type="number" step="0.01" placeholder="-2.5" value={value.contango || ''} onChange={(e) => updateField('contango', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextContractPrice">Next Contract Price</Label>
              <Input id="nextContractPrice" type="number" step="0.01" placeholder="74.98" value={value.nextContractPrice || ''} onChange={(e) => updateField('nextContractPrice', parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollDate">Roll Date</Label>
              <Input id="rollDate" type="date" value={value.rollDate || ''} onChange={(e) => updateField('rollDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settlementType">Settlement Type *</Label>
              <Select value={value.settlementType} onValueChange={(v) => updateField('settlementType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalSettlement">Final Settlement</Label>
              <Input id="finalSettlement" placeholder="nymex_close" value={value.finalSettlement || ''} onChange={(e) => updateField('finalSettlement', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Input id="exchange" placeholder="NYMEX" value={value.exchange || ''} onChange={(e) => updateField('exchange', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractSpecsUri">Contract Specifications URI</Label>
            <Input id="contractSpecsUri" placeholder="ar://..." value={value.contractSpecsUri || ''} onChange={(e) => updateField('contractSpecsUri', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
