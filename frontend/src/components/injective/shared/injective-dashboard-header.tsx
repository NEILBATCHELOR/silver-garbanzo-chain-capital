/**
 * Injective Dashboard Header
 * Matches Solana Dashboard Header pattern for consistency
 * 
 * Features:
 * - Project selector for multi-tenancy
 * - Network selector (Mainnet/Testnet)
 * - Wallet selector with project filtering and auto-decryption
 * - Action buttons (Deploy Token, Manage Tokens, Launch Market)
 * - Refresh functionality
 * - Real-time badge
 * - Wallet balance display with loading state
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Rocket,
  Coins,
  TrendingUp,
  AlertCircle,
  Briefcase
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

export interface InjectiveDashboardHeaderProps {
  network?: 'MAINNET' | 'TESTNET'
  walletAddress?: string
  walletBalance?: string
  walletId?: string // Track selected wallet ID
  title?: string
  subtitle?: string
  projectId?: string
  projectName?: string
  onRefresh?: () => void
  onNetworkChange?: (network: 'MAINNET' | 'TESTNET') => void
  onProjectChange?: (projectId: string) => void
  onWalletSelect?: (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => void
  actions?: React.ReactNode
  isLoading?: boolean
  isLoadingBalance?: boolean
  showDeploy?: boolean
  showManage?: boolean
  showMarket?: boolean
  onDeploy?: () => void
  onManage?: () => void
  onMarket?: () => void
}

export function InjectiveDashboardHeader({
  network = 'TESTNET',
  walletAddress,
  walletBalance,
  walletId,
  title = 'Injective Token Launchpad',
  subtitle = 'Deploy and manage native tokens and markets on Injective',
  projectId,
  projectName,
  onRefresh,
  onNetworkChange,
  onProjectChange,
  onWalletSelect,
  actions,
  isLoading = false,
  isLoadingBalance = false,
  showDeploy = true,
  showManage = true,
  showMarket = true,
  onDeploy,
  onManage,
  onMarket
}: InjectiveDashboardHeaderProps) {
  
  const { primaryProject } = usePrimaryProject({ loadOnMount: true })
  
  // Load primary project on mount and notify parent
  useEffect(() => {
    if (primaryProject && onProjectChange && !projectId) {
      onProjectChange(primaryProject.id)
    }
  }, [primaryProject, onProjectChange, projectId])
  
  const getNetworkBadge = (net: string) => {
    if (net === 'MAINNET') {
      return <Badge variant="default" className="bg-green-500 text-white">Mainnet</Badge>
    } else {
      return <Badge variant="default" className="bg-blue-500 text-white">Testnet</Badge>
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
                    `${walletBalance} INJ`
                  )}
                </Badge>
              )}
              {(projectId || projectName) && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {projectName || primaryProject?.name || 'Project'}
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
              </SelectContent>
            </Select>

            {/* Wallet Selector */}
            {projectId && (
              <WalletSelector
                projectId={projectId}
                blockchain="injective"
                network={network.toLowerCase() as 'mainnet' | 'testnet' | 'all'}
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
            {showDeploy && onDeploy && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeploy}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Token
              </Button>
            )}

            {showManage && onManage && walletAddress && projectId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManage}
                disabled={isLoading}
              >
                <Coins className="h-4 w-4 mr-2" />
                Manage Tokens
              </Button>
            )}

            {showMarket && onMarket && walletAddress && projectId && (
              <Button
                size="sm"
                onClick={onMarket}
                disabled={isLoading}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Launch Market
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
              Please select a project to access Injective features
            </span>
          </div>
        )}

        {/* Warning if no wallet connected */}
        {!walletAddress && projectId && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Select an Injective wallet to access all features
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default InjectiveDashboardHeader
