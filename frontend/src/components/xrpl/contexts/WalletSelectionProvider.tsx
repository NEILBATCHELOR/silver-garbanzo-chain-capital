/**
 * Wallet Selection Provider
 * 
 * Provides stable wallet selection context to prevent unnecessary re-renders
 * Isolates wallet loading from component re-render cycles
 * 
 * Key Features:
 * - Loads wallets ONCE per parameter set
 * - Provides stable context values
 * - Prevents form data loss from cascading re-renders
 * - Automatic wallet decryption support
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { projectWalletService, ProjectWalletData } from '@/services/project/project-wallet-service'
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService'
import { useToast } from '@/components/ui/use-toast'

interface WalletSelectionContextType {
  selectedWallet: (ProjectWalletData & { decryptedPrivateKey?: string }) | null
  wallets: ProjectWalletData[]
  isLoading: boolean
  error: string | null
  selectWallet: (walletId: string, autoDecrypt?: boolean) => Promise<void>
  refreshWallets: () => Promise<void>
}

const WalletSelectionContext = createContext<WalletSelectionContextType | undefined>(undefined)

export interface WalletSelectionProviderProps {
  projectId: string
  blockchain?: string
  network?: 'mainnet' | 'testnet' | 'all'
  evmOnly?: boolean
  children: ReactNode
}

export function WalletSelectionProvider({ 
  projectId, 
  blockchain, 
  network = 'all',
  evmOnly = false,
  children 
}: WalletSelectionProviderProps) {
  const [wallets, setWallets] = useState<ProjectWalletData[]>([])
  const [selectedWallet, setSelectedWallet] = useState<(ProjectWalletData & { decryptedPrivateKey?: string }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  // CRITICAL: Stable parameters check to prevent redundant loads
  const paramsKeyRef = useRef('')
  const isDecryptingRef = useRef(false)
  
  useEffect(() => {
    const newKey = `${projectId}-${blockchain || ''}-${network}-${evmOnly}`
    if (paramsKeyRef.current !== newKey) {
      paramsKeyRef.current = newKey
      loadWallets()
    }
  }, [projectId, blockchain, network, evmOnly])
  
  // Helper to determine blockchain from wallet data
  const getWalletBlockchain = (wallet: ProjectWalletData): string => {
    // Check non-EVM networks first
    if (wallet.non_evm_network) {
      const network = wallet.non_evm_network.toLowerCase()
      // CRITICAL FIX: Handle both 'ripple' and 'xrpl' identifiers
      if (network.includes('xrpl') || network.includes('ripple')) return 'xrpl'
      if (network.includes('solana')) return 'solana'
      if (network.includes('injective')) return 'injective'
      return network
    }
    
    // Check wallet_type for legacy support
    if (wallet.wallet_type) {
      const walletType = wallet.wallet_type.toLowerCase()
      if (walletType === 'ripple' || walletType === 'xrp') return 'xrpl'
    }
    
    // Check chain ID for EVM chains
    if (wallet.chain_id) {
      const chainId = wallet.chain_id
      if (chainId === '1776' || chainId === '1439') return 'injective'
      if (chainId === '1') return 'ethereum'
      if (chainId === '137') return 'polygon'
      if (chainId === '56') return 'bsc'
      if (chainId === '43114') return 'avalanche'
      if (chainId === '42161') return 'arbitrum'
      if (chainId === '10') return 'optimism'
      if (chainId === '8453') return 'base'
    }
    
    return 'unknown'
  }

  const loadWallets = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch project wallets
      const projectWallets = await projectWalletService.getProjectWallets(projectId)

      // Filter by blockchain if specified
      let filteredWallets = projectWallets
      if (blockchain) {
        filteredWallets = projectWallets.filter(w => {
          const walletBlockchain = getWalletBlockchain(w)
          return walletBlockchain === blockchain.toLowerCase()
        })
      }

      // Filter by network if specified
      if (network !== 'all') {
        filteredWallets = filteredWallets.filter(w => {
          const walletNetwork = w.net?.toLowerCase() || ''
          if (network === 'mainnet') {
            return walletNetwork === 'mainnet' || (!walletNetwork.includes('test') && !walletNetwork.includes('dev'))
          } else {
            return walletNetwork.includes('test') || walletNetwork.includes('dev')
          }
        })
      }

      // Filter to EVM-only wallets if specified
      if (evmOnly) {
        filteredWallets = filteredWallets.filter(w => {
          return w.wallet_address.startsWith('0x') && w.wallet_address.length === 42
        })
      }

      setWallets(filteredWallets)
    } catch (err: any) {
      console.error('Error loading wallets:', err)
      setError(err.message || 'Failed to load wallets')
      toast({
        title: 'Error Loading Wallets',
        description: err.message || 'Failed to load project wallets',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const decryptPrivateKey = async (encryptedKey: string): Promise<string | null> => {
    try {
      return await WalletEncryptionClient.decrypt(encryptedKey)
    } catch (err: any) {
      console.error('Error decrypting private key:', err)
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        toast({
          title: 'Backend Not Available',
          description: 'Unable to reach decryption service. Please ensure the backend server is running.',
          variant: 'destructive'
        })
      }
      
      return null
    }
  }

  const selectWallet = async (walletId: string, autoDecrypt: boolean = false) => {
    const wallet = wallets.find(w => w.id === walletId)
    
    if (!wallet) {
      setSelectedWallet(null)
      return
    }

    // Prevent concurrent decryption operations
    if (isDecryptingRef.current) {
      return
    }

    // If auto-decrypt is enabled and wallet has private key
    if (autoDecrypt && wallet.private_key) {
      isDecryptingRef.current = true
      
      try {
        const decryptedKey = await decryptPrivateKey(wallet.private_key)
        
        if (decryptedKey) {
          setSelectedWallet({
            ...wallet,
            decryptedPrivateKey: decryptedKey
          })
        } else {
          toast({
            title: 'Decryption Failed',
            description: 'Unable to decrypt wallet private key',
            variant: 'destructive'
          })
          setSelectedWallet(wallet)
        }
      } catch (err: any) {
        console.error('Error in wallet selection:', err)
        setSelectedWallet(wallet)
      } finally {
        isDecryptingRef.current = false
      }
    } else {
      setSelectedWallet(wallet)
    }
  }

  const refreshWallets = async () => {
    paramsKeyRef.current = '' // Force refresh
    await loadWallets()
  }
  
  const contextValue: WalletSelectionContextType = {
    selectedWallet,
    wallets,
    isLoading,
    error,
    selectWallet,
    refreshWallets
  }
  
  return (
    <WalletSelectionContext.Provider value={contextValue}>
      {children}
    </WalletSelectionContext.Provider>
  )
}

export function useWalletSelection() {
  const context = useContext(WalletSelectionContext)
  if (context === undefined) {
    throw new Error('useWalletSelection must be used within a WalletSelectionProvider')
  }
  return context
}
