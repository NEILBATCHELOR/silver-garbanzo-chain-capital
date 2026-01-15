import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { 
  Loader2, 
  ExternalLink, 
  Copy,
  Tag,
  Trash2,
  Image as ImageIcon
} from 'lucide-react'
import { XRPLNFTService } from '@/services/wallet/ripple/nft/XRPLNFTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet } from 'xrpl'

interface NFTDetailsProps {
  nftId: string
  wallet?: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onCreateOffer?: () => void
  onBurn?: () => void
}

interface NFTData {
  nftId: string
  uri: string
  flags: number
  issuer: string
  transferFee: number
  serial: number
  taxon: number
  owner?: string
  metadata?: {
    name?: string
    description?: string
    image?: string
    external_url?: string
    collection?: string
    attributes?: Array<{ trait_type: string; value: string }>
    creator?: string
  }
}

export const NFTDetails: React.FC<NFTDetailsProps> = ({
  nftId,
  wallet,
  network = 'TESTNET',
  onCreateOffer,
  onBurn
}) => {
  const { toast } = useToast()
  const [nft, setNft] = useState<NFTData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNFTDetails()
  }, [nftId])

  const loadNFTDetails = async () => {
    setLoading(true)
    try {
      const nftService = new XRPLNFTService(network)
      const client = await xrplClientManager.getClient(network)

      // Get NFT details from ledger
      const response = await client.request({
        command: 'nft_info',
        nft_id: nftId,
        ledger_index: 'validated'
      })

      const nftData = response.result

      // Parse metadata from URI
      let metadata = undefined
      if (nftData.uri) {
        const uri = Buffer.from(nftData.uri, 'hex').toString('utf8')
        try {
          if (uri.includes('ipfs://metadata/')) {
            const jsonStr = uri.replace('ipfs://metadata/', '')
            metadata = JSON.parse(jsonStr)
          }
        } catch (error) {
          console.error('Failed to parse metadata:', error)
        }
      }

      setNft({
        nftId,
        uri: nftData.uri ? Buffer.from(nftData.uri, 'hex').toString('utf8') : '',
        flags: nftData.flags,
        issuer: nftData.issuer,
        transferFee: nftData.transfer_fee || 0,
        serial: nftData.nft_serial,
        taxon: nftData.nft_taxon,
        owner: nftData.owner,
        metadata
      })
    } catch (error) {
      console.error('Failed to load NFT details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load NFT details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    })
  }

  const getExplorerUrl = (): string => {
    const baseUrls = {
      MAINNET: 'https://livenet.xrpl.org',
      TESTNET: 'https://testnet.xrpl.org',
      DEVNET: 'https://devnet.xrpl.org'
    }
    return `${baseUrls[network]}/nft/${nftId}`
  }

  const isBurnable = (): boolean => {
    return nft ? (nft.flags & 0x00000001) !== 0 : false
  }

  const isTransferable = (): boolean => {
    return nft ? (nft.flags & 0x00000008) !== 0 : true
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!nft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NFT Not Found</CardTitle>
          <CardDescription>
            Unable to load NFT details
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {nft.metadata?.name || `NFT #${nft.serial}`}
            </CardTitle>
            <CardDescription>
              {nft.metadata?.collection && `${nft.metadata.collection} • `}
              Taxon {nft.taxon}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(getExplorerUrl(), '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NFT Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {nft.metadata?.image ? (
            <img 
              src={nft.metadata.image}
              alt={nft.metadata.name || 'NFT'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-nft.png'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Description */}
        {nft.metadata?.description && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">
              {nft.metadata.description}
            </p>
          </div>
        )}

        {/* Attributes */}
        {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Attributes</h4>
            <div className="grid grid-cols-2 gap-3">
              {nft.metadata.attributes.map((attr, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase mb-1">
                    {attr.trait_type}
                  </p>
                  <p className="text-sm font-semibold">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Properties */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Properties</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">NFT ID</span>
              <div className="flex items-center gap-2">
                <code className="text-xs">
                  {nft.nftId.slice(0, 8)}...{nft.nftId.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(nft.nftId, 'NFT ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Issuer</span>
              <div className="flex items-center gap-2">
                <code className="text-xs">
                  {nft.issuer.slice(0, 8)}...{nft.issuer.slice(-6)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(nft.issuer, 'Issuer')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {nft.owner && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Owner</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">
                    {nft.owner.slice(0, 8)}...{nft.owner.slice(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(nft.owner, 'Owner')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Serial</span>
              <span className="text-sm font-mono">#{nft.serial}</span>
            </div>

            {nft.transferFee > 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Transfer Fee</span>
                <Badge variant="secondary">
                  {(nft.transferFee / 1000).toFixed(2)}%
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Capabilities</span>
              <div className="flex gap-2">
                <Badge variant={isTransferable() ? 'default' : 'secondary'}>
                  {isTransferable() ? 'Transferable' : 'Locked'}
                </Badge>
                {isBurnable() && (
                  <Badge variant="destructive">Burnable</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* External Links */}
        {nft.metadata?.external_url && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(nft.metadata!.external_url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View External Site
          </Button>
        )}

        {/* Actions */}
        {wallet && nft.owner === wallet.address && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={onCreateOffer}
            >
              <Tag className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
            {isBurnable() && (
              <Button
                variant="destructive"
                onClick={onBurn}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Burn
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
