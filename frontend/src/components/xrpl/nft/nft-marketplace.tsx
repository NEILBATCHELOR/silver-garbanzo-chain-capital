import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Loader2, 
  ShoppingCart,
  Tag,
  X
} from 'lucide-react'
import { XRPLNFTService } from '@/services/wallet/ripple/nft/XRPLNFTService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet } from 'xrpl'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NFTOffer {
  offerIndex: string
  owner: string
  amount: string | { currency: string; issuer: string; value: string }
  destination?: string
  expiration?: number
  nftId: string
}

interface NFTMarketplaceProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  nftId?: string
}

export const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({
  wallet,
  network = 'TESTNET',
  nftId
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sellOffers, setSellOffers] = useState<NFTOffer[]>([])
  const [buyOffers, setBuyOffers] = useState<NFTOffer[]>([])
  
  // Create offer dialog state
  const [createOfferOpen, setCreateOfferOpen] = useState(false)
  const [offerData, setOfferData] = useState({
    type: 'sell' as 'sell' | 'buy',
    nftId: nftId || '',
    amount: '',
    destination: '',
    owner: ''
  })

  const loadOffers = async (targetNftId: string) => {
    setLoading(true)
    try {
      const nftService = new XRPLNFTService(network)

      const [sellOffersData, buyOffersData] = await Promise.all([
        nftService.getNFTSellOffers(targetNftId),
        nftService.getNFTBuyOffers(targetNftId)
      ])

      setSellOffers(sellOffersData.map(offer => ({
        ...offer,
        nftId: targetNftId
      })))
      setBuyOffers(buyOffersData.map(offer => ({
        ...offer,
        nftId: targetNftId
      })))
    } catch (error) {
      console.error('Failed to load offers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load NFT offers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSellOffer = async () => {
    try {
      const nftService = new XRPLNFTService(network)

      await nftService.createSellOffer({
        wallet,
        nftId: offerData.nftId,
        amount: offerData.amount,
        destination: offerData.destination || undefined
      })

      toast({
        title: 'Sell Offer Created',
        description: 'Your NFT is now listed for sale'
      })

      setCreateOfferOpen(false)
      setOfferData({
        type: 'sell',
        nftId: '',
        amount: '',
        destination: '',
        owner: ''
      })
      
      if (offerData.nftId) {
        loadOffers(offerData.nftId)
      }
    } catch (error) {
      console.error('Failed to create sell offer:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create offer',
        variant: 'destructive'
      })
    }
  }

  const handleCreateBuyOffer = async () => {
    try {
      const nftService = new XRPLNFTService(network)

      await nftService.createBuyOffer({
        wallet,
        nftId: offerData.nftId,
        owner: offerData.owner,
        amount: offerData.amount
      })

      toast({
        title: 'Buy Offer Created',
        description: 'Your offer has been submitted'
      })

      setCreateOfferOpen(false)
      setOfferData({
        type: 'sell',
        nftId: '',
        amount: '',
        destination: '',
        owner: ''
      })
      
      if (offerData.nftId) {
        loadOffers(offerData.nftId)
      }
    } catch (error) {
      console.error('Failed to create buy offer:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create offer',
        variant: 'destructive'
      })
    }
  }

  const handleAcceptOffer = async (offerIndex: string) => {
    try {
      const nftService = new XRPLNFTService(network)

      await nftService.acceptOffer(wallet, offerIndex)

      toast({
        title: 'Offer Accepted',
        description: 'NFT transfer completed successfully'
      })

      if (nftId) {
        loadOffers(nftId)
      }
    } catch (error) {
      console.error('Failed to accept offer:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept offer',
        variant: 'destructive'
      })
    }
  }

  const handleCancelOffer = async (offerIndex: string) => {
    try {
      const nftService = new XRPLNFTService(network)

      await nftService.cancelOffer(wallet, [offerIndex])

      toast({
        title: 'Offer Cancelled',
        description: 'The offer has been removed'
      })

      if (nftId) {
        loadOffers(nftId)
      }
    } catch (error) {
      console.error('Failed to cancel offer:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel offer',
        variant: 'destructive'
      })
    }
  }

  const formatAmount = (amount: string | { currency: string; issuer: string; value: string }): string => {
    if (typeof amount === 'string') {
      return `${(parseInt(amount) / 1_000_000).toFixed(2)} XRP`
    }
    return `${amount.value} ${amount.currency}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>NFT Marketplace</CardTitle>
            <CardDescription>
              Buy and sell NFTs on the XRP Ledger
            </CardDescription>
          </div>
          <Dialog open={createOfferOpen} onOpenChange={setCreateOfferOpen}>
            <DialogTrigger asChild>
              <Button>
                <Tag className="h-4 w-4 mr-2" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create NFT Offer</DialogTitle>
                <DialogDescription>
                  Create a buy or sell offer for an NFT
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Offer Type</Label>
                  <Select
                    value={offerData.type}
                    onValueChange={(value: 'sell' | 'buy') => 
                      setOfferData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sell">Sell Offer</SelectItem>
                      <SelectItem value="buy">Buy Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nftId">NFT ID</Label>
                  <Input
                    id="nftId"
                    placeholder="NFT ID..."
                    value={offerData.nftId}
                    onChange={(e) => setOfferData(prev => ({ 
                      ...prev, 
                      nftId: e.target.value 
                    }))}
                  />
                </div>

                {offerData.type === 'buy' && (
                  <div className="space-y-2">
                    <Label htmlFor="owner">Current Owner</Label>
                    <Input
                      id="owner"
                      placeholder="rXXXXXXXXXXXXX"
                      value={offerData.owner}
                      onChange={(e) => setOfferData(prev => ({ 
                        ...prev, 
                        owner: e.target.value 
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (drops for XRP)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000000"
                    value={offerData.amount}
                    onChange={(e) => setOfferData(prev => ({ 
                      ...prev, 
                      amount: e.target.value 
                    }))}
                  />
                </div>

                {offerData.type === 'sell' && (
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination (optional)</Label>
                    <Input
                      id="destination"
                      placeholder="rXXXXXXXXXXXXX"
                      value={offerData.destination}
                      onChange={(e) => setOfferData(prev => ({ 
                        ...prev, 
                        destination: e.target.value 
                      }))}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOfferOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={offerData.type === 'sell' ? handleCreateSellOffer : handleCreateBuyOffer}
                >
                  Create Offer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sell" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sell">Sell Offers</TabsTrigger>
            <TabsTrigger value="buy">Buy Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="space-y-4">
            {sellOffers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sell offers available
              </div>
            ) : (
              <div className="space-y-3">
                {sellOffers.map((offer) => (
                  <Card key={offer.offerIndex} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>Sell Offer</Badge>
                          {offer.destination && (
                            <Badge variant="outline">Private</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Seller: {offer.owner.slice(0, 8)}...{offer.owner.slice(-6)}
                        </p>
                        <p className="text-lg font-semibold mt-1">
                          {formatAmount(offer.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {offer.owner === wallet.address ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOffer(offer.offerIndex)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(offer.offerIndex)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Buy
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="buy" className="space-y-4">
            {buyOffers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No buy offers available
              </div>
            ) : (
              <div className="space-y-3">
                {buyOffers.map((offer) => (
                  <Card key={offer.offerIndex} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="mb-2">Buy Offer</Badge>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {offer.owner.slice(0, 8)}...{offer.owner.slice(-6)}
                        </p>
                        <p className="text-lg font-semibold mt-1">
                          {formatAmount(offer.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {offer.owner === wallet.address ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOffer(offer.offerIndex)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(offer.offerIndex)}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
