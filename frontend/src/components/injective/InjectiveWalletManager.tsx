/**
 * Injective Wallet Manager
 * Manages wallet selection from project_wallets for Injective operations
 * Uses InternalWalletService for wallet retrieval and key decryption
 */

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { InternalWalletService, type ProjectWallet } from '@/services/wallet/InternalWalletService'
import { projectWalletService, type ProjectWalletData } from '@/services/project/project-wallet-service'

interface InjectiveWalletManagerProps {
  projectId: string
  onWalletSelected?: (wallet: ProjectWalletData) => void
}

export function InjectiveWalletManager({ projectId, onWalletSelected }: InjectiveWalletManagerProps) {
  const { toast } = useToast()
  const [wallets, setWallets] = useState<ProjectWalletData[]>([])
  const [selectedWallet, setSelectedWallet] = useState<ProjectWalletData | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)

  useEffect(() => {
    loadWallets()
  }, [projectId])

  const loadWallets = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all project wallets (both EVM and non-EVM)
      const projectWallets = await projectWalletService.getProjectWallets(projectId)
      
      // Filter for Injective wallets (chain_id or non_evm_network = 'injective')
      const injectiveWallets = projectWallets.filter(w => 
        w.chain_id === '1776' || // Injective EVM mainnet
        w.chain_id === '1439' || // Injective EVM testnet
        w.non_evm_network === 'injective'
      )

      if (injectiveWallets.length === 0) {
        // If no Injective-specific wallets, show all EVM wallets (they can work with Injective EVM)
        const evmWallets = projectWallets.filter(w => w.chain_id !== null)
        setWallets(evmWallets)
      } else {
        setWallets(injectiveWallets)
      }

      // Auto-select first wallet if available
      if (injectiveWallets.length > 0) {
        handleSelectWallet(injectiveWallets[0].id)
      } else if (projectWallets.length > 0) {
        handleSelectWallet(projectWallets[0].id)
      }
    } catch (err: any) {
      console.error('Error loading wallets:', err)
      setError(err.message || 'Failed to load wallets')
      toast({
        title: 'Error',
        description: 'Failed to load project wallets',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectWallet = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId)
    if (!wallet) return

    setSelectedWalletId(walletId)
    setSelectedWallet(wallet)
    setDecryptedKey(null)
    setShowPrivateKey(false)

    // Notify parent component
    if (onWalletSelected) {
      onWalletSelected(wallet)
    }

    // Store in localStorage for persistence
    localStorage.setItem('injective_selected_wallet', walletId)
    localStorage.setItem('injective_wallet_address', wallet.wallet_address)
  }

  const handleDecryptKey = async () => {
    if (!selectedWallet) return

    try {
      setDecrypting(true)
      const walletService = InternalWalletService.getInstance()
      const privateKey = await walletService.getProjectWalletPrivateKey(selectedWallet.id)
      
      setDecryptedKey(privateKey)
      setShowPrivateKey(true)

      toast({
        title: 'Private Key Decrypted',
        description: 'Handle with care. Never share your private key.',
      })
    } catch (err: any) {
      console.error('Error decrypting private key:', err)
      toast({
        title: 'Decryption Failed',
        description: err.message || 'Failed to decrypt private key',
        variant: 'destructive'
      })
    } finally {
      setDecrypting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    })
  }

  const getWalletNetworkInfo = (wallet: ProjectWalletData) => {
    if (wallet.non_evm_network) {
      return wallet.non_evm_network.toUpperCase()
    } else if (wallet.chain_id === '1776') {
      return 'Injective EVM Mainnet'
    } else if (wallet.chain_id === '1439') {
      return 'Injective EVM Testnet'
    } else if (wallet.chain_id) {
      return `EVM Chain ${wallet.chain_id}`
    }
    return 'Unknown Network'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading wallets...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (wallets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            No Wallets Available
          </CardTitle>
          <CardDescription>
            Create an Injective wallet in your project to use TokenFactory features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription>
              Go to your project settings to create a new Injective wallet or import an existing one.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Injective Wallet Selection
              </CardTitle>
              <CardDescription>
                Select a wallet from your project for Injective operations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadWallets}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Wallet</label>
            <Select value={selectedWalletId} onValueChange={handleSelectWallet}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {wallet.project_wallet_name || 'Unnamed Wallet'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {wallet.wallet_address.slice(0, 10)}...{wallet.wallet_address.slice(-8)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Wallet Details */}
          {selectedWallet && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network</span>
                <Badge variant="secondary">
                  {getWalletNetworkInfo(selectedWallet)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Address</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedWallet.wallet_address, 'Address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="block text-xs font-mono p-2 bg-background rounded border break-all">
                  {selectedWallet.wallet_address}
                </code>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Public Key</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedWallet.public_key, 'Public Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="block text-xs font-mono p-2 bg-background rounded border break-all">
                  {selectedWallet.public_key}
                </code>
              </div>

              {/* Private Key Section */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">Private Key</span>
                  <div className="flex gap-2">
                    {decryptedKey && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                        >
                          {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(decryptedKey, 'Private Key')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {!decryptedKey ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecryptKey}
                    disabled={decrypting}
                    className="w-full"
                  >
                    {decrypting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Decrypting...
                      </>
                    ) : (
                      'Decrypt Private Key'
                    )}
                  </Button>
                ) : (
                  <code className="block text-xs font-mono p-2 bg-background rounded border break-all">
                    {showPrivateKey ? decryptedKey : '•'.repeat(64)}
                  </code>
                )}
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Never share your private key. Anyone with access can control your wallet.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Success Indicator */}
          {selectedWallet && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Wallet ready for Injective operations</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InjectiveWalletManager
