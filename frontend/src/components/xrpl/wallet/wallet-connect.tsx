import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wallet as WalletIcon, Key, Upload, Plus } from 'lucide-react'
import { XRPLKeyDerivationService } from '@/services/wallet/ripple/crypto/XRPLKeyDerivationService'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import { Wallet, ECDSA } from 'xrpl'

interface WalletConnectProps {
  onWalletConnected: (wallet: Wallet, network: string) => void
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onWalletConnected,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [seedInput, setSeedInput] = useState('')
  const [mnemonicInput, setMnemonicInput] = useState('')
  // Use ECDSA enum directly - ed25519 is the default and recommended
  const [algorithm, setAlgorithm] = useState<ECDSA>(ECDSA.ed25519)

  const handleGenerateWallet = async () => {
    setLoading(true)
    try {
      const wallet = XRPLKeyDerivationService.generateWallet(algorithm)

      toast({
        title: 'Wallet Generated',
        description: (
          <div className="space-y-2">
            <p className="font-mono text-xs break-all">Address: {wallet.address}</p>
            <p className="text-yellow-600 text-xs">⚠️ Save your seed securely!</p>
          </div>
        )
      })

      onWalletConnected(wallet, network)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate wallet',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImportFromSeed = async () => {
    if (!seedInput.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid seed',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      if (!XRPLKeyDerivationService.isValidSeed(seedInput.trim())) {
        throw new Error('Invalid seed format')
      }

      const wallet = XRPLKeyDerivationService.fromSeed(seedInput.trim(), algorithm)

      toast({
        title: 'Wallet Imported',
        description: `Connected to address: ${wallet.address.substring(0, 12)}...`
      })

      onWalletConnected(wallet, network)
      setSeedInput('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import wallet',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImportFromMnemonic = async () => {
    if (!mnemonicInput.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid mnemonic phrase',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const wallet = XRPLKeyDerivationService.fromMnemonic(mnemonicInput.trim(), undefined, algorithm)

      toast({
        title: 'Wallet Imported',
        description: `Connected to address: ${wallet.address.substring(0, 12)}...`
      })

      onWalletConnected(wallet, network)
      setMnemonicInput('')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import from mnemonic',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon className="h-5 w-5" />
          Connect XRPL Wallet
        </CardTitle>
        <CardDescription>
          Generate a new wallet or import an existing one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="seed">Import Seed</TabsTrigger>
            <TabsTrigger value="mnemonic">Import Mnemonic</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Algorithm</Label>
                <div className="flex gap-2">
                  <Button
                    variant={algorithm === ECDSA.ed25519 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.ed25519)}
                    className="flex-1"
                  >
                    Ed25519
                    <Badge variant="secondary" className="ml-2">Recommended</Badge>
                  </Button>
                  <Button
                    variant={algorithm === ECDSA.secp256k1 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.secp256k1)}
                    className="flex-1"
                  >
                    secp256k1
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ed25519 is faster and more secure. secp256k1 is compatible with Bitcoin/Ethereum tooling.
                </p>
              </div>

              <Button
                onClick={handleGenerateWallet}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate New Wallet
                  </>
                )}
              </Button>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Security Warning:</strong> Save your seed phrase securely. 
                  You'll need it to access your wallet. Never share it with anyone.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seed" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seed">Wallet Seed</Label>
                <Input
                  id="seed"
                  type="password"
                  placeholder="sXXXXXXXXXXXXXXXXXXXXXX"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your XRPL wallet seed (starts with 's')
                </p>
              </div>

              <div className="space-y-2">
                <Label>Key Algorithm</Label>
                <div className="flex gap-2">
                  <Button
                    variant={algorithm === ECDSA.ed25519 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.ed25519)}
                    size="sm"
                    className="flex-1"
                  >
                    Ed25519
                  </Button>
                  <Button
                    variant={algorithm === ECDSA.secp256k1 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.secp256k1)}
                    size="sm"
                    className="flex-1"
                  >
                    secp256k1
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleImportFromSeed}
                disabled={loading || !seedInput}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Wallet
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="mnemonic" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mnemonic">Recovery Phrase</Label>
                <textarea
                  id="mnemonic"
                  placeholder="word1 word2 word3 ... word24"
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your 12 or 24-word recovery phrase
                </p>
              </div>

              <div className="space-y-2">
                <Label>Key Algorithm</Label>
                <div className="flex gap-2">
                  <Button
                    variant={algorithm === ECDSA.ed25519 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.ed25519)}
                    size="sm"
                    className="flex-1"
                  >
                    Ed25519
                  </Button>
                  <Button
                    variant={algorithm === ECDSA.secp256k1 ? 'default' : 'outline'}
                    onClick={() => setAlgorithm(ECDSA.secp256k1)}
                    size="sm"
                    className="flex-1"
                  >
                    secp256k1
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleImportFromMnemonic}
                disabled={loading || !mnemonicInput}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Import from Mnemonic
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
