/**
 * XRPL Dashboard Header
 * Matches Trade Finance Dashboard Header style with wallet/network/project selectors
 * 
 * Features:
 * - Project selector for multi-tenancy
 * - Network selector (Mainnet/Testnet/Devnet)
 * - Wallet selector with project filtering and auto-decryption
 * - Action buttons (MPT, NFT, Payment features)
 * - Refresh functionality
 * - Real-time badge
 * - Wallet balance display
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Coins,
  Image,
  Send,
  AlertCircle,
  Briefcase,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WalletSelector } from '@/components/shared/WalletSelector'
import { usePrimaryProject } from '@/hooks/project/usePrimaryProject'
import { useEffect } from 'react'
import type { ProjectWalletData } from '@/services/project/project-wallet-service'

export interface XRPLDashboardHeaderProps {
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  walletAddress?: string
  walletBalance?: string
  walletId?: string // Track selected wallet
  title?: string
  subtitle?: string
  projectId?: string
  projectName?: string // Display project name from parent
  onRefresh?: () => void
  onNetworkChange?: (network: 'MAINNET' | 'TESTNET' | 'DEVNET') => void
  onProjectChange?: (projectId: string) => void
  onWalletSelect?: (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => void
  actions?: React.ReactNode
  isLoading?: boolean
  isLoadingBalance?: boolean // Loading state for balance
  showMPT?: boolean
  showNFT?: boolean
  showPayments?: boolean
  onMPT?: () => void
  onNFT?: () => void
  onPayments?: () => void
}

export function XRPLDashboardHeader({
  network = 'TESTNET',
  walletAddress,
  walletBalance,
  walletId,
  title = 'XRPL Integration',
  subtitle = 'XRP Ledger blockchain integration and asset management',
  projectId,
  projectName,
  onRefresh,
  onNetworkChange,
  onProjectChange,
  onWalletSelect,
  actions,
  isLoading = false,
  isLoadingBalance = false,
  showMPT = true,
  showNFT = true,
  showPayments = true,
  onMPT,
  onNFT,
  onPayments
}: XRPLDashboardHeaderProps) {
  
  const { primaryProject, loadPrimaryProject } = usePrimaryProject({ loadOnMount: true })
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  
  // Load primary project on mount and notify parent
  useEffect(() => {
    if (primaryProject && onProjectChange && !projectId) {
      onProjectChange(primaryProject.id)
    }
  }, [primaryProject, onProjectChange, projectId])
  
  const getNetworkBadge = (net: string) => {
    if (net === 'MAINNET') {
      return <Badge variant="default" className="bg-green-500 text-white">Mainnet</Badge>
    } else if (net === 'TESTNET') {
      return <Badge variant="default" className="bg-blue-500 text-white">Testnet</Badge>
    } else {
      return <Badge variant="default" className="bg-purple-500 text-white">Devnet</Badge>
    }
  }

  const handleCopyWallet = async () => {
    if (!walletAddress) return
    
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'Wallet address copied to clipboard'
      })
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy wallet address:', error)
      toast({
        title: 'Copy Failed',
        description: 'Could not copy wallet address',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Top Row: Title and Selectors */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {title}
              </h1>
              <Badge variant="secondary" className="text-xs">
                Real-time
              </Badge>
              {getNetworkBadge(network)}
              {walletAddress && walletBalance && (
                <Badge variant="outline" className="text-xs font-mono">
                  {isLoadingBalance ? (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    `${walletBalance} XRP`
                  )}
                </Badge>
              )}
              {(projectId || projectName) && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {projectName || primaryProject?.name || 'Project'}
                </Badge>
              )}
              {walletAddress && (
                <Badge variant="outline" className="text-xs font-mono">
                  <span className="mr-1">Wallet:</span>
                  <span>{walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={handleCopyWallet}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Project Selector */}
            {primaryProject && (
              <Select 
                value={projectId || primaryProject.id} 
                onValueChange={onProjectChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={primaryProject.id}>
                    {primaryProject.name}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Network Selector */}
            <Select value={network} onValueChange={onNetworkChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINNET">Mainnet</SelectItem>
                <SelectItem value="TESTNET">Testnet</SelectItem>
                <SelectItem value="DEVNET">Devnet</SelectItem>
              </SelectContent>
            </Select>

            {/* Wallet Selector */}
            {projectId && (
              <WalletSelector
                projectId={projectId}
                blockchain="xrpl"
                network="all"
                value={walletId}
                onWalletSelect={onWalletSelect}
                placeholder="Select wallet"
                showBalance={true}
                autoDecrypt={true}
              />
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>

            {/* Action Buttons */}
            {showMPT && onMPT && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMPT}
              >
                <Coins className="h-4 w-4 mr-2" />
                MPT Tokens
              </Button>
            )}

            {showNFT && onNFT && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNFT}
              >
                <Image className="h-4 w-4 mr-2" />
                NFTs
              </Button>
            )}

            {showPayments && onPayments && walletAddress && projectId && (
              <Button
                size="sm"
                onClick={onPayments}
                disabled={isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Payment
              </Button>
            )}

            {/* Custom Actions */}
            {actions}
          </div>
        </div>

        {/* Warning if no project selected */}
        {!projectId && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Please select a project to access XRPL features
            </span>
          </div>
        )}

        {/* Warning if no wallet connected */}
        {!walletAddress && projectId && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Select an XRPL wallet to access all features
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default XRPLDashboardHeader
