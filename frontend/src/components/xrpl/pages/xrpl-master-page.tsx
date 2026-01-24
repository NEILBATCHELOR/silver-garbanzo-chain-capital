/**
 * XRPL Master Page
 * Main entry point for XRPL integration with all components accessible
 * 
 * Features:
 * - Horizontal navigation tabs (ClimateReceivables pattern)
 * - ALL 16 feature categories accessible
 * - Wallet management
 * - MPT tokens, NFTs, Payments
 * - DEX Trading, AMM Pools
 * - Multi-Sig, Identity, Compliance
 * - Security, Advanced Tools, Monitoring
 * - Transaction history
 * - Project-scoped data (when projectId provided)
 * 
 * Updated: Uses horizontal navigation instead of vertical sidebar
 */

import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import type { Wallet } from 'xrpl'
import { XRPLDashboardHeader } from '../shared/xrpl-dashboard-header'
import { XRPLNavigation, XRPLStats } from '../shared/xrpl-navigation'
import { XRPLUnifiedDashboard } from '../dashboard/xrpl-unified-dashboard'
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
import { XRPLMultiSigPage } from './xrpl-multisig-page'
import { XRPLAMMPage } from './xrpl-amm-page'
import { XRPLDEXPage } from './xrpl-dex-page'
import { XRPLIdentityPage } from './xrpl-identity-page'
import { XRPLCompliancePage } from './xrpl-compliance-page'
import { XRPLSecurityPage } from './xrpl-security-page'
import { XRPLAdvancedToolsPage } from './xrpl-advanced-tools-page'
import { XRPLMonitoringPage } from './xrpl-monitoring-page'
import { XRPLTrustLinesPage } from './xrpl-trustlines-page'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface XRPLMasterPageProps {
  projectId?: string
}

export function XRPLMasterPage({ projectId }: XRPLMasterPageProps) {
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
    const basePath = projectId ? `/projects/${projectId}/xrpl` : '/xrpl'
    navigate(`${basePath}/wallet`)
  }

  // Helper component for wallet-required routes
  const WalletRequiredCard: React.FC<{
    title: string
    description: string
    children: React.ReactNode
  }> = ({ title, description, children }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {wallet ? (
            children
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">Connect your wallet to access this feature</p>
              <WalletConnect 
                onWalletConnected={handleWalletConnected}
                network={network}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
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
        isLoading={isLoading}
        showMPT={true}
        showNFT={true}
        showPayments={true}
        onMPT={() => navigate('/mpt')}
        onNFT={() => navigate('/nfts')}
        onPayments={() => navigate('/payments')}
      />

      {/* HORIZONTAL NAVIGATION */}
      <XRPLNavigation projectId={projectId} />

      {/* MAIN CONTENT - Full Width */}
      <div className="container mx-auto p-6">
        {/* Stats Section */}
        {wallet && (
          <div className="mb-6">
            <XRPLStats
              walletBalance={walletBalance}
              mptCount={stats.mptCount}
              nftCount={stats.nftCount}
              transactionCount={stats.transactionCount}
            />
          </div>
        )}

        {/* Routes */}
        <Routes>
          {/* Dashboard */}
          <Route 
            path="/dashboard" 
            element={<XRPLUnifiedDashboard />} 
          />

          {/* Wallet Management */}
          <Route 
            path="/wallet" 
            element={
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Management</CardTitle>
                  <CardDescription>Connect, import, or generate your XRPL wallet</CardDescription>
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
              <WalletRequiredCard
                title="Multi-Purpose Tokens (MPT)"
                description="Create, manage, and transfer MPT tokens"
              >
                <Tabs defaultValue="manager">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="transfer">Transfer</TabsTrigger>
                  </TabsList>
                  <TabsContent value="manager">
                    <MPTManager wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="create">
                    <MPTCreator wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="transfer">
                    <MPTTransfer wallet={wallet!} network={network} />
                  </TabsContent>
                </Tabs>
              </WalletRequiredCard>
            } 
          />

          {/* NFTs */}
          <Route 
            path="/nfts" 
            element={
              <WalletRequiredCard
                title="NFT Management"
                description="Mint, trade, and manage your NFTs"
              >
                <Tabs defaultValue="gallery">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="gallery">My NFTs</TabsTrigger>
                    <TabsTrigger value="mint">Mint</TabsTrigger>
                    <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                  </TabsList>
                  <TabsContent value="gallery">
                    <NFTGallery wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="mint">
                    <NFTMinter wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="marketplace">
                    <NFTMarketplace wallet={wallet!} network={network} />
                  </TabsContent>
                </Tabs>
              </WalletRequiredCard>
            } 
          />

          {/* Payments */}
          <Route 
            path="/payments" 
            element={
              <WalletRequiredCard
                title="Payments"
                description="Send XRP and tokens"
              >
                <XRPPaymentForm wallet={wallet!} network={network} />
              </WalletRequiredCard>
            } 
          />

          {/* Advanced Payment Features */}
          <Route 
            path="/advanced" 
            element={
              <WalletRequiredCard
                title="Advanced Payment Features"
                description="Payment channels, escrow, and checks"
              >
                <Tabs defaultValue="channels">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="channels">Payment Channels</TabsTrigger>
                    <TabsTrigger value="escrow">Escrow</TabsTrigger>
                    <TabsTrigger value="checks">Checks</TabsTrigger>
                  </TabsList>
                  <TabsContent value="channels">
                    <PaymentChannelManager wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="escrow">
                    <EscrowManager wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="checks">
                    <CheckManager wallet={wallet!} network={network} />
                  </TabsContent>
                </Tabs>
              </WalletRequiredCard>
            } 
          />

          {/* Transactions */}
          <Route 
            path="/transactions" 
            element={
              <WalletRequiredCard
                title="Transaction History"
                description="View and monitor your transactions"
              >
                <Tabs defaultValue="history">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="monitor">Monitor</TabsTrigger>
                  </TabsList>
                  <TabsContent value="history">
                    <TransactionHistory wallet={wallet!} network={network} />
                  </TabsContent>
                  <TabsContent value="monitor">
                    <TransactionMonitor wallet={wallet!} network={network} />
                  </TabsContent>
                </Tabs>
              </WalletRequiredCard>
            } 
          />

          {/* Multi-Signature */}
          <Route 
            path="/multisig" 
            element={
              <WalletRequiredCard
                title="Multi-Signature Accounts"
                description="Configure and manage multi-signature accounts for enhanced security"
              >
                <XRPLMultiSigPage 
                  wallet={wallet!} 
                  network={network}
                  projectId={projectId}
                />
              </WalletRequiredCard>
            } 
          />

          {/* AMM */}
          <Route 
            path="/amm" 
            element={
              <WalletRequiredCard
                title="Automated Market Maker (AMM)"
                description="Create liquidity pools and earn trading fees"
              >
                <XRPLAMMPage 
                  wallet={wallet!} 
                  network={network}
                  projectId={projectId}
                />
              </WalletRequiredCard>
            } 
          />

          {/* DEX Trading */}
          <Route 
            path="/dex" 
            element={
              wallet ? (
                <XRPLDEXPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="DEX Trading"
                  description="Trade on the XRPL decentralized exchange"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Identity Management */}
          <Route 
            path="/identity" 
            element={
              wallet ? (
                <XRPLIdentityPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Identity Management"
                  description="Manage DIDs and verifiable credentials"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Compliance */}
          <Route 
            path="/compliance" 
            element={
              wallet ? (
                <XRPLCompliancePage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Compliance Controls"
                  description="Asset freeze and deposit authorization"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Security Settings */}
          <Route 
            path="/security" 
            element={
              wallet ? (
                <XRPLSecurityPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Security Settings"
                  description="Key rotation and account security"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Advanced Tools */}
          <Route 
            path="/tools" 
            element={
              wallet ? (
                <XRPLAdvancedToolsPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Advanced Tools"
                  description="Batch operations, path finding, and price oracles"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Monitoring */}
          <Route 
            path="/monitoring" 
            element={
              wallet ? (
                <XRPLMonitoringPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Real-Time Monitoring"
                  description="WebSocket monitoring and activity feeds"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />

          {/* Trust Lines */}
          <Route 
            path="/trustlines" 
            element={
              wallet ? (
                <XRPLTrustLinesPage 
                  wallet={wallet} 
                  network={network}
                  projectId={projectId}
                />
              ) : (
                <WalletRequiredCard
                  title="Trust Lines"
                  description="Manage token trust line relationships"
                >
                  <div />
                </WalletRequiredCard>
              )
            } 
          />
        </Routes>
      </div>
    </div>
  )
}

export default XRPLMasterPage
