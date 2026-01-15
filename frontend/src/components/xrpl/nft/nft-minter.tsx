import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Image as ImageIcon, Upload } from 'lucide-react'
import { XRPLNFTService } from '@/services/wallet/ripple/nft/XRPLNFTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet } from 'xrpl'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

interface NFTMinterProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onSuccess?: (nftId: string) => void
}

export const NFTMinter: React.FC<NFTMinterProps> = ({
  wallet,
  network = 'TESTNET',
  onSuccess
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    externalUrl: '',
    collection: '',
    taxon: 0,
    transferFee: 0,
    attributes: [] as Array<{ trait_type: string; value: string }>,
    // Flags
    burnable: false,
    onlyXRP: false,
    transferable: true
  })

  const [newAttribute, setNewAttribute] = useState({ trait_type: '', value: '' })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const addAttribute = () => {
    if (!newAttribute.trait_type || !newAttribute.value) {
      toast({
        title: 'Validation Error',
        description: 'Both trait type and value are required',
        variant: 'destructive'
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, newAttribute]
    }))
    setNewAttribute({ trait_type: '', value: '' })
  }

  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.name) return 'NFT name is required'
    if (!formData.description) return 'Description is required'
    if (!formData.imageUrl) return 'Image URL is required'
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

    setLoading(true)
    try {
      const nftService = new XRPLNFTService(network)

      // Create metadata JSON and convert to URI
      const metadata = {
        name: formData.name,
        description: formData.description,
        image: formData.imageUrl,
        external_url: formData.externalUrl || undefined,
        collection: formData.collection || undefined,
        attributes: formData.attributes.length > 0 ? formData.attributes : undefined,
        creator: wallet.address
      }

      const metadataUri = `ipfs://metadata/${JSON.stringify(metadata)}`

      const result = await nftService.mintNFT({
        minter: wallet,
        uri: metadataUri,
        flags: {
          burnable: formData.burnable,
          onlyXRP: formData.onlyXRP,
          transferable: formData.transferable
        },
        transferFee: formData.transferFee || undefined,
        taxon: formData.taxon || 0
      })

      toast({
        title: 'NFT Minted Successfully',
        description: (
          <div className="space-y-2">
            <p>NFT ID: {result.nftId.slice(0, 16)}...</p>
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

      onSuccess?.(result.nftId)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        externalUrl: '',
        collection: '',
        taxon: 0,
        transferFee: 0,
        attributes: [],
        burnable: false,
        onlyXRP: false,
        transferable: true
      })
    } catch (error) {
      console.error('Failed to mint NFT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mint NFT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint NFT</CardTitle>
        <CardDescription>
          Create a new Non-Fungible Token on the XRP Ledger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">NFT Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Awesome NFT"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your NFT..."
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                placeholder="https://... or ipfs://..."
                value={formData.imageUrl}
                onChange={handleInputChange}
                required
              />
              {formData.imageUrl && (
                <div className="mt-2 border rounded-lg p-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="NFT Preview"
                    className="w-full h-48 object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-nft.png'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="externalUrl">External URL</Label>
                <Input
                  id="externalUrl"
                  name="externalUrl"
                  placeholder="https://..."
                  value={formData.externalUrl}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collection">Collection Name</Label>
                <Input
                  id="collection"
                  name="collection"
                  placeholder="My Collection"
                  value={formData.collection}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Attributes</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Input
                  placeholder="Trait Type"
                  value={newAttribute.trait_type}
                  onChange={(e) => setNewAttribute(prev => ({ 
                    ...prev, 
                    trait_type: e.target.value 
                  }))}
                />
              </div>
              <div className="col-span-1">
                <Input
                  placeholder="Value"
                  value={newAttribute.value}
                  onChange={(e) => setNewAttribute(prev => ({ 
                    ...prev, 
                    value: e.target.value 
                  }))}
                />
              </div>
              <Button type="button" onClick={addAttribute}>
                Add
              </Button>
            </div>

            {formData.attributes.length > 0 && (
              <div className="space-y-2">
                {formData.attributes.map((attr, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{attr.trait_type}:</span> {attr.value}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttribute(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NFT Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">NFT Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxon">Taxon (Collection ID)</Label>
                <Input
                  id="taxon"
                  name="taxon"
                  type="number"
                  min="0"
                  value={formData.taxon}
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

          {/* Flags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">NFT Capabilities</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Transferable</Label>
                  <p className="text-sm text-muted-foreground">
                    NFT can be transferred to other wallets
                  </p>
                </div>
                <Switch
                  checked={formData.transferable}
                  onCheckedChange={(checked) => handleSwitchChange('transferable', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Burnable</Label>
                  <p className="text-sm text-muted-foreground">
                    Owner can permanently destroy this NFT
                  </p>
                </div>
                <Switch
                  checked={formData.burnable}
                  onCheckedChange={(checked) => handleSwitchChange('burnable', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Only XRP</Label>
                  <p className="text-sm text-muted-foreground">
                    Can only be traded for XRP (not tokens)
                  </p>
                </div>
                <Switch
                  checked={formData.onlyXRP}
                  onCheckedChange={(checked) => handleSwitchChange('onlyXRP', checked)}
                />
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              NFT properties cannot be changed after minting. Review carefully before proceeding.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting NFT...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Mint NFT
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
