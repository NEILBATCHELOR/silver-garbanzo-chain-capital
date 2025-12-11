/**
 * Trade Finance Dashboard Header
 * Matches NAV Dashboard Header style with project/org selectors
 * Pattern: Similar to NavDashboardHeaderEnhanced
 * 
 * Features:
 * - Organization/Company selector
 * - Project selector  
 * - Action buttons (Tokenize, Supply, Borrow, etc.)
 * - Refresh functionality
 * - Real-time badge
 * - Health factor display
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  PackagePlus, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Upload,
  AlertTriangle 
} from 'lucide-react'
import { CombinedOrgProjectSelector } from '@/components/organizations'

interface TradeFinanceDashboardHeaderProps {
  projectId?: string
  projectName?: string
  title?: string
  subtitle?: string
  onRefresh?: () => void
  onProjectChange?: (projectId: string) => void
  actions?: React.ReactNode
  isLoading?: boolean
  showTokenize?: boolean
  showSupply?: boolean
  showBorrow?: boolean
  showBulkUpload?: boolean
  onTokenize?: () => void
  onSupply?: () => void
  onBorrow?: () => void
  onBulkUpload?: () => void
  healthFactor?: number // User's current health factor
  showHealthFactor?: boolean
}

export function TradeFinanceDashboardHeader({
  projectId,
  projectName,
  title = 'Trade Finance',
  subtitle = 'Commodity-backed lending and tokenization',
  onRefresh,
  onProjectChange,
  actions,
  isLoading = false,
  showTokenize = false,
  showSupply = false,
  showBorrow = false,
  showBulkUpload = false,
  onTokenize,
  onSupply,
  onBorrow,
  onBulkUpload,
  healthFactor,
  showHealthFactor = false
}: TradeFinanceDashboardHeaderProps) {
  // Health factor badge color
  const getHealthFactorBadge = (hf: number) => {
    if (hf >= 1.5) {
      return <Badge variant="default" className="bg-green-500 text-white">Healthy: {hf.toFixed(2)}</Badge>
    } else if (hf >= 1.1) {
      return <Badge variant="default" className="bg-yellow-500 text-white">Warning: {hf.toFixed(2)}</Badge>
    } else if (hf >= 1.0) {
      return <Badge variant="default" className="bg-orange-500 text-white">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Risk: {hf.toFixed(2)}
      </Badge>
    } else {
      return <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Liquidatable: {hf.toFixed(2)}
      </Badge>
    }
  }

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Top Row: Title and Project Selectors */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {projectName ? `${projectName} - ${title}` : title}
              </h1>
              <Badge variant="secondary" className="text-xs">
                Real-time
              </Badge>
              {showHealthFactor && healthFactor !== undefined && (
                getHealthFactorBadge(healthFactor)
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Organization & Project Selector */}
            <CombinedOrgProjectSelector 
              currentProjectId={projectId}
              onProjectChange={onProjectChange}
              layout="horizontal"
              compact={true}
              className="min-w-[300px]"
            />

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
            {showBulkUpload && onBulkUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            )}

            {showTokenize && onTokenize && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTokenize}
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                Tokenize
              </Button>
            )}

            {showSupply && onSupply && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSupply}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Supply
              </Button>
            )}

            {showBorrow && onBorrow && (
              <Button
                size="sm"
                onClick={onBorrow}
                disabled={isLoading}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Borrow
              </Button>
            )}

            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradeFinanceDashboardHeader
