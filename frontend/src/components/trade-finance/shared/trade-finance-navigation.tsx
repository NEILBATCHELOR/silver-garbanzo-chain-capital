/**
 * Trade Finance Navigation Component
 * 
 * Provides navigation for Trade Finance admin pages and features
 */

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/utils';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Settings,
  Shield,
  FileText,
  AlertTriangle,
  Home,
  ChevronRight
} from 'lucide-react';

interface TradeFinanceNavigationProps {
  className?: string;
}

export function TradeFinanceNavigation({ className }: TradeFinanceNavigationProps) {
  const location = useLocation();

  const navItems = [
    {
      title: 'Overview',
      href: '/admin/trade-finance',
      icon: Home,
      description: 'Trade Finance dashboard and overview'
    },
    {
      title: 'Deployments',
      href: '/admin/trade-finance?tab=deployments',
      icon: Database,
      description: 'Contract deployments and verification',
      badge: '27 contracts'
    },
    {
      title: 'Parameters',
      href: '/admin/trade-finance?tab=parameters',
      icon: Settings,
      description: 'Deployment parameters and configuration',
      badge: 'All phases'
    },
    {
      title: 'Risk Controls',
      href: '/admin/trade-finance?tab=risk',
      icon: Shield,
      description: 'Risk management and security settings'
    },
    {
      title: 'Asset Listing',
      href: '/admin/trade-finance?tab=assets',
      icon: FileText,
      description: 'Commodity and asset configurations'
    },
    {
      title: 'Emergency',
      href: '/admin/trade-finance?tab=emergency',
      icon: AlertTriangle,
      description: 'Emergency controls and circuit breakers',
      badge: 'Critical'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin/trade-finance') {
      return location.pathname === href && !location.search;
    }
    return location.pathname + location.search === href;
  };

  return (
    <nav className={cn('space-y-1', className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
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
              </div>
              <p className="text-xs truncate opacity-80">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Breadcrumb Navigation for Trade Finance
 */
interface TradeFinanceBreadcrumbProps {
  currentPage?: string;
  className?: string;
}

export function TradeFinanceBreadcrumb({ 
  currentPage = 'Overview', 
  className 
}: TradeFinanceBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/admin" className="hover:text-foreground transition-colors">
        Admin
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link to="/admin/trade-finance" className="hover:text-foreground transition-colors">
        Trade Finance
      </Link>
      {currentPage !== 'Overview' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{currentPage}</span>
        </>
      )}
    </div>
  );
}

/**
 * Quick Stats Component for Trade Finance
 */
interface TradeFinanceStatsProps {
  className?: string;
}

export function TradeFinanceStats({ className }: TradeFinanceStatsProps) {
  const stats = [
    { label: 'Total Contracts', value: '27', color: 'text-blue-600' },
    { label: 'UUPS Upgradeable', value: '21', color: 'text-green-600' },
    { label: 'Direct Deploy', value: '6', color: 'text-amber-600' },
    { label: 'Deployment Phases', value: '5', color: 'text-purple-600' }
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center p-4 bg-muted/50 rounded-lg">
          <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
