import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Info } from 'lucide-react'
import { XRPLMPTService } from '@/services/wallet/ripple/mpt/XRPLMPTService'
import { AssetClassificationSelector } from './AssetClassificationSelector'
import { URIManager, type URI } from './URIManager'
import { AdditionalInfoEditor } from './AdditionalInfoEditor'
import { validateAssetClassification, type AssetClass, type AssetSubclass } from '@/types/xrpl/asset-taxonomy'
import { 
  convertToRawAmount, 
  getSupplyExamples,
  parseAmountShorthand,
  formatWithShorthand,
  validateAmountInput
} from '@/services/wallet/ripple/mpt/utils'
import type { Wallet } from 'xrpl'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

interface MPTCreatorProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  projectId?: string
  onSuccess?: (issuanceId: string) => void
}

export const MPTCreator: React.FC<MPTCreatorProps> = ({
  wallet,
  network = 'TESTNET',
  projectId,
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    description: '',
    assetScale: 6,
    maximumAmount: '',
    transferFee: 0,
    icon: '',
    issuerName: '',
    // Flags
    canTransfer: true,
    canTrade: false,
    canEscrow: false,
    canLock: false,
    canClawback: false,
    requireAuth: false
  })

  // XLS-89 compliant metadata
  const [uris, setUris] = useState<URI[]>([])
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, any>>({})

  // Asset classification state (separate from formData for better control)
  const [assetClass, setAssetClass] = useState<AssetClass | null>(null)
  const [assetSubclass, setAssetSubclass] = useState<AssetSubclass | null>(null)
  const [classificationError, setClassificationError] = useState<string>('')

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    
    // For maximumAmount, parse shorthand notation (100k, 10M, etc.)
    if (name === 'maximumAmount') {
      setFormData(prev => ({ ...prev, [name]: value }))
      return
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleAssetClassChange = (newClass: AssetClass | null) => {
    setAssetClass(newClass)
    setClassificationError('')
  }

  const handleAssetSubclassChange = (newSubclass: AssetSubclass | null) => {
    setAssetSubclass(newSubclass)
    setClassificationError('')
  }

  const validateForm = (): string | null => {
    if (!formData.ticker || formData.ticker.length > 10) {
      return 'Ticker is required and must be 10 characters or less'
    }
    if (!formData.name) {
      return 'Token name is required'
    }
    if (!formData.description) {
      return 'Description is required'
    }
    if (formData.assetScale < 0 || formData.assetScale > 19) {
      return 'Asset scale must be between 0 and 19'
    }
    if (formData.transferFee < 0 || formData.transferFee > 50000) {
      return 'Transfer fee must be between 0 and 50000 (0-50%)'
    }
    // XRPL validation: TransferFee requires canTransfer flag to be enabled
    if (formData.transferFee > 0 && !formData.canTransfer) {
      return 'Transfer fee requires "Can Transfer" to be enabled'
    }
    
    // Validate asset classification (XLS-89 requirement)
    const classificationValidation = validateAssetClassification(assetClass, assetSubclass)
    if (!classificationValidation.valid) {
      setClassificationError(classificationValidation.error || '')
      return classificationValidation.error || 'Invalid asset classification'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    if (!projectId) {
      toast({
        title: 'Error',
        description: 'No active project selected',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const mptService = new XRPLMPTService(network)

      // Parse numeric fields to integers as required by XRPL
      const assetScale = typeof formData.assetScale === 'string' 
        ? parseInt(formData.assetScale, 10) 
        : formData.assetScale;
      
      const transferFee = formData.transferFee 
        ? (typeof formData.transferFee === 'string' 
            ? parseInt(formData.transferFee, 10) 
            : formData.transferFee)
        : undefined;

      // Convert display value to raw amount based on AssetScale
      // CRITICAL: User enters display value (e.g., 100 for 100 tokens, or "100k" for 100,000 tokens)
      // Step 1: Parse shorthand notation (100k → 100000, 10M → 10000000)
      // Step 2: Convert to raw amount: raw = display × (10^assetScale)
      const maximumAmount = formData.maximumAmount 
        ? (() => {
            const parsed = parseAmountShorthand(formData.maximumAmount);
            const validation = validateAmountInput(formData.maximumAmount);
            
            if (!validation.valid) {
              throw new Error(validation.error || 'Invalid amount');
            }
            
            return convertToRawAmount(parsed, assetScale);
          })()
        : undefined;

      const result = await mptService.createMPTIssuance({
        projectId: projectId,
        issuerWallet: wallet,
        assetScale,
        maximumAmount,
        transferFee,
        metadata: {
          ticker: formData.ticker,
          name: formData.name,
          desc: formData.description,
          icon: formData.icon || undefined,
          asset_class: assetClass || undefined,
          asset_subclass: assetSubclass || undefined,
          issuer_name: formData.issuerName || undefined,
          uris: uris.length > 0 ? uris : undefined,
          additional_info: Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined
        },
        flags: {
          canTransfer: formData.canTransfer,
          canTrade: formData.canTrade,
          canEscrow: formData.canEscrow,
          canLock: formData.canLock,
          canClawback: formData.canClawback,
          requireAuth: formData.requireAuth
        }
      })

      toast({
        title: 'MPT Created Successfully',
        description: (
          <div className="space-y-2">
            <p>Issuance ID: {result.issuanceId}</p>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline block"
            >
              View on Explorer
            </a>
          </div>
        )
      })

      onSuccess?.(result.issuanceId)
      
      // Reset form
      setFormData({
        ticker: '',
        name: '',
        description: '',
        assetScale: 6,
        maximumAmount: '',
        transferFee: 0,
        icon: '',
        issuerName: '',
        canTransfer: true,
        canTrade: false,
        canEscrow: false,
        canLock: false,
        canClawback: false,
        requireAuth: false
      })
      setAssetClass(null)
      setAssetSubclass(null)
      setUris([])
      setAdditionalInfo({})
    } catch (error) {
      console.error('Failed to create MPT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create MPT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Multi-Purpose Token (MPT)</CardTitle>
        <CardDescription>
          Issue a new token on the XRP Ledger with advanced features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker Symbol *</Label>
                <Input
                  id="ticker"
                  name="ticker"
                  placeholder="USDC"
                  value={formData.ticker}
                  onChange={handleInputChange}
                  maxLength={10}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Token Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="USD Coin"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="A stablecoin pegged to USD..."
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon URL</Label>
              <Input
                id="icon"
                name="icon"
                placeholder="https://..."
                value={formData.icon}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Asset Classification - Using AssetClassificationSelector */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Asset Classification (XLS-89)</h3>
            <AssetClassificationSelector
              assetClass={assetClass}
              assetSubclass={assetSubclass}
              onAssetClassChange={handleAssetClassChange}
              onAssetSubclassChange={handleAssetSubclassChange}
              disabled={loading}
              error={classificationError}
              showExamples={true}
            />
          </div>

          {/* URIs (XLS-89) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">URIs & Links (XLS-89)</h3>
            <URIManager
              uris={uris}
              onChange={setUris}
              disabled={loading}
            />
          </div>

          {/* Additional Information (XLS-89) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information (XLS-89)</h3>
            <AdditionalInfoEditor
              additionalInfo={additionalInfo}
              onChange={setAdditionalInfo}
              disabled={loading}
              showPresets={true}
            />
          </div>

          {/* Token Economics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Token Economics</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetScale">Decimal Places</Label>
                <Input
                  id="assetScale"
                  name="assetScale"
                  type="number"
                  min="0"
                  max="19"
                  value={formData.assetScale}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  0 = whole numbers, 2 = cents (USD), 6 = crypto standard
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="maximumAmount">Max Supply (Display Value)</Label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="maximumAmount"
                  name="maximumAmount"
                  placeholder="e.g., 100M, 1B, or 100000000"
                  value={formData.maximumAmount}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.maximumAmount && formData.assetScale !== undefined ? (
                    (() => {
                      try {
                        const parsed = parseAmountShorthand(formData.maximumAmount);
                        const validation = validateAmountInput(formData.maximumAmount);
                        
                        if (!validation.valid) {
                          return <span className="text-destructive">{validation.error}</span>;
                        }
                        
                        const raw = convertToRawAmount(parsed, formData.assetScale);
                        const formatted = formatWithShorthand(parsed);
                        
                        return (
                          <>
                            Display: <span className="font-mono">{formatted}</span> → 
                            Raw: <span className="font-mono">{raw}</span>
                          </>
                        );
                      } catch (e) {
                        return <span className="text-destructive">Invalid format</span>;
                      }
                    })()
                  ) : (
                    'Supports shorthand: 100k, 10M, 1B, etc.'
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transferFee">Transfer Fee (0-50,000 max)</Label>
                <Input
                  id="transferFee"
                  name="transferFee"
                  type="number"
                  min="0"
                  max="50000"
                  value={formData.transferFee}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Fee in 1/100,000 units (1 = 0.001%, 1000 = 1%, 50000 = 50%). Requires "Allow Transfers".
                </p>
              </div>
            </div>

            {/* Supply Calculator Help */}
            {formData.assetScale !== undefined && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Supply Examples (AssetScale={formData.assetScale})</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-xs">
                    {getSupplyExamples(formData.assetScale).slice(0, 4).map((example, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{example.description}:</span>
                        <span className="font-mono">Display: {example.display} → Raw: {example.raw}</span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="issuerName">Issuer Name</Label>
              <Input
                id="issuerName"
                name="issuerName"
                placeholder="Your legal entity name"
                value={formData.issuerName}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Flags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Token Capabilities</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Transfers</Label>
                  <p className="text-sm text-muted-foreground">
                    Holders can transfer tokens to others. Required for transfer fees.
                  </p>
                </div>
                <Switch
                  checked={formData.canTransfer}
                  onCheckedChange={(checked) => handleSwitchChange('canTransfer', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Trading</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable DEX trading
                  </p>
                </div>
                <Switch
                  checked={formData.canTrade}
                  onCheckedChange={(checked) => handleSwitchChange('canTrade', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Escrow</Label>
                  <p className="text-sm text-muted-foreground">
                    Holders can place balances into escrow
                  </p>
                </div>
                <Switch
                  checked={formData.canEscrow}
                  onCheckedChange={(checked) => handleSwitchChange('canEscrow', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Locking</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable token locking features
                  </p>
                </div>
                <Switch
                  checked={formData.canLock}
                  onCheckedChange={(checked) => handleSwitchChange('canLock', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Clawback</Label>
                  <p className="text-sm text-muted-foreground">
                    Issuer can retrieve tokens (for compliance)
                  </p>
                </div>
                <Switch
                  checked={formData.canClawback}
                  onCheckedChange={(checked) => handleSwitchChange('canClawback', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Authorization</Label>
                  <p className="text-sm text-muted-foreground">
                    Holders must be authorized before receiving tokens
                  </p>
                </div>
                <Switch
                  checked={formData.requireAuth}
                  onCheckedChange={(checked) => handleSwitchChange('requireAuth', checked)}
                />
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Once created, most token capabilities cannot be changed. Only locking status can be modified later. Choose carefully.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating MPT...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create MPT
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
