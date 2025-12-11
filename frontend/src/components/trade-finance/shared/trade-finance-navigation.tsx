/**
 * Trade Finance Navigation Component
 * Horizontal navigation for the Trade Finance module
 * Pattern: Similar to BondNavigation and NavNavigation
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/utils'
import {
  LayoutDashboard,
  PackagePlus,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  AlertTriangle,
  Shield,
  Settings,
  BarChart3,
} from 'lucide-react'

interface TradeFinanceNavigationProps {
  projectId?: string
}

const TradeFinanceNavigation: React.FC<TradeFinanceNavigationProps> = ({ projectId }) => {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    return currentPath.includes(path)
  }

  // Define navigation links
  const navLinks = projectId
    ? [
        {
          icon: <LayoutDashboard className="h-4 w-4" />,
          label: 'Dashboard',
          href: `/projects/${projectId}/trade-finance`,
          active:
            currentPath === `/projects/${projectId}/trade-finance` ||
            currentPath === `/projects/${projectId}/trade-finance/`,
        },
        {
          icon: <PackagePlus className="h-4 w-4" />,
          label: 'Tokenize',
          href: `/projects/${projectId}/trade-finance/tokenize`,
          active: isActive('/trade-finance/tokenize'),
        },
        {
          icon: <ArrowUpCircle className="h-4 w-4" />,
          label: 'Supply',
          href: `/projects/${projectId}/trade-finance/supply`,
          active: isActive('/trade-finance/supply'),
        },
        {
          icon: <ArrowDownCircle className="h-4 w-4" />,
          label: 'Borrow',
          href: `/projects/${projectId}/trade-finance/borrow`,
          active: isActive('/trade-finance/borrow'),
        },
        {
          icon: <Wallet className="h-4 w-4" />,
          label: 'My Positions',
          href: `/projects/${projectId}/trade-finance/positions`,
          active: isActive('/trade-finance/positions'),
        },
        {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Liquidations',
          href: `/projects/${projectId}/trade-finance/liquidations`,
          active: isActive('/trade-finance/liquidations'),
        },
        {
          icon: <BarChart3 className="h-4 w-4" />,
          label: 'Analytics',
          href: `/projects/${projectId}/trade-finance/analytics`,
          active: isActive('/trade-finance/analytics'),
        },
        {
          icon: <Settings className="h-4 w-4" />,
          label: 'Admin',
          href: `/projects/${projectId}/trade-finance/admin`,
          active: isActive('/trade-finance/admin'),
        },
      ]
    : [
        {
          icon: <LayoutDashboard className="h-4 w-4" />,
          label: 'Dashboard',
          href: '/trade-finance',
          active:
            currentPath === '/trade-finance' ||
            currentPath === '/trade-finance/',
        },
        {
          icon: <PackagePlus className="h-4 w-4" />,
          label: 'Tokenize',
          href: '/trade-finance/tokenize',
          active: isActive('/trade-finance/tokenize'),
        },
        {
          icon: <ArrowUpCircle className="h-4 w-4" />,
          label: 'Supply',
          href: '/trade-finance/supply',
          active: isActive('/trade-finance/supply'),
        },
        {
          icon: <ArrowDownCircle className="h-4 w-4" />,
          label: 'Borrow',
          href: '/trade-finance/borrow',
          active: isActive('/trade-finance/borrow'),
        },
        {
          icon: <Wallet className="h-4 w-4" />,
          label: 'My Positions',
          href: '/trade-finance/positions',
          active: isActive('/trade-finance/positions'),
        },
        {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Liquidations',
          href: '/trade-finance/liquidations',
          active: isActive('/trade-finance/liquidations'),
        },
        {
          icon: <BarChart3 className="h-4 w-4" />,
          label: 'Analytics',
          href: '/trade-finance/analytics',
          active: isActive('/trade-finance/analytics'),
        },
        {
          icon: <Settings className="h-4 w-4" />,
          label: 'Admin',
          href: '/trade-finance/admin',
          active: isActive('/trade-finance/admin'),
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

export default TradeFinanceNavigation
