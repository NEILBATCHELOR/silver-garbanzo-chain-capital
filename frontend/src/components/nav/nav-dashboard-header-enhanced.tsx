/**
 * Enhanced NAV Dashboard Header
 * Matches Climate Receivables dashboard style with project/fund selectors
 * 
 * Features:
 * - Organization/Company selector
 * - Project/Fund selector  
 * - Action buttons (Add Bond, Calculate NAV, etc.)
 * - Refresh functionality
 * - Real-time badge
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Calculator, Plus, FileSpreadsheet } from 'lucide-react'
import { CombinedOrgProjectSelector } from '@/components/organizations'

interface NavDashboardHeaderEnhancedProps {
  projectId?: string
  projectName?: string
  title?: string
  subtitle?: string
  onRefresh?: () => void
  onProjectChange?: (projectId: string) => void
  actions?: React.ReactNode
  isLoading?: boolean
  showCalculateNav?: boolean
  showAddButtons?: boolean
  onCalculateNav?: () => void
  onAddItem?: () => void
  onBulkUpload?: () => void
}

export function NavDashboardHeaderEnhanced({
  projectId,
  projectName,
  title = 'NAV Dashboard',
  subtitle = 'Net Asset Value calculations and analytics',
  onRefresh,
  onProjectChange,
  actions,
  isLoading = false,
  showCalculateNav = true,
  showAddButtons = false,
  onCalculateNav,
  onAddItem,
  onBulkUpload
}: NavDashboardHeaderEnhancedProps) {
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
            {showAddButtons && (
              <>
                {onBulkUpload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkUpload}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                )}
                {onAddItem && (
                  <Button
                    size="sm"
                    onClick={onAddItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </>
            )}

            {/* Calculate NAV Button */}
            {showCalculateNav && onCalculateNav && (
              <Button
                size="sm"
                onClick={onCalculateNav}
                disabled={isLoading}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate NAV
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

export default NavDashboardHeaderEnhanced
