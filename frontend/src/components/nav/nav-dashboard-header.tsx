/**
 * NAV Dashboard Header
 * Header component with navigation, search, and quick actions
 */

import { useState } from 'react'
import { Search, Calculator, History, Settings, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavDashboardHeaderProps {
  title?: string
  subtitle?: string
  onSearch?: (query: string) => void
  onRefresh?: () => void
  onQuickCalculate?: () => void
  onViewHistory?: () => void
  onSettings?: () => void
  isLoading?: boolean
  searchPlaceholder?: string
}

export function NavDashboardHeader({
  title = 'NAV Dashboard',
  subtitle = 'Net Asset Value calculations and analytics',
  onSearch,
  onRefresh,
  onQuickCalculate,
  onViewHistory,
  onSettings,
  isLoading = false,
  searchPlaceholder = 'Search calculators, assets, or projects...'
}: NavDashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim())
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Trigger search on input change for instant results
    if (value.length > 2 || value.length === 0) {
      onSearch?.(value)
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-6 border-b">
      {/* Main header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            Real-time
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="hidden sm:flex"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Quick actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onQuickCalculate}
                className="cursor-pointer"
              >
                <Calculator className="h-4 w-4 mr-2" />
                New Calculation
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onViewHistory}
                className="cursor-pointer"
              >
                <History className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onSettings}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onRefresh}
                disabled={isLoading}
                className="cursor-pointer sm:hidden"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary action button */}
          <Button 
            onClick={onQuickCalculate}
            disabled={isLoading}
            className="hidden sm:flex"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate NAV
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {onSearch && (
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
        </form>
      )}
    </div>
  )
}

export default NavDashboardHeader
