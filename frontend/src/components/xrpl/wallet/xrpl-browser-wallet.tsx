/**
 * XRPL Browser Wallet Connector
 * Follows pattern from build-a-browser-wallet code sample
 * 
 * Features:
 * - Connect wallet from seed or mnemonic
 * - Display classic address and X-address
 * - Show balance and account reserve
 * - Real-time ledger updates
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import {
  Wallet,
  Shield,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  ExternalLink,
  Activity,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// XRPL imports
import { Client, Wallet as XRPLWallet, dropsToXrp, classicAddressToXAddress, rippleTimeToISOTime } from 'xrpl'

interface WalletDetails {
  address: string
  classicAddress: string
  xAddress: string
  publicKey: string
  balance: string
  reserve: string
  ownerCount: number
  isActivated: boolean
}

interface LedgerDetails {
  ledgerIndex: number
  ledgerHash: string
  closeTime: string
}

interface XRPLBrowserWalletProps {
  network?: 'mainnet' | 'testnet' | 'devnet'
  projectId?: string
}

export const XRPLBrowserWallet: React.FC<XRPLBrowserWalletProps> = ({
  network = 'testnet',
  projectId
}) => {
  const { toast } = useToast()
  
  // Connection state
  const [client, setClient] = useState<Client | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Wallet state
  const [wallet, setWallet] = useState<XRPLWallet | null>(null)
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)
  
  // Ledger state
  const [ledgerDetails, setLedgerDetails] = useState<LedgerDetails | null>(null)
  
  // Input state
  const [seedInput, setSeedInput] = useState('')
  const [mnemonicInput, setMnemonicInput] = useState('')
  const [showSeed, setShowSeed] = useState(false)
  const [connectionMethod, setConnectionMethod] = useState<'seed' | 'mnemonic' | 'generate'>('generate')
  
  // Get WebSocket URL based on network
  const getWebSocketUrl = useCallback(() => {
    switch (network) {
      case 'mainnet':
        return 'wss://xrplcluster.com'
      case 'testnet':
        return 'wss://s.altnet.rippletest.net:51233'
      case 'devnet':
        return 'wss://s.devnet.rippletest.net:51233'
      default:
        return 'wss://s.altnet.rippletest.net:51233'
    }
  }, [network])
  
  // Get explorer URL
  const getExplorerUrl = useCallback((type: 'account' | 'ledger' = 'account', value?: string) => {
    const baseUrl = network === 'mainnet' 
      ? 'https://livenet.xrpl.org' 
      : `https://${network}.xrpl.org`
    
    if (type === 'account' && value) {
      return `${baseUrl}/accounts/${value}`
    }
    if (type === 'ledger' && value) {
      return `${baseUrl}/ledgers/${value}`
    }
    return baseUrl
  }, [network])
  
  // Connect to XRPL
  const connectToXRPL = useCallback(async () => {
    setIsConnecting(true)
    setConnectionError(null)
    
    try {
      const wsUrl = getWebSocketUrl()
      console.log(`[XRPLWallet] Connecting to ${wsUrl}`)
      
      const newClient = new Client(wsUrl)
      await newClient.connect()
      
      // Subscribe to ledger stream for real-time updates
      await newClient.request({
        command: 'subscribe',
        streams: ['ledger']
      })
      
      setClient(newClient)
      setIsConnected(true)
      
      toast({
        title: "Connected",
        description: `Connected to XRPL ${network}`
      })
      
      console.log('[XRPLWallet] Connected successfully')
    } catch (error) {
      console.error('[XRPLWallet] Connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect'
      setConnectionError(errorMessage)
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }, [network, toast, getWebSocketUrl])
  
  // Disconnect from XRPL
  const disconnectFromXRPL = useCallback(async () => {
    if (client) {
      await client.disconnect()
      setClient(null)
      setIsConnected(false)
      setWallet(null)
      setWalletDetails(null)
      setLedgerDetails(null)
      
      toast({
        title: "Disconnected",
        description: "Disconnected from XRPL"
      })
    }
  }, [client, toast])
  
  // Load wallet details
  const loadWalletDetails = useCallback(async (xrplWallet: XRPLWallet) => {
    if (!client) {
      toast({
        title: "Error",
        description: "Not connected to XRPL",
        variant: "destructive"
      })
      return
    }
    
    setIsLoadingWallet(true)
    
    try {
      console.log('[XRPLWallet] Loading wallet details for:', xrplWallet.address)
      
      // Get account info
      const accountInfoResponse = await client.request({
        command: 'account_info',
        account: xrplWallet.address,
        ledger_index: 'validated'
      })
      
      const accountData = accountInfoResponse.result.account_data
      const ownerCount = accountData.OwnerCount || 0
      
      // Get server info for reserve calculation
      const serverInfoResponse = await client.request({
        command: 'server_info'
      })
      
      const reserveBase = serverInfoResponse.result.info.validated_ledger?.reserve_base_xrp || 10
      const reserveInc = serverInfoResponse.result.info.validated_ledger?.reserve_inc_xrp || 2
      const accountReserve = (ownerCount * reserveInc) + reserveBase
      
      // Generate X-Address
      const xAddress = classicAddressToXAddress(xrplWallet.address, false, false)
      
      const details: WalletDetails = {
        address: xrplWallet.address,
        classicAddress: xrplWallet.address,
        xAddress,
        publicKey: xrplWallet.publicKey,
        balance: dropsToXrp(accountData.Balance).toString(),
        reserve: accountReserve.toFixed(2),
        ownerCount,
        isActivated: true
      }
      
      setWalletDetails(details)
      
      // Subscribe to account transactions for this wallet
      await client.request({
        command: 'subscribe',
        accounts: [xrplWallet.address]
      })
      
      console.log('[XRPLWallet] Wallet details loaded:', details)
    } catch (error) {
      console.error('[XRPLWallet] Error loading wallet:', error)
      
      // Check if account doesn't exist
      if (error instanceof Error && error.message.includes('actNotFound')) {
        const details: WalletDetails = {
          address: xrplWallet.address,
          classicAddress: xrplWallet.address,
          xAddress: classicAddressToXAddress(xrplWallet.address, false, false),
          publicKey: xrplWallet.publicKey,
          balance: '0',
          reserve: '10',
          ownerCount: 0,
          isActivated: false
        }
        setWalletDetails(details)
        
        toast({
          title: "Account Not Activated",
          description: "This account needs to be funded with at least 10 XRP to be activated",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load wallet details",
          variant: "destructive"
        })
      }
    } finally {
      setIsLoadingWallet(false)
    }
  }, [client, toast])
  
  // Connect wallet from seed
  const connectFromSeed = useCallback(async () => {
    if (!client) {
      toast({
        title: "Error",
        description: "Connect to XRPL first",
        variant: "destructive"
      })
      return
    }
    
    if (!seedInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a seed",
        variant: "destructive"
      })
      return
    }
    
    try {
      const xrplWallet = XRPLWallet.fromSeed(seedInput.trim())
      setWallet(xrplWallet)
      await loadWalletDetails(xrplWallet)
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${xrplWallet.address}`
      })
    } catch (error) {
      console.error('[XRPLWallet] Error connecting from seed:', error)
      toast({
        title: "Error",
        description: "Invalid seed format",
        variant: "destructive"
      })
    }
  }, [client, seedInput, loadWalletDetails, toast])
  
  // Connect wallet from mnemonic
  const connectFromMnemonic = useCallback(async () => {
    if (!client) {
      toast({
        title: "Error",
        description: "Connect to XRPL first",
        variant: "destructive"
      })
      return
    }
    
    if (!mnemonicInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a mnemonic phrase",
        variant: "destructive"
      })
      return
    }
    
    try {
      const xrplWallet = XRPLWallet.fromMnemonic(mnemonicInput.trim())
      setWallet(xrplWallet)
      await loadWalletDetails(xrplWallet)
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${xrplWallet.address}`
      })
    } catch (error) {
      console.error('[XRPLWallet] Error connecting from mnemonic:', error)
      toast({
        title: "Error",
        description: "Invalid mnemonic format",
        variant: "destructive"
      })
    }
  }, [client, mnemonicInput, loadWalletDetails, toast])
  
  // Generate new wallet
  const generateNewWallet = useCallback(async () => {
    if (!client) {
      toast({
        title: "Error",
        description: "Connect to XRPL first",
        variant: "destructive"
      })
      return
    }
    
    try {
      const xrplWallet = XRPLWallet.generate()
      setWallet(xrplWallet)
      setSeedInput(xrplWallet.seed!)
      await loadWalletDetails(xrplWallet)
      
      toast({
        title: "Wallet Generated",
        description: "New wallet created successfully"
      })
    } catch (error) {
      console.error('[XRPLWallet] Error generating wallet:', error)
      toast({
        title: "Error",
        description: "Failed to generate wallet",
        variant: "destructive"
      })
    }
  }, [client, loadWalletDetails, toast])
  
  // Listen for ledger updates
  useEffect(() => {
    if (!client) return
    
    const handleLedgerClosed = (ledger: any) => {
      setLedgerDetails({
        ledgerIndex: ledger.ledger_index,
        ledgerHash: ledger.ledger_hash,
        closeTime: rippleTimeToISOTime(ledger.ledger_time)
      })
    }
    
    client.on('ledgerClosed', handleLedgerClosed)
    
    return () => {
      client.off('ledgerClosed', handleLedgerClosed)
    }
  }, [client])
  
  // Listen for account transactions
  useEffect(() => {
    if (!client || !wallet) return
    
    const handleTransaction = async (response: any) => {
      if (response.validated && response.transaction?.Account === wallet.address) {
        console.log('[XRPLWallet] New transaction:', response)
        // Reload wallet details to get updated balance
        await loadWalletDetails(wallet)
      }
    }
    
    client.on('transaction', handleTransaction)
    
    return () => {
      client.off('transaction', handleTransaction)
    }
  }, [client, wallet, loadWalletDetails])
  
  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>XRPL Connection</CardTitle>
              <CardDescription>
                Connect to {network} network
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              {isConnected ? (
                <Button onClick={disconnectFromXRPL} variant="outline" size="sm">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={connectToXRPL} disabled={isConnecting} size="sm">
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {connectionError && (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
      
      {/* Wallet Connection/Generation */}
      {isConnected && !wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Connect an existing wallet or generate a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={connectionMethod} onValueChange={(v) => setConnectionMethod(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="generate">Generate New</TabsTrigger>
                <TabsTrigger value="seed">From Seed</TabsTrigger>
                <TabsTrigger value="mnemonic">From Mnemonic</TabsTrigger>
              </TabsList>
              
              <TabsContent value="generate" className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Generate a new XRPL wallet. Make sure to save the seed securely.
                  </AlertDescription>
                </Alert>
                <Button onClick={generateNewWallet} className="w-full">
                  <Wallet className="h-4 w-4 mr-2" />
                  Generate New Wallet
                </Button>
              </TabsContent>
              
              <TabsContent value="seed" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seed">Wallet Seed</Label>
                  <div className="relative">
                    <Input
                      id="seed"
                      type={showSeed ? 'text' : 'password'}
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      placeholder="s████████████████████"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSeed(!showSeed)}
                    >
                      {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={connectFromSeed} className="w-full">
                  Connect from Seed
                </Button>
              </TabsContent>
              
              <TabsContent value="mnemonic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mnemonic">Mnemonic Phrase</Label>
                  <Input
                    id="mnemonic"
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    placeholder="word1 word2 word3 ..."
                  />
                </div>
                <Button onClick={connectFromMnemonic} className="w-full">
                  Connect from Mnemonic
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* Wallet Details */}
      {wallet && walletDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Wallet Details</CardTitle>
              <Button onClick={() => loadWalletDetails(wallet)} variant="outline" size="sm" disabled={isLoadingWallet}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingWallet ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Balance */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Balance</div>
              <div className="text-3xl font-bold">{walletDetails.balance} XRP</div>
              <div className="text-sm text-muted-foreground mt-1">
                Reserve: {walletDetails.reserve} XRP
              </div>
            </div>
            
            {/* Classic Address */}
            <div className="space-y-2">
              <Label>Classic Address</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm">
                  {walletDetails.classicAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(walletDetails.classicAddress, 'Classic address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getExplorerUrl('account', walletDetails.classicAddress), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* X-Address */}
            <div className="space-y-2">
              <Label>X-Address</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm">
                  {walletDetails.xAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(walletDetails.xAddress, 'X-address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Seed (if available) */}
            {wallet.seed && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Wallet Seed (Keep Secret!)
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {showSeed ? wallet.seed : '••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSeed(!showSeed)}
                  >
                    {showSeed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(wallet.seed!, 'Seed')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Account Status */}
            <div className="flex items-center gap-2">
              <Badge variant={walletDetails.isActivated ? 'default' : 'secondary'}>
                {walletDetails.isActivated ? 'Account Activated' : 'Not Activated'}
              </Badge>
              <Badge variant="outline">
                Owner Count: {walletDetails.ownerCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Ledger Details */}
      {isConnected && ledgerDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Latest Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Ledger Index</div>
                <div className="font-mono">{ledgerDetails.ledgerIndex}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Close Time</div>
                <div className="text-sm">{new Date(ledgerDetails.closeTime).toLocaleString()}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ledger Hash</div>
              <code className="text-xs break-all">{ledgerDetails.ledgerHash}</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default XRPLBrowserWallet
