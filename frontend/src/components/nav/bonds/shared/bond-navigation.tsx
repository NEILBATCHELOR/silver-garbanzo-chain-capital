/**
 * Bond Navigation Component
 * Horizontal navigation for the Bonds module
 * Similar pattern to ClimateReceivablesNavigation
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
} from 'lucide-react'

interface BondNavigationProps {
  projectId?: string
}

const BondNavigation: React.FC<BondNavigationProps> = ({ projectId }) => {
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
          label: 'All Bonds',
          href: `/projects/${projectId}/nav/bonds`,
          active:
            currentPath === `/projects/${projectId}/nav/bonds` ||
            (currentPath.includes('/nav/bonds') && 
             !currentPath.includes('/new') && 
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.match(/\/nav\/bonds\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add Bond',
          href: `/projects/${projectId}/nav/bonds/new`,
          active: isActive('/nav/bonds/new'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: `/projects/${projectId}/nav/bonds/upload`,
          active: isActive('/nav/bonds/upload'),
        },
        {
          icon: <Calculator className="h-4 w-4" />,
          label: 'Calculator',
          href: `/projects/${projectId}/nav/calculators/bonds`,
          active: isActive('/nav/calculators/bonds') || (currentPath.includes('/nav/bonds') && currentPath.includes('/calculate')),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: `/projects/${projectId}/nav/bonds/analytics`,
          active: isActive('/nav/bonds/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: `/projects/${projectId}/nav/bonds/token-links`,
          active: isActive('/nav/bonds/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: `/projects/${projectId}/nav/bonds/history`,
          active: isActive('/nav/bonds/history'),
        },
      ]
    : [
        {
          icon: <FileText className="h-4 w-4" />,
          label: 'All Bonds',
          href: '/nav/bonds',
          active:
            currentPath === '/nav/bonds' ||
            (currentPath.includes('/nav/bonds') &&
             !currentPath.includes('/new') &&
             !currentPath.includes('/upload') &&
             !currentPath.includes('/analytics') &&
             !currentPath.includes('/calculator') &&
             !currentPath.match(/\/nav\/bonds\/[^/]+\/(edit|calculate)/)),
        },
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'Add Bond',
          href: '/nav/bonds/new',
          active: isActive('/nav/bonds/new'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Bulk Upload',
          href: '/nav/bonds/upload',
          active: isActive('/nav/bonds/upload'),
        },
        {
          icon: <Calculator className="h-4 w-4" />,
          label: 'Calculator',
          href: '/nav/calculators/bonds',
          active: isActive('/nav/calculators/bonds') || (currentPath.includes('/nav/bonds') && currentPath.includes('/calculate')),
        },
        {
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'Analytics',
          href: '/nav/bonds/analytics',
          active: isActive('/nav/bonds/analytics'),
        },
        {
          icon: <LinkIcon className="h-4 w-4" />,
          label: 'Token Links',
          href: '/nav/bonds/token-links',
          active: isActive('/nav/bonds/token-links'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'NAV History',
          href: '/nav/bonds/history',
          active: isActive('/nav/bonds/history'),
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

export default BondNavigation
