/**
 * MMF Navigation Component
 * Horizontal navigation for the Money Market Funds module
 * Follows exact pattern from BondNavigation
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

interface MMFNavigationProps {
  projectId?: string
}

const MMFNavigation: React.FC<MMFNavigationProps> = ({ projectId }) => {
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
          label: 'All MMFs',
          href: `/projects/${projectId}/nav/mmf`,
          active:
            currentPath === `/projects/${projectId}/nav/mmf` ||
            (currentPath.includes('/nav/mmf') && 
             !currentPath.includes('/create') && 
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.includes('/nav-tracker') &&
             !currentPath.match(/\/nav\/mmf\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add MMF',
          href: `/projects/${projectId}/nav/mmf/create`,
          active: isActive('/nav/mmf/create'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: `/projects/${projectId}/nav/mmf/upload`,
          active: isActive('/nav/mmf/upload'),
        },
        {
          icon: <Activity className="h-4 w-4" />,
          label: 'NAV Tracker',
          href: `/projects/${projectId}/nav/mmf/nav-tracker`,
          active: isActive('/nav/mmf/nav-tracker'),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: `/projects/${projectId}/nav/mmf/analytics`,
          active: isActive('/nav/mmf/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: `/projects/${projectId}/nav/mmf/token-links`,
          active: isActive('/nav/mmf/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: `/projects/${projectId}/nav/mmf/history`,
          active: isActive('/nav/mmf/history'),
        },
      ]
    : [
        {
          icon: <FileText className="h-4 w-4" />,
          label: 'All MMFs',
          href: '/nav/mmf',
          active:
            currentPath === '/nav/mmf' ||
            (currentPath.includes('/nav/mmf') &&
             !currentPath.includes('/create') &&
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.includes('/nav-tracker') &&
             !currentPath.match(/\/nav\/mmf\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add MMF',
          href: '/nav/mmf/create',
          active: isActive('/nav/mmf/create'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: '/nav/mmf/upload',
          active: isActive('/nav/mmf/upload'),
        },
        {
          icon: <Calculator className="h-4 w-4" />,
          label: 'Calculator',
          href: '/nav/calculators/mmf',
          active: isActive('/nav/calculators/mmf') || (currentPath.includes('/nav/mmf') && currentPath.includes('/calculate')),
        },
        {
          icon: <Activity className="h-4 w-4" />,
          label: 'NAV Tracker',
          href: '/nav/mmf/nav-tracker',
          active: isActive('/nav/mmf/nav-tracker'),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: '/nav/mmf/analytics',
          active: isActive('/nav/mmf/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: '/nav/mmf/token-links',
          active: isActive('/nav/mmf/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: '/nav/mmf/history',
          active: isActive('/nav/mmf/history'),
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

export default MMFNavigation
