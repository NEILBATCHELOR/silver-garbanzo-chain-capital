/**
 * XRPL Navigation Component
 * 
 * Provides comprehensive navigation for all XRPL features
 * Updated with ALL 16 feature categories
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/utils'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Wallet,
  Coins,
  Image,
  Send,
  ArrowLeftRight,
  Shield,
  TrendingUp,
  Droplets,
  ChevronRight,
  User,
  ShieldCheck,
  Key,
  Wrench,
  Activity,
  FileText
} from 'lucide-react'

interface XRPLNavigationProps {
  className?: string
  walletConnected?: boolean
}

export function XRPLNavigation({ className, walletConnected = false }: XRPLNavigationProps) {
  const location = useLocation()

  const navItems = [
    {
      title: 'Dashboard',
      href: '/xrpl',
      icon: Home,
      description: 'XRPL overview and portfolio',
      requiresWallet: false
    },
    {
      title: 'Wallet',
      href: '/xrpl/wallet',
      icon: Wallet,
      description: 'Connect and manage XRPL wallets',
      requiresWallet: false
    },
    {
      title: 'MPT Tokens',
      href: '/xrpl/mpt',
      icon: Coins,
      description: 'Multi-Purpose Token management',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'NFTs',
      href: '/xrpl/nfts',
      icon: Image,
      description: 'Mint, trade, and manage NFTs',
      requiresWallet: true
    },
    {
      title: 'Payments',
      href: '/xrpl/payments',
      icon: Send,
      description: 'Send XRP and tokens',
      requiresWallet: true
    },
    {
      title: 'Advanced Payments',
      href: '/xrpl/advanced',
      icon: ArrowLeftRight,
      description: 'Channels, Escrow, Checks',
      requiresWallet: true
    },
    {
      title: 'Multi-Sig',
      href: '/xrpl/multisig',
      icon: Shield,
      description: 'Multi-signature account management',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'AMM Pools',
      href: '/xrpl/amm',
      icon: Droplets,
      description: 'Automated Market Maker liquidity pools',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'DEX Trading',
      href: '/xrpl/dex',
      icon: TrendingUp,
      description: 'Decentralized exchange order books',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Trust Lines',
      href: '/xrpl/trustlines',
      icon: Shield,
      description: 'Manage token trust lines',
      requiresWallet: true
    },
    {
      title: 'Identity',
      href: '/xrpl/identity',
      icon: User,
      description: 'DIDs and verifiable credentials',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Compliance',
      href: '/xrpl/compliance',
      icon: ShieldCheck,
      description: 'Asset freeze and deposit authorization',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Security',
      href: '/xrpl/security',
      icon: Key,
      description: 'Key rotation and account security',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Advanced Tools',
      href: '/xrpl/tools',
      icon: Wrench,
      description: 'Batch operations, path finding, oracles',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Monitoring',
      href: '/xrpl/monitoring',
      icon: Activity,
      description: 'Real-time WebSocket monitoring',
      badge: 'New',
      requiresWallet: true
    },
    {
      title: 'Transactions',
      href: '/xrpl/transactions',
      icon: FileText,
      description: 'Transaction history and monitoring',
      requiresWallet: true
    }
  ]

  const isActive = (href: string) => {
    if (href === '/xrpl') {
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
 * Breadcrumb Navigation for XRPL
 */
interface XRPLBreadcrumbProps {
  currentPage?: string
  className?: string
}

export function XRPLBreadcrumb({ 
  currentPage = 'Dashboard', 
  className 
}: XRPLBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link to="/xrpl" className="hover:text-foreground transition-colors">
        XRPL
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
 * Quick Stats Component for XRPL
 */
interface XRPLStatsProps {
  className?: string
  walletBalance?: string
  mptCount?: number
  nftCount?: number
  transactionCount?: number
}

export function XRPLStats({ 
  className,
  walletBalance = '0',
  mptCount = 0,
  nftCount = 0,
  transactionCount = 0
}: XRPLStatsProps) {
  const stats = [
    { label: 'XRP Balance', value: walletBalance, color: 'text-blue-600' },
    { label: 'MPT Tokens', value: mptCount.toString(), color: 'text-green-600' },
    { label: 'NFTs Owned', value: nftCount.toString(), color: 'text-purple-600' },
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
