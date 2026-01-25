/**
 * Vault Dashboard Header
 * Matches Trade Finance Dashboard Header style with wallet/network/project selectors
 * 
 * Features:
 * - Project selector for multi-tenancy
 * - Network selector (Mainnet/Testnet/Devnet)
 * - Wallet selector with project filtering and auto-decryption
 * - Action buttons (Deposit, Withdraw, Analytics)
 * - Refresh functionality
 * - Real-time badge
 * - Wallet balance display
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  PlusCircle,
  MinusCircle,
  BarChart3,
  AlertCircle,
  Briefcase,
  PiggyBank
} from 'lucide-react'
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

export interface VaultDashboardHeaderProps {
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
  walletAddress?: string
  walletBalance?: string
  title?: string
  subtitle?: string
  projectId?: string
  onRefresh?: () => void
  onNetworkChange?: (network: 'MAINNET' | 'TESTNET' | 'DEVNET') => void
  onProjectChange?: (projectId: string) => void
  onWalletSelect?: (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => void
  actions?: React.ReactNode
  isLoading?: boolean
  showDeposit?: boolean
  showWithdraw?: boolean
  showAnalytics?: boolean
  onDeposit?: () => void
  onWithdraw?: () => void
  onAnalytics?: () => void
}

export function VaultDashboardHeader({
  network = 'TESTNET',
  walletAddress,
  walletBalance,
  title = 'Yield Vaults',
  subtitle = 'CCeTracker vault management and analytics',
  projectId,
  onRefresh,
  onNetworkChange,
  onProjectChange,
  onWalletSelect,
  actions,
  isLoading = false,
  showDeposit = true,
  showWithdraw = true,
  showAnalytics = true,
  onDeposit,
  onWithdraw,
  onAnalytics
}: VaultDashboardHeaderProps) {
  
  const { primaryProject, loadPrimaryProject } = usePrimaryProject({ loadOnMount: true })
  
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

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Top Row: Title and Selectors */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <PiggyBank className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                {title}
              </h1>
              <Badge variant="secondary" className="text-xs">
                CCeTracker
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Real-time
              </Badge>
              {getNetworkBadge(network)}
              {walletAddress && walletBalance && (
                <Badge variant="outline" className="text-xs font-mono">
                  {walletBalance} USD
                </Badge>
              )}
              {primaryProject && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {primaryProject.name}
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
                value={(projectId || primaryProject.id) ?? ''} 
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
            <Select value={network ?? 'TESTNET'} onValueChange={onNetworkChange}>
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
                network={network.toLowerCase() as 'mainnet' | 'testnet' | 'all'}
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
            {showDeposit && onDeposit && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeposit}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Deposit
              </Button>
            )}

            {showWithdraw && onWithdraw && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onWithdraw}
              >
                <MinusCircle className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            )}

            {showAnalytics && onAnalytics && walletAddress && projectId && (
              <Button
                size="sm"
                onClick={onAnalytics}
                disabled={isLoading}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
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
              Please select a project to access Vault features
            </span>
          </div>
        )}

        {/* Warning if no wallet connected */}
        {!walletAddress && projectId && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Select a wallet to access all features
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default VaultDashboardHeader
