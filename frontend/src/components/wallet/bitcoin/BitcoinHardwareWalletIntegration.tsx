/**
 * Bitcoin Hardware Wallet Integration Component
 * 
 * Provides interface for connecting and managing hardware wallets (Ledger, Trezor)
 * Supports secure transaction signing and key management
 * Integrates with existing Bitcoin infrastructure
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Usb, 
  Bluetooth,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Lock,
  Unlock,
  Fingerprint,
  Settings,
  Eye,
  Wifi
} from 'lucide-react'

interface HardwareWallet {
  id: string;
  name: string;
  type: 'ledger' | 'trezor' | 'coldcard' | 'bitbox';
  model: string;
  firmwareVersion: string;
  connected: boolean;
  authenticated: boolean;
  connectionType: 'usb' | 'bluetooth' | 'nfc';
  serialNumber?: string;
  supportedFeatures: string[];
  lastSeen: Date;
}

interface SecurityFeature {
  name: string;
  description: string;
  enabled: boolean;
  supported: boolean;
  icon: React.ReactNode;
}

interface TransactionSigningRequest {
  id: string;
  transaction: any;
  inputs: number;
  outputs: number;
  fee: number;
  status: 'pending' | 'signed' | 'rejected' | 'error';
  hwWalletId: string;
  createdAt: Date;
  signedAt?: Date;
  error?: string;
}

export function BitcoinHardwareWalletIntegration() {
  // State management
  const [connectedWallets, setConnectedWallets] = useState<HardwareWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<HardwareWallet | null>(null)
  const [signingRequests, setSigningRequests] = useState<TransactionSigningRequest[]>([])
  const [securityFeatures, setSecurityFeatures] = useState<SecurityFeature[]>([])
  
  // UI state
  const [isScanning, setIsScanning] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [currentTab, setCurrentTab] = useState('devices')
  const [scanProgress, setScanProgress] = useState(0)

  // Initialize security features
  const initializeSecurityFeatures = () => {
    const features: SecurityFeature[] = [
      {
        name: 'PIN Protection',
        description: 'Device PIN verification for access',
        enabled: false,
        supported: true,
        icon: <Lock className="w-4 h-4" />
      },
      {
        name: 'Passphrase Protection',
        description: 'Additional BIP39 passphrase security',
        enabled: false,
        supported: true,
        icon: <Key className="w-4 h-4" />
      },
      {
        name: 'Button Confirmation',
        description: 'Physical button press for transactions',
        enabled: true,
        supported: true,
        icon: <Fingerprint className="w-4 h-4" />
      },
      {
        name: 'Address Verification',
        description: 'Display addresses on device screen',
        enabled: true,
        supported: true,
        icon: <Eye className="w-4 h-4" />
      },
      {
        name: 'Blind Signing Protection',
        description: 'Prevent signing of unknown transaction types',
        enabled: true,
        supported: true,
        icon: <Shield className="w-4 h-4" />
      }
    ]
    setSecurityFeatures(features)
  }

  // Scan for hardware wallets
  const scanForWallets = useCallback(async () => {
    setIsScanning(true)
    setError('')
    setScanProgress(0)

    try {
      // Simulate scanning progress
      const scanSteps = [
        'Scanning USB devices...',
        'Checking Bluetooth devices...',
        'Verifying device signatures...',
        'Establishing connections...'
      ]

      for (let i = 0; i < scanSteps.length; i++) {
        setScanProgress((i + 1) / scanSteps.length * 100)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Simulate discovered hardware wallets
      const discoveredWallets: HardwareWallet[] = [
        {
          id: 'ledger_nano_s_001',
          name: 'Ledger Nano S Plus',
          type: 'ledger',
          model: 'Nano S Plus',
          firmwareVersion: '1.1.0',
          connected: false,
          authenticated: false,
          connectionType: 'usb',
          serialNumber: '0001234567890123',
          supportedFeatures: ['bitcoin', 'segwit', 'taproot', 'psbt'],
          lastSeen: new Date()
        },
        {
          id: 'trezor_one_001',
          name: 'Trezor One',
          type: 'trezor',
          model: 'One',
          firmwareVersion: '1.12.1',
          connected: false,
          authenticated: false,
          connectionType: 'usb',
          serialNumber: '9876543210123456',
          supportedFeatures: ['bitcoin', 'segwit', 'psbt'],
          lastSeen: new Date()
        }
      ]

      setConnectedWallets(discoveredWallets)

    } catch (error) {
      setError(`Scanning failed: ${error}`)
    } finally {
      setIsScanning(false)
      setScanProgress(0)
    }
  }, [])

  // Connect to hardware wallet
  const connectWallet = async (walletId: string) => {
    setIsConnecting(true)
    setError('')

    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update wallet connection status
      setConnectedWallets(prev => 
        prev.map(wallet => 
          wallet.id === walletId 
            ? { ...wallet, connected: true, lastSeen: new Date() }
            : wallet
        )
      )

      const connectedWallet = connectedWallets.find(w => w.id === walletId)
      if (connectedWallet) {
        setSelectedWallet({ ...connectedWallet, connected: true })
      }

    } catch (error) {
      setError(`Connection failed: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Authenticate with hardware wallet
  const authenticateWallet = async (walletId: string) => {
    setError('')

    try {
      // Simulate authentication (PIN entry, button press, etc.)
      await new Promise(resolve => setTimeout(resolve, 3000))

      setConnectedWallets(prev => 
        prev.map(wallet => 
          wallet.id === walletId 
            ? { ...wallet, authenticated: true }
            : wallet
        )
      )

      if (selectedWallet?.id === walletId) {
        setSelectedWallet(prev => prev ? { ...prev, authenticated: true } : null)
      }

    } catch (error) {
      setError(`Authentication failed: ${error}`)
    }
  }

  // Sign transaction with hardware wallet
  const signTransactionWithHW = async (transactionData: any, walletId: string) => {
    const request: TransactionSigningRequest = {
      id: `sign_${Date.now()}`,
      transaction: transactionData,
      inputs: 2,
      outputs: 1,
      fee: 1500, // satoshis
      status: 'pending',
      hwWalletId: walletId,
      createdAt: new Date()
    }

    setSigningRequests(prev => [request, ...prev])

    try {
      // Simulate hardware wallet signing process
      await new Promise(resolve => setTimeout(resolve, 5000))

      setSigningRequests(prev => 
        prev.map(req => 
          req.id === request.id 
            ? { ...req, status: 'signed', signedAt: new Date() }
            : req
        )
      )

    } catch (error) {
      setSigningRequests(prev => 
        prev.map(req => 
          req.id === request.id 
            ? { ...req, status: 'error', error: error.toString() }
            : req
        )
      )
    }
  }

  // Get connection status icon
  const getConnectionIcon = (wallet: HardwareWallet) => {
    if (wallet.connected && wallet.authenticated) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />
    } else if (wallet.connected) {
      return <Unlock className="w-4 h-4 text-yellow-600" />
    } else {
      switch (wallet.connectionType) {
        case 'usb':
          return <Usb className="w-4 h-4 text-gray-400" />
        case 'bluetooth':
          return <Bluetooth className="w-4 h-4 text-gray-400" />
        default:
          return <Wifi className="w-4 h-4 text-gray-400" />
      }
    }
  }

  // Get wallet type badge color
  const getWalletTypeBadge = (type: HardwareWallet['type']) => {
    switch (type) {
      case 'ledger':
        return <Badge className="bg-blue-600">Ledger</Badge>
      case 'trezor':
        return <Badge className="bg-green-600">Trezor</Badge>
      case 'coldcard':
        return <Badge className="bg-orange-600">ColdCard</Badge>
      case 'bitbox':
        return <Badge className="bg-purple-600">BitBox</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Effects
  useEffect(() => {
    initializeSecurityFeatures()
    scanForWallets()
  }, [scanForWallets])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Hardware Wallet Integration
              </CardTitle>
              <CardDescription>
                Secure Bitcoin transactions with hardware wallet devices
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={scanForWallets} disabled={isScanning}>
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan Devices'}
              </Button>
            </div>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="space-y-2">
              <Progress value={scanProgress} className="w-full" />
              <div className="text-sm text-muted-foreground text-center">
                Searching for hardware wallet devices...
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="signing">Transaction Signing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          {connectedWallets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {connectedWallets.map((wallet) => (
                <Card key={wallet.id} className={`cursor-pointer transition-all ${
                  selectedWallet?.id === wallet.id ? 'ring-2 ring-blue-500' : ''
                }`} onClick={() => setSelectedWallet(wallet)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getConnectionIcon(wallet)}
                        <div>
                          <CardTitle className="text-lg">{wallet.name}</CardTitle>
                          <CardDescription>{wallet.model}</CardDescription>
                        </div>
                      </div>
                      {getWalletTypeBadge(wallet.type)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Firmware:</span>
                        <span className="font-mono">{wallet.firmwareVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connection:</span>
                        <Badge variant="outline" className="text-xs">
                          {wallet.connectionType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant={
                            wallet.connected && wallet.authenticated ? 'default' :
                            wallet.connected ? 'secondary' : 'outline'
                          }
                        >
                          {wallet.connected && wallet.authenticated ? 'Ready' :
                           wallet.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Seen:</span>
                        <span className="text-xs">{wallet.lastSeen.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Supported Features</div>
                      <div className="flex flex-wrap gap-1">
                        {wallet.supportedFeatures.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!wallet.connected ? (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            connectWallet(wallet.id)
                          }}
                          disabled={isConnecting}
                          className="flex-1"
                        >
                          {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
                          Connect
                        </Button>
                      ) : !wallet.authenticated ? (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            authenticateWallet(wallet.id)
                          }}
                          className="flex-1"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Authenticate
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" disabled>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Ready
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Hardware Wallets Found</h3>
                <p className="text-muted-foreground mb-4">
                  Connect a hardware wallet device and click scan to detect it
                </p>
                <Button onClick={scanForWallets} disabled={isScanning}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  Scan for Devices
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Features</CardTitle>
              <CardDescription>
                Configure hardware wallet security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <div>
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-sm text-muted-foreground">{feature.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={feature.enabled ? 'default' : 'outline'}>
                      {feature.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!feature.supported}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Signing Tab */}
        <TabsContent value="signing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transaction Signing</CardTitle>
                  <CardDescription>
                    Hardware wallet transaction signing history
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => signTransactionWithHW({ amount: 1000000 }, selectedWallet?.id || '')}
                  disabled={!selectedWallet?.authenticated}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Test Signing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {signingRequests.length > 0 ? (
                <div className="space-y-3">
                  {signingRequests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {request.status === 'signed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {request.status === 'pending' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                            {request.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                            {request.status === 'rejected' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                            
                            <div className="font-mono text-sm">
                              {request.inputs} inputs, {request.outputs} outputs
                            </div>
                            <Badge 
                              variant={
                                request.status === 'signed' ? 'default' :
                                request.status === 'error' ? 'destructive' :
                                request.status === 'rejected' ? 'secondary' : 'outline'
                              }
                            >
                              {request.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Fee: {request.fee.toLocaleString()} sats • {request.createdAt.toLocaleString()}
                          </div>
                          {request.error && (
                            <div className="text-sm text-red-600 mt-1">{request.error}</div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Signing Requests</h3>
                  <p>Transaction signing history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hardware Wallet Settings</CardTitle>
              <CardDescription>
                Advanced configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Settings Panel</h3>
                <p className="mb-4">
                  Advanced hardware wallet configuration options
                </p>
                <Button variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
