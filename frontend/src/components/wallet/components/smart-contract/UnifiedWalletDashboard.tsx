/**
 * UnifiedWalletDashboard - Smart Contract Wallet Management Interface
 * 
 * Provides comprehensive interface for managing both traditional and smart contract wallets
 * with capabilities for upgrades, WebAuthn, restrictions, and emergency controls
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Wallet, 
  Shield, 
  Users, 
  Key, 
  Lock, 
  Unlock,
  Smartphone,
  CircuitBoard,
  TrendingUp,
  Settings,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { unifiedWalletService, UnifiedWallet, WalletUpgradeRequest } from '@/services/wallet/smart-contract/unifiedWalletService'
import { SignatureMigrationFlow } from './SignatureMigrationFlow'
import { RestrictionManagement } from './RestrictionManagement'
import { EmergencyLockControls } from './EmergencyLockControls'

interface UnifiedWalletDashboardProps {
  walletId?: string
  onWalletSelect?: (walletId: string) => void
}

export function UnifiedWalletDashboard({ walletId, onWalletSelect }: UnifiedWalletDashboardProps) {
  const [wallets, setWallets] = useState<UnifiedWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<UnifiedWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()

  useEffect(() => {
    loadWallets()
  }, [])

  useEffect(() => {
    if (walletId && wallets.length > 0) {
      const wallet = wallets.find(w => w.id === walletId)
      if (wallet) {
        setSelectedWallet(wallet)
      }
    } else if (wallets.length > 0 && !selectedWallet) {
      setSelectedWallet(wallets[0])
    }
  }, [walletId, wallets])

  const loadWallets = async () => {
    try {
      setLoading(true)
      const walletsData = await unifiedWalletService.listUnifiedWallets()
      setWallets(walletsData)
    } catch (error) {
      console.error('Failed to load wallets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load wallets',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWalletSelect = (wallet: UnifiedWallet) => {
    setSelectedWallet(wallet)
    onWalletSelect?.(wallet.id)
  }

  const handleUpgradeToSmartContract = async () => {
    if (!selectedWallet || selectedWallet.walletType === 'smart_contract') return

    try {
      setUpgrading(true)
      
      const upgradeRequest: WalletUpgradeRequest = {
        walletId: selectedWallet.id,
        targetType: 'smart_contract',
        features: {
          enableWebAuthn: true,
          enableGuardians: true,
          enableRestrictions: true,
          enableAccountAbstraction: true,
        },
      }

      const upgradedWallet = await unifiedWalletService.upgradeToSmartContract(upgradeRequest)
      
      if (upgradedWallet) {
        setSelectedWallet(upgradedWallet)
        // Update wallet in the list
        setWallets(prev => prev.map(w => w.id === upgradedWallet.id ? upgradedWallet : w))
        
        toast({
          title: 'Upgrade Successful',
          description: 'Wallet upgraded to smart contract successfully',
        })
      } else {
        throw new Error('Upgrade failed')
      }
    } catch (error) {
      console.error('Failed to upgrade wallet:', error)
      toast({
        title: 'Upgrade Failed',
        description: 'Failed to upgrade wallet to smart contract',
        variant: 'destructive',
      })
    } finally {
      setUpgrading(false)
    }
  }

  const getWalletTypeIcon = (type: string) => {
    switch (type) {
      case 'smart_contract':
        return <CircuitBoard className="w-5 h-5 text-blue-600" />
      case 'hybrid':
        return <Shield className="w-5 h-5 text-purple-600" />
      default:
        return <Wallet className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'locked':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading wallets...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Contract Wallets</h1>
          <p className="text-muted-foreground">
            Manage traditional and smart contract wallets with advanced features
          </p>
        </div>
        <Button onClick={loadWallets} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Wallet List Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Wallets</CardTitle>
              <CardDescription>
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWallet?.id === wallet.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getWalletTypeIcon(wallet.walletType)}
                      <div>
                        <p className="font-medium text-sm">{wallet.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {wallet.primaryAddress.slice(0, 10)}...{wallet.primaryAddress.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(wallet.status)}`}>
                      {wallet.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {wallet.walletType.replace('_', ' ')}
                    </Badge>
                    {wallet.security.hasWebAuthn && (
                      <Badge variant="outline" className="text-xs">
                        <Smartphone className="w-3 h-3 mr-1" />
                        WebAuthn
                      </Badge>
                    )}
                    {wallet.security.guardianCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {wallet.security.guardianCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-8">
          {selectedWallet ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="migration">Migration</TabsTrigger>
                <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getWalletTypeIcon(selectedWallet.walletType)}
                      {selectedWallet.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedWallet.walletType === 'traditional' ? 'Traditional HD Wallet' : 'Smart Contract Wallet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Wallet Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Primary Address</label>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {selectedWallet.primaryAddress}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Supported Blockchains</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedWallet.blockchains.map((blockchain) => (
                            <Badge key={blockchain} variant="outline" className="text-xs">
                              {blockchain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Security Status */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Security Features</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Multi-Signature</span>
                          {selectedWallet.security.isMultiSigEnabled ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">WebAuthn/Passkeys</span>
                          {selectedWallet.security.hasWebAuthn ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Guardian Recovery</span>
                          {selectedWallet.security.guardianCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-xs">({selectedWallet.security.guardianCount})</span>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Restrictions</span>
                          {selectedWallet.security.hasRestrictions ? (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upgrade Option */}
                    {selectedWallet.walletType === 'traditional' && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <CircuitBoard className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-900">Upgrade to Smart Contract</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Enable advanced features like WebAuthn, gasless transactions, and enhanced security
                              </p>
                              <Button
                                onClick={handleUpgradeToSmartContract}
                                disabled={upgrading}
                                className="mt-3"
                                size="sm"
                              >
                                {upgrading ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Upgrading...
                                  </>
                                ) : (
                                  <>
                                    <CircuitBoard className="w-4 h-4 mr-2" />
                                    Upgrade Now
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Smart Contract Info */}
                    {selectedWallet.smartContract && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Smart Contract Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Diamond Proxy Address</label>
                            <p className="text-sm font-mono bg-muted p-2 rounded">
                              {selectedWallet.smartContract.diamondProxyAddress}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Implementation Version</label>
                            <p className="text-sm">{selectedWallet.smartContract.implementationVersion}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Active Facets</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedWallet.smartContract.facets.map((facet) => (
                                <Badge key={facet} variant="outline" className="text-xs">
                                  {facet}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Signature Migration Tab */}
              <TabsContent value="migration">
                <SignatureMigrationFlow walletId={selectedWallet.id} wallet={selectedWallet} />
              </TabsContent>

              {/* Restrictions Tab */}
              <TabsContent value="restrictions">
                <RestrictionManagement walletId={selectedWallet.id} wallet={selectedWallet} />
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <EmergencyLockControls walletId={selectedWallet.id} wallet={selectedWallet} />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Wallet Analytics
                    </CardTitle>
                    <CardDescription>
                      Usage statistics and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Analytics dashboard coming soon</p>
                      <p className="text-sm">Track transactions, security events, and usage patterns</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Select a wallet to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
