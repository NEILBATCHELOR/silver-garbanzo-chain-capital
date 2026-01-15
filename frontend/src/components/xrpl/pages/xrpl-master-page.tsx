/**
 * XRPL Master Page
 * Main entry point for XRPL integration with all components accessible
 * 
 * Features:
 * - Shared navigation and header
 * - Wallet management
 * - MPT tokens
 * - NFTs
 * - Payments
 * - Advanced features (channels, escrow, checks)
 * - Transaction history
 */

import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import type { Wallet } from 'xrpl'
import { XRPLDashboardHeader } from '../shared/xrpl-dashboard-header'
import { XRPLNavigation, XRPLStats } from '../shared/xrpl-navigation'
import { XRPLDashboard } from '../dashboard/xrpl-dashboard'
import { WalletConnect } from '../wallet/wallet-connect'
import { WalletBalance } from '../wallet/wallet-balance'
import { MPTCreator } from '../mpt/mpt-creator'
import { MPTManager } from '../mpt/mpt-manager'
import { MPTTransfer } from '../mpt/mpt-transfer'
import { NFTMinter } from '../nft/nft-minter'
import { NFTGallery } from '../nft/nft-gallery'
import { NFTMarketplace } from '../nft/nft-marketplace'
import { XRPPaymentForm } from '../payments/xrp-payment-form'
import { PaymentChannelManager } from '../payments/payment-channel-manager'
import { EscrowManager } from '../payments/escrow-manager'
import { CheckManager } from '../payments/check-manager'
import { TransactionHistory } from '../transactions/transaction-history'
import { TransactionMonitor } from '../transactions/transaction-monitor'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function XRPLMasterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [network, setNetwork] = useState<'MAINNET' | 'TESTNET' | 'DEVNET'>('TESTNET')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    mptCount: 0,
    nftCount: 0,
    transactionCount: 0
  })

  const handleWalletConnected = (connectedWallet: Wallet, selectedNetwork: string) => {
    setWallet(connectedWallet)
    setNetwork(selectedNetwork as 'MAINNET' | 'TESTNET' | 'DEVNET')
    
    toast({
      title: 'Wallet Connected',
      description: `Connected to ${connectedWallet.address}`
    })
    
    // Refresh balance and stats
    handleRefresh()
  }

  const handleNetworkChange = (newNetwork: 'MAINNET' | 'TESTNET' | 'DEVNET') => {
    setNetwork(newNetwork)
    toast({
      title: 'Network Changed',
      description: `Switched to ${newNetwork}`
    })
  }

  const handleRefresh = async () => {
    if (!wallet) return
    
    setIsLoading(true)
    try {
      // TODO: Implement actual balance fetching
      // For now, mock data
      setWalletBalance('1000.00')
      setStats({
        mptCount: 3,
        nftCount: 5,
        transactionCount: 42
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectWallet = () => {
    navigate('/xrpl/wallet')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <XRPLDashboardHeader
        network={network}
        walletAddress={wallet?.address}
        walletBalance={walletBalance}
        onRefresh={handleRefresh}
        onNetworkChange={handleNetworkChange}
        onConnectWallet={handleConnectWallet}
        isLoading={isLoading}
        showMPT={true}
        showNFT={true}
        showPayments={true}
        onMPT={() => navigate('/xrpl/mpt')}
        onNFT={() => navigate('/xrpl/nfts')}
        onPayments={() => navigate('/xrpl/payments')}
      />

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <XRPLNavigation walletConnected={!!wallet} />
              </CardContent>
            </Card>

            {/* Stats Card */}
            {wallet && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <XRPLStats
                    walletBalance={walletBalance}
                    mptCount={stats.mptCount}
                    nftCount={stats.nftCount}
                    transactionCount={stats.transactionCount}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <Routes>
              {/* Dashboard */}
              <Route 
                path="/" 
                element={
                  <XRPLDashboard 
                    walletAddress={wallet?.address}
                    network={network}
                  />
                } 
              />

              {/* Wallet Management */}
              <Route 
                path="/wallet" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Wallet Management</CardTitle>
                      <CardDescription>
                        Connect, import, or generate your XRPL wallet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <WalletBalance wallet={wallet} network={network} />
                      ) : (
                        <WalletConnect 
                          onWalletConnected={handleWalletConnected}
                          network={network}
                        />
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* MPT Tokens */}
              <Route 
                path="/mpt" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Multi-Purpose Tokens (MPT)</CardTitle>
                      <CardDescription>
                        Create, manage, and transfer MPT tokens
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <Tabs defaultValue="manager">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="manager">Manager</TabsTrigger>
                            <TabsTrigger value="create">Create</TabsTrigger>
                            <TabsTrigger value="transfer">Transfer</TabsTrigger>
                          </TabsList>
                          <TabsContent value="manager">
                            <MPTManager wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="create">
                            <MPTCreator wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="transfer">
                            <MPTTransfer wallet={wallet} network={network} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-muted-foreground mb-4">Connect your wallet to manage MPT tokens</p>
                          <WalletConnect 
                            onWalletConnected={handleWalletConnected}
                            network={network}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* NFTs */}
              <Route 
                path="/nfts" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>NFT Management</CardTitle>
                      <CardDescription>
                        Mint, trade, and manage your NFTs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <Tabs defaultValue="gallery">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="gallery">My NFTs</TabsTrigger>
                            <TabsTrigger value="mint">Mint</TabsTrigger>
                            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                          </TabsList>
                          <TabsContent value="gallery">
                            <NFTGallery wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="mint">
                            <NFTMinter wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="marketplace">
                            <NFTMarketplace wallet={wallet} network={network} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-muted-foreground mb-4">Connect your wallet to manage NFTs</p>
                          <WalletConnect 
                            onWalletConnected={handleWalletConnected}
                            network={network}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* Payments */}
              <Route 
                path="/payments" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Payments</CardTitle>
                      <CardDescription>
                        Send XRP and tokens
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <XRPPaymentForm wallet={wallet} network={network} />
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-muted-foreground mb-4">Connect your wallet to send payments</p>
                          <WalletConnect 
                            onWalletConnected={handleWalletConnected}
                            network={network}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* Advanced Features */}
              <Route 
                path="/advanced" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Features</CardTitle>
                      <CardDescription>
                        Payment channels, escrow, and checks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <Tabs defaultValue="channels">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="channels">Payment Channels</TabsTrigger>
                            <TabsTrigger value="escrow">Escrow</TabsTrigger>
                            <TabsTrigger value="checks">Checks</TabsTrigger>
                          </TabsList>
                          <TabsContent value="channels">
                            <PaymentChannelManager wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="escrow">
                            <EscrowManager wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="checks">
                            <CheckManager wallet={wallet} network={network} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-muted-foreground mb-4">Connect your wallet to access advanced features</p>
                          <WalletConnect 
                            onWalletConnected={handleWalletConnected}
                            network={network}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                } 
              />

              {/* Transactions */}
              <Route 
                path="/transactions" 
                element={
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        View and monitor your transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {wallet ? (
                        <Tabs defaultValue="history">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="monitor">Monitor</TabsTrigger>
                          </TabsList>
                          <TabsContent value="history">
                            <TransactionHistory wallet={wallet} network={network} />
                          </TabsContent>
                          <TabsContent value="monitor">
                            <TransactionMonitor wallet={wallet} network={network} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="text-center p-8">
                          <p className="text-muted-foreground mb-4">Connect your wallet to view transactions</p>
                          <WalletConnect 
                            onWalletConnected={handleWalletConnected}
                            network={network}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                } 
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}

export default XRPLMasterPage
