/**
 * XRPL Project Wallet List
 * Displays and manages XRPL wallets for a project
 * Follows ProjectWalletList pattern
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  Wallet,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Shield,
  Search,
  Loader2,
  ExternalLink
} from "lucide-react"
import { ProjectWalletData, projectWalletService } from "@/services/project/project-wallet-service"
import { WalletEncryptionClient } from "@/services/security/walletEncryptionService"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { rippleWalletService } from '@/services/wallet/ripple/RippleWalletService'

interface ProjectWalletListProps {
  projectId: string
  onRefresh?: () => void
}

interface WalletWithBalance extends ProjectWalletData {
  balance?: string
  isLoadingBalance?: boolean
  balanceError?: string
}

export const XRPLProjectWalletList: React.FC<ProjectWalletListProps> = ({ 
  projectId, 
  onRefresh 
}) => {
  const { toast } = useToast()
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState<Record<string, boolean>>({})
  const [showMnemonic, setShowMnemonic] = useState<Record<string, boolean>>({})
  const [decryptedPrivateKeys, setDecryptedPrivateKeys] = useState<Record<string, string>>({})
  const [decryptedMnemonics, setDecryptedMnemonics] = useState<Record<string, string>>({})
  const [decryptingPrivateKey, setDecryptingPrivateKey] = useState<Record<string, boolean>>({})
  const [decryptingMnemonic, setDecryptingMnemonic] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch wallets
  const fetchWallets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`[XRPLWalletList] Fetching wallets for project: ${projectId}`)
      const walletData = await projectWalletService.getProjectWallets(projectId)
      
      // Filter for XRPL wallets only
      const xrplWallets = walletData.filter(w => 
        w.non_evm_network === 'ripple' || 
        w.non_evm_network === 'xrp'
      )

      console.log(`[XRPLWalletList] Found ${xrplWallets.length} XRPL wallets`)
      setWallets(xrplWallets)

      // Auto-load balances
      if (xrplWallets.length > 0) {
        setTimeout(() => {
          fetchBalances()
        }, 100)
      }
    } catch (err) {
      console.error('[XRPLWalletList] Error fetching wallets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch wallets')
      toast({
        title: "Error",
        description: "Failed to fetch wallets",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    console.log('[XRPLWalletList] Fetching balances for all wallets')
    
    setWallets(prevWallets => 
      prevWallets.map(w => ({ ...w, isLoadingBalance: true }))
    )

    const updatedWallets = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const balance = await rippleWalletService.getBalance(wallet.wallet_address)
          return {
            ...wallet,
            balance,
            isLoadingBalance: false,
            balanceError: undefined
          }
        } catch (error) {
          console.error(`Error fetching balance for ${wallet.wallet_address}:`, error)
          return {
            ...wallet,
            balance: '0',
            isLoadingBalance: false,
            balanceError: 'Failed to fetch'
          }
        }
      })
    )

    setWallets(updatedWallets)
  }, [wallets])

  // Delete wallet
  const handleDeleteWallet = async () => {
    if (!walletToDelete) return

    try {
      await projectWalletService.deleteProjectWallet(walletToDelete)
      toast({
        title: "Success",
        description: "Wallet deleted successfully"
      })
      setShowDeleteDialog(false)
      setWalletToDelete(null)
      fetchWallets()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error deleting wallet:', error)
      toast({
        title: "Error",
        description: "Failed to delete wallet",
        variant: "destructive"
      })
    }
  }

  // Decrypt private key
  const togglePrivateKey = async (walletId: string, encryptedKey?: string) => {
    if (!encryptedKey) return

    if (showPrivateKey[walletId]) {
      setShowPrivateKey(prev => ({ ...prev, [walletId]: false }))
      return
    }

    if (decryptedPrivateKeys[walletId]) {
      setShowPrivateKey(prev => ({ ...prev, [walletId]: true }))
      return
    }

    setDecryptingPrivateKey(prev => ({ ...prev, [walletId]: true }))

    try {
      const decrypted = await WalletEncryptionClient.decrypt(encryptedKey)
      setDecryptedPrivateKeys(prev => ({ ...prev, [walletId]: decrypted }))
      setShowPrivateKey(prev => ({ ...prev, [walletId]: true }))
    } catch (error) {
      console.error('Error decrypting private key:', error)
      toast({
        title: "Error",
        description: "Failed to decrypt private key",
        variant: "destructive"
      })
    } finally {
      setDecryptingPrivateKey(prev => ({ ...prev, [walletId]: false }))
    }
  }

  // Decrypt mnemonic
  const toggleMnemonic = async (walletId: string, encryptedMnemonic?: string) => {
    if (!encryptedMnemonic) return

    if (showMnemonic[walletId]) {
      setShowMnemonic(prev => ({ ...prev, [walletId]: false }))
      return
    }

    if (decryptedMnemonics[walletId]) {
      setShowMnemonic(prev => ({ ...prev, [walletId]: true }))
      return
    }

    setDecryptingMnemonic(prev => ({ ...prev, [walletId]: true }))

    try {
      const decrypted = await WalletEncryptionClient.decrypt(encryptedMnemonic)
      setDecryptedMnemonics(prev => ({ ...prev, [walletId]: decrypted }))
      setShowMnemonic(prev => ({ ...prev, [walletId]: true }))
    } catch (error) {
      console.error('Error decrypting mnemonic:', error)
      toast({
        title: "Error",
        description: "Failed to decrypt mnemonic",
        variant: "destructive"
      })
    } finally {
      setDecryptingMnemonic(prev => ({ ...prev, [walletId]: false }))
    }
  }

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

  // Filter wallets
  const filteredWallets = wallets.filter(wallet => 
    wallet.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wallet.project_wallet_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>XRPL Wallets</CardTitle>
              <CardDescription>
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} for this project
              </CardDescription>
            </div>
            <Button onClick={fetchWallets} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wallets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredWallets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No wallets found matching search' : 'No XRPL wallets for this project'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 shrink-0" />
                        <div>
                          <code className="text-xs">{wallet.wallet_address}</code>
                          {wallet.project_wallet_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {wallet.project_wallet_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {wallet.isLoadingBalance ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : wallet.balanceError ? (
                        <span className="text-xs text-destructive">{wallet.balanceError}</span>
                      ) : (
                        <div>
                          <div className="font-medium">{wallet.balance || '0'} XRP</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {wallet.non_evm_network || 'ripple'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {wallet.private_key && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePrivateKey(wallet.id!, wallet.private_key!)}
                            disabled={decryptingPrivateKey[wallet.id!]}
                          >
                            {decryptingPrivateKey[wallet.id!] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : showPrivateKey[wallet.id!] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {wallet.private_key_vault_id && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Vault
                          </Badge>
                        )}
                      </div>
                      {showPrivateKey[wallet.id!] && decryptedPrivateKeys[wallet.id!] && (
                        <div className="mt-2">
                          <code className="text-xs">{decryptedPrivateKeys[wallet.id!]}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(decryptedPrivateKeys[wallet.id!], 'Private key')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(wallet.wallet_address, 'Address')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(rippleWalletService.getExplorerUrl(wallet.wallet_address, 'address'), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setWalletToDelete(wallet.id!)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The wallet will be permanently deleted from the project.
              Make sure you have backed up any important credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWallet} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default XRPLProjectWalletList
