/**
 * Injective Navigation Component
 * 
 * Provides comprehensive navigation for Injective TokenFactory features
 * Updated to match Chain Capital's Injective Native integration
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Coins,
  TrendingUp,
  Settings,
  ChevronRight,
  Wallet,
  Activity
} from 'lucide-react'

interface InjectiveNavigationProps {
  className?: string
  walletConnected?: boolean
}

export function InjectiveNavigation({ className, walletConnected = false }: InjectiveNavigationProps) {
  const location = useLocation()

  const navItems = [
    {
      title: 'Dashboard',
      href: '/injective',
      icon: Home,
      description: 'Injective overview and portfolio',
      requiresWallet: false
    },
    {
      title: 'Wallet',
      href: '/injective/wallet',
      icon: Wallet,
      description: 'Connect and manage Injective wallets',
      requiresWallet: false
    },
    {
      title: 'Deploy Token',
      href: '/injective/deploy',
      icon: Coins,
      description: 'Create TokenFactory tokens',
      badge: 'Native',
      requiresWallet: true
    },
    {
      title: 'Launch Market',
      href: '/injective/market',
      icon: TrendingUp,
      description: 'Launch spot markets on DEX',
      badge: 'DEX',
      requiresWallet: true
    },
    {
      title: 'MTS Transfer',
      href: '/injective/mts-transfer',
      icon: Activity,
      description: 'Cross-VM token transfers',
      badge: 'MTS',
      requiresWallet: true
    },
    {
      title: 'Manage Tokens',
      href: '/injective/manage',
      icon: Settings,
      description: 'Mint, burn, and update tokens',
      requiresWallet: true
    },
    {
      title: 'Transactions',
      href: '/injective/transactions',
      icon: Activity,
      description: 'Transaction history and monitoring',
      requiresWallet: true
    }
  ]

  const isActive = (href: string) => {
    if (href === '/injective') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <nav className={cn('space-y-1', className)}>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        const disabled = item.requiresWallet && !walletConnected

        return (
          <Link
            key={item.href}
            to={disabled ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && active && 'bg-primary text-primary-foreground',
              !disabled && !active && 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={(e) => disabled && e.preventDefault()}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant={active ? 'secondary' : 'outline'}
                    className="text-xs shrink-0"
                  >
                    {item.badge}
                  </Badge>
                )}
                {disabled && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Wallet Required
                  </Badge>
                )}
              </div>
              <p className="text-xs truncate opacity-80">{item.description}</p>
            </div>
            {!disabled && <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Breadcrumb Navigation for Injective
 */
interface InjectiveBreadcrumbProps {
  currentPage?: string
  className?: string
}

export function InjectiveBreadcrumb({ 
  currentPage = 'Dashboard', 
  className 
}: InjectiveBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link to="/injective" className="hover:text-foreground transition-colors">
        Injective
      </Link>
      {currentPage !== 'Dashboard' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{currentPage}</span>
        </>
      )}
    </div>
  )
}

/**
 * Quick Stats Component for Injective
 */
interface InjectiveStatsProps {
  className?: string
  walletBalance?: string
  tokenCount?: number
  marketCount?: number
  transactionCount?: number
}

export function InjectiveStats({ 
  className,
  walletBalance = '0',
  tokenCount = 0,
  marketCount = 0,
  transactionCount = 0
}: InjectiveStatsProps) {
  const stats = [
    { label: 'INJ Balance', value: walletBalance, color: 'text-blue-600' },
    { label: 'Tokens Created', value: tokenCount.toString(), color: 'text-green-600' },
    { label: 'Markets Launched', value: marketCount.toString(), color: 'text-purple-600' },
    { label: 'Transactions', value: transactionCount.toString(), color: 'text-amber-600' }
  ]

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center p-4 bg-muted/50 rounded-lg">
          <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
