/**
 * Collectible Metadata Form
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CollectibleInput } from '@/services/tokens/metadata';

interface CollectibleFormProps {
  value: Partial<CollectibleInput>;
  onChange: (value: Partial<CollectibleInput>) => void;
}

export function CollectibleForm({ value, onChange }: CollectibleFormProps) {
  const updateField = <K extends keyof CollectibleInput>(field: K, fieldValue: CollectibleInput[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Token Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Token Name *</Label><Input placeholder="Picasso Blue Period Painting - Shares" value={value.name || ''} onChange={(e) => updateField('name', e.target.value)} maxLength={32} /></div>
            <div className="space-y-2"><Label>Symbol *</Label><Input placeholder="PCSO-BP" value={value.symbol || ''} onChange={(e) => updateField('symbol', e.target.value.toUpperCase())} maxLength={10} /></div>
          </div>
          <div className="space-y-2"><Label>Metadata URI *</Label><Input placeholder="ar://..." value={value.uri || ''} onChange={(e) => updateField('uri', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Decimals *</Label><Input type="number" min="0" max="9" value={value.decimals || 6} onChange={(e) => updateField('decimals', parseInt(e.target.value))} /></div>
            <div className="space-y-2"><Label>Currency *</Label><Select value={value.currency} onValueChange={(v) => updateField('currency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Issuer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Issuer *</Label><Input placeholder="Art Investment SPV" value={value.issuer || ''} onChange={(e) => updateField('issuer', e.target.value)} /></div>
            <div className="space-y-2"><Label>Jurisdiction *</Label><Input placeholder="CH" value={value.jurisdiction || ''} onChange={(e) => updateField('jurisdiction', e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div className="space-y-2"><Label>Issue Date *</Label><Input type="date" value={value.issueDate || ''} onChange={(e) => updateField('issueDate', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Collectible Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Collectible Type *</Label><Select value={value.collectibleType} onValueChange={(v) => updateField('collectibleType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fine_art">Fine Art</SelectItem><SelectItem value="wine">Wine</SelectItem><SelectItem value="classic_car">Classic Car</SelectItem><SelectItem value="rare_book">Rare Book</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Woman with Blue Veil" value={value.title || ''} onChange={(e) => updateField('title', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Artist</Label><Input placeholder="Pablo Picasso" value={value.artist || ''} onChange={(e) => updateField('artist', e.target.value)} /></div>
            <div className="space-y-2"><Label>Year</Label><Input placeholder="1903" value={value.year || ''} onChange={(e) => updateField('year', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Provenance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Previous Owners</Label><Input placeholder="5" value={value.previousOwners || ''} onChange={(e) => updateField('previousOwners', e.target.value)} /></div>
            <div className="space-y-2"><Label>Last Sale Date</Label><Input type="date" value={value.lastSaleDate || ''} onChange={(e) => updateField('lastSaleDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Last Sale Price</Label><Input type="number" placeholder="45000000" value={value.lastSalePrice || ''} onChange={(e) => updateField('lastSalePrice', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Current Appraisal *</Label><Input type="number" placeholder="52000000" value={value.currentAppraisal || ''} onChange={(e) => updateField('currentAppraisal', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Appraiser Name</Label><Input placeholder="Sothebys" value={value.appraiserName || ''} onChange={(e) => updateField('appraiserName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Appraisal Date *</Label><Input type="date" value={value.appraisalDate || ''} onChange={(e) => updateField('appraisalDate', e.target.value)} /></div>
            <div className="space-y-2"><Label>Valuation Method *</Label><Select value={value.valuationMethod} onValueChange={(v) => updateField('valuationMethod', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comparable_sales">Comparable Sales</SelectItem><SelectItem value="appraisal">Appraisal</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Custody & Insurance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Custodian *</Label><Input placeholder="Fine Art Storage Geneva" value={value.custodian || ''} onChange={(e) => updateField('custodian', e.target.value)} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input placeholder="Geneva, Switzerland" value={value.location || ''} onChange={(e) => updateField('location', e.target.value)} /></div>
            <div className="space-y-2"><Label>Storage Conditions</Label><Input placeholder="climate_controlled" value={value.storageConditions || ''} onChange={(e) => updateField('storageConditions', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Insured Value *</Label><Input type="number" placeholder="52000000" value={value.insuredValue || ''} onChange={(e) => updateField('insuredValue', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Insurance Carrier</Label><Input placeholder="Lloyd's of London" value={value.insuranceCarrier || ''} onChange={(e) => updateField('insuranceCarrier', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tokenization</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Total Tokens *</Label><Input type="number" placeholder="520000" value={value.totalTokens || ''} onChange={(e) => updateField('totalTokens', parseInt(e.target.value))} /></div>
            <div className="space-y-2"><Label>Price per Token *</Label><Input type="number" step="0.01" placeholder="100" value={value.pricePerToken || ''} onChange={(e) => updateField('pricePerToken', parseFloat(e.target.value))} /></div>
            <div className="space-y-2"><Label>Minimum Investment</Label><Input type="number" placeholder="1000" value={value.minimumInvestment || ''} onChange={(e) => updateField('minimumInvestment', parseFloat(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Exit Strategy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Lockup Period (days)</Label><Input type="number" placeholder="1825" value={value.lockupPeriod || ''} onChange={(e) => updateField('lockupPeriod', parseInt(e.target.value))} /></div>
            <div className="space-y-2"><Label>Exit Strategy *</Label><Input placeholder="auction_2030" value={value.exitStrategy || ''} onChange={(e) => updateField('exitStrategy', e.target.value)} /></div>
            <div className="space-y-2"><Label>Estimated Sale Date</Label><Input type="date" value={value.estimatedSaleDate || ''} onChange={(e) => updateField('estimatedSaleDate', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Estimated Sale Price</Label><Input type="number" placeholder="65000000" value={value.estimatedSalePrice || ''} onChange={(e) => updateField('estimatedSalePrice', parseFloat(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Authentication URI</Label><Input placeholder="ar://..." value={value.authenticationUri || ''} onChange={(e) => updateField('authenticationUri', e.target.value)} /></div>
            <div className="space-y-2"><Label>Provenance URI</Label><Input placeholder="ar://..." value={value.provenanceUri || ''} onChange={(e) => updateField('provenanceUri', e.target.value)} /></div>
            <div className="space-y-2"><Label>Image URI</Label><Input placeholder="ar://..." value={value.imageUri || ''} onChange={(e) => updateField('imageUri', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
