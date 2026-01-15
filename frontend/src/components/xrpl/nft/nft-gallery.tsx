import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { 
  Loader2, 
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Tag,
  Trash2
} from 'lucide-react'
import { XRPLNFTService } from '@/services/wallet/ripple/nft/XRPLNFTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet } from 'xrpl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NFT {
  nftId: string
  uri: string
  flags: number
  issuer: string
  transferFee: number
  serial: number
  taxon: number
  metadata?: {
    name?: string
    description?: string
    image?: string
    attributes?: Array<{ trait_type: string; value: string }>
  }
}

interface NFTGalleryProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  onSelectNFT?: (nft: NFT) => void
}

export const NFTGallery: React.FC<NFTGalleryProps> = ({
  wallet,
  network = 'TESTNET',
  onSelectNFT
}) => {
  const { toast } = useToast()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null)

  useEffect(() => {
    loadNFTs()
  }, [wallet])

  const loadNFTs = async () => {
    setLoading(true)
    try {
      const nftService = new XRPLNFTService(network)

      const accountNfts = await nftService.getAccountNFTs(wallet.address)

      // Parse metadata from URI for each NFT
      const nftsWithMetadata = await Promise.all(
        accountNfts.map(async (nft) => {
          let metadata = undefined
          if (nft.uri) {
            try {
              // If URI contains JSON metadata
              if (nft.uri.includes('ipfs://metadata/')) {
                const jsonStr = nft.uri.replace('ipfs://metadata/', '')
                metadata = JSON.parse(jsonStr)
              }
            } catch (error) {
              console.error('Failed to parse NFT metadata:', error)
            }
          }

          return {
            ...nft,
            metadata
          }
        })
      )

      setNfts(nftsWithMetadata)
    } catch (error) {
      console.error('Failed to load NFTs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load NFT collection',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBurnNFT = async (nftId: string) => {
    if (!confirm('Are you sure you want to burn this NFT? This action cannot be undone.')) {
      return
    }

    try {
      const nftService = new XRPLNFTService(network)

      await nftService.burnNFT(wallet, nftId)

      toast({
        title: 'NFT Burned',
        description: 'The NFT has been permanently destroyed'
      })

      loadNFTs()
    } catch (error) {
      console.error('Failed to burn NFT:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to burn NFT',
        variant: 'destructive'
      })
    }
  }

  const isBurnable = (flags: number): boolean => {
    return (flags & 0x00000001) !== 0
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My NFT Collection</CardTitle>
          <CardDescription>Loading your NFTs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My NFT Collection</CardTitle>
            <CardDescription>
              {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} in your wallet
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadNFTs}>
            <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {nfts.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No NFTs Yet</h3>
            <p className="text-sm text-muted-foreground">
              Mint your first NFT to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nfts.map((nft) => (
              <Dialog key={nft.nftId}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {/* NFT Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden rounded-t-lg">
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
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {nft.transferFee > 0 && (
                          <Badge className="absolute top-2 right-2" variant="secondary">
                            {(nft.transferFee / 1000).toFixed(1)}% Fee
                          </Badge>
                        )}
                      </div>

                      {/* NFT Info */}
                      <div className="p-3 space-y-1">
                        <h4 className="font-semibold truncate">
                          {nft.metadata?.name || `NFT #${nft.serial}`}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Taxon: {nft.taxon}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {nft.metadata?.name || 'NFT Details'}
                    </DialogTitle>
                    <DialogDescription>
                      #{nft.serial} • Taxon {nft.taxon}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Image */}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {nft.metadata?.image ? (
                        <img 
                          src={nft.metadata.image}
                          alt={nft.metadata.name || 'NFT'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                      {nft.metadata?.description && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Description</h4>
                          <p className="text-sm text-muted-foreground">
                            {nft.metadata.description}
                          </p>
                        </div>
                      )}

                      {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Attributes</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {nft.metadata.attributes.map((attr, index) => (
                              <div key={index} className="border rounded p-2">
                                <p className="text-xs text-muted-foreground">
                                  {attr.trait_type}
                                </p>
                                <p className="text-sm font-medium">{attr.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Details</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">NFT ID:</span>
                            <code className="text-xs">
                              {nft.nftId.slice(0, 8)}...{nft.nftId.slice(-6)}
                            </code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Issuer:</span>
                            <code className="text-xs">
                              {nft.issuer.slice(0, 8)}...{nft.issuer.slice(-6)}
                            </code>
                          </div>
                          {nft.transferFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Transfer Fee:</span>
                              <span>{(nft.transferFee / 1000).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => onSelectNFT?.(nft)}
                        >
                          <Tag className="h-4 w-4 mr-2" />
                          Create Offer
                        </Button>
                        {isBurnable(nft.flags) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBurnNFT(nft.nftId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
