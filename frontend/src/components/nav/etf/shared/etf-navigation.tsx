/**
 * ETF Navigation Component
 * Horizontal navigation for the Exchange-Traded Funds module
 * Follows exact pattern from MMFNavigation
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/utils'
import {
  LayoutDashboard,
  FileText,
  Plus,
  Upload,
  Calculator,
  TrendingUp,
  History,
  Settings,
  Link as LinkIcon,
  Activity,
  AlertTriangle,
} from 'lucide-react'

interface ETFNavigationProps {
  projectId?: string
}

const ETFNavigation: React.FC<ETFNavigationProps> = ({ projectId }) => {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    return currentPath.includes(path)
  }

  // Define navigation links
  const navLinks = projectId
    ? [
        {
          icon: <FileText className="h-4 w-4" />,
          label: 'All ETFs',
          href: `/projects/${projectId}/nav/etf`,
          active:
            currentPath === `/projects/${projectId}/nav/etf` ||
            (currentPath.includes('/nav/etf') && 
             !currentPath.includes('/create') && 
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.includes('/nav-tracker') &&
             !currentPath.match(/\/nav\/etf\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add ETF',
          href: `/projects/${projectId}/nav/etf/create`,
          active: isActive('/nav/etf/create'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: `/projects/${projectId}/nav/etf/upload`,
          active: isActive('/nav/etf/upload'),
        },
        {
          icon: <Activity className="h-4 w-4" />,
          label: 'NAV Tracker',
          href: `/projects/${projectId}/nav/etf/nav-tracker`,
          active: isActive('/nav/etf/nav-tracker'),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: `/projects/${projectId}/nav/etf/analytics`,
          active: isActive('/nav/etf/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: `/projects/${projectId}/nav/etf/token-links`,
          active: isActive('/nav/etf/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: `/projects/${projectId}/nav/etf/history`,
          active: isActive('/nav/etf/history'),
        },
      ]
    : [
        {
          icon: <FileText className="h-4 w-4" />,
          label: 'All ETFs',
          href: '/nav/etf',
          active:
            currentPath === '/nav/etf' ||
            (currentPath.includes('/nav/etf') &&
             !currentPath.includes('/create') &&
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.includes('/nav-tracker') &&
             !currentPath.match(/\/nav\/etf\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add ETF',
          href: '/nav/etf/create',
          active: isActive('/nav/etf/create'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: '/nav/etf/upload',
          active: isActive('/nav/etf/upload'),
        },
        {
          icon: <Calculator className="h-4 w-4" />,
          label: 'Calculator',
          href: '/nav/calculators/etf',
          active: isActive('/nav/calculators/etf') || (currentPath.includes('/nav/etf') && currentPath.includes('/calculate')),
        },
        {
          icon: <Activity className="h-4 w-4" />,
          label: 'NAV Tracker',
          href: '/nav/etf/nav-tracker',
          active: isActive('/nav/etf/nav-tracker'),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: '/nav/etf/analytics',
          active: isActive('/nav/etf/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: '/nav/etf/token-links',
          active: isActive('/nav/etf/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: '/nav/etf/history',
          active: isActive('/nav/etf/history'),
        },
      ]

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              'flex items-center gap-2 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
              link.active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ETFNavigation
