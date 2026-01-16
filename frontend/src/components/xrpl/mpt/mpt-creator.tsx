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
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { usePrimaryProject } from '@/hooks/project/usePrimaryProject'
import type { Wallet } from 'xrpl'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

interface MPTCreatorProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onSuccess?: (issuanceId: string) => void
}

export const MPTCreator: React.FC<MPTCreatorProps> = ({
  wallet,
  network = 'TESTNET',
  onSuccess
}) => {
  const { toast } = useToast()
  const { primaryProject } = usePrimaryProject()
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
    assetClass: '',
    issuerName: '',
    website: '',
    // Flags
    canTransfer: true,
    canTrade: false,
    canLock: false,
    canClawback: false,
    requireAuth: false
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
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

    if (!primaryProject?.id) {
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

      const uris = []
      if (formData.website) {
        uris.push({
          uri: formData.website,
          category: 'website',
          title: 'Official Website'
        })
      }

      const result = await mptService.createMPTIssuance({
        projectId: primaryProject.id,
        issuerWallet: wallet,
        assetScale: formData.assetScale,
        maximumAmount: formData.maximumAmount || undefined,
        transferFee: formData.transferFee || undefined,
        metadata: {
          ticker: formData.ticker,
          name: formData.name,
          desc: formData.description,
          icon: formData.icon || undefined,
          asset_class: formData.assetClass || undefined,
          issuer_name: formData.issuerName || undefined,
          uris: uris.length > 0 ? uris : undefined
        },
        flags: {
          canTransfer: formData.canTransfer,
          canTrade: formData.canTrade,
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
              className="text-primary hover:underline"
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
        assetClass: '',
        issuerName: '',
        website: '',
        canTransfer: true,
        canTrade: false,
        canLock: false,
        canClawback: false,
        requireAuth: false
      })
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

            <div className="grid grid-cols-2 gap-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  placeholder="https://..."
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </div>
            </div>
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maximumAmount">Max Supply (optional)</Label>
                <Input
                  id="maximumAmount"
                  name="maximumAmount"
                  placeholder="1000000"
                  value={formData.maximumAmount}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transferFee">Transfer Fee (0-50000)</Label>
                <Input
                  id="transferFee"
                  name="transferFee"
                  type="number"
                  min="0"
                  max="50000"
                  value={formData.transferFee}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetClass">Asset Class</Label>
                <Input
                  id="assetClass"
                  name="assetClass"
                  placeholder="rwa, currency, commodity..."
                  value={formData.assetClass}
                  onChange={handleInputChange}
                />
              </div>
              
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
          </div>

          {/* Flags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Token Capabilities</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Transfers</Label>
                  <p className="text-sm text-muted-foreground">
                    Holders can transfer tokens to others
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
              Once created, token capabilities cannot be changed. Choose carefully.
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
