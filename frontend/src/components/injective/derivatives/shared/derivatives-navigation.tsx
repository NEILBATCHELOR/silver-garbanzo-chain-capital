/**
 * Derivatives Horizontal Navigation Component
 * 
 * Provides horizontal tab navigation for Injective Derivatives features
 * Matches the Injective pattern
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { 
  LayoutDashboard,
  Rocket,
  Target,
  ListOrdered,
  History,
  BarChart3,
  Settings
} from "lucide-react";

interface DerivativesNavigationProps {
  projectId?: string;
  walletConnected?: boolean;
}

export const DerivativesNavigation: React.FC<DerivativesNavigationProps> = ({ 
  projectId,
  walletConnected = false 
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Get project-aware or standalone URLs
  const getPath = (subPath: string) => {
    if (projectId) {
      return `/projects/${projectId}/injective/derivatives${subPath}`;
    }
    return `/derivatives${subPath}`;
  };

  // Define navigation links
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: getPath(""),
      active: currentPath === getPath("") || currentPath.endsWith("/derivatives"),
      requiresWallet: false,
    },
    {
      icon: <Rocket className="h-4 w-4" />,
      label: "Launch Market",
      href: getPath("/launch"),
      active: isActive("/launch"),
      requiresWallet: true,
      badge: "Admin",
    },
    {
      icon: <Target className="h-4 w-4" />,
      label: "Open Position",
      href: getPath("/position"),
      active: isActive("/position"),
      requiresWallet: true,
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: "Orders",
      href: getPath("/orders"),
      active: isActive("/orders"),
      requiresWallet: true,
    },
    {
      icon: <History className="h-4 w-4" />,
      label: "History",
      href: getPath("/history"),
      active: isActive("/history"),
      requiresWallet: true,
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Analytics",
      href: getPath("/analytics"),
      active: isActive("/analytics"),
      requiresWallet: false,
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      href: getPath("/settings"),
      active: isActive("/settings"),
      requiresWallet: true,
    },
  ];

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navLinks.map((link) => {
          const isDisabled = link.requiresWallet && !walletConnected;
          
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-2 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                link.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
                isDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {link.icon}
              {link.label}
              {link.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Breadcrumb Navigation for Derivatives
 */
interface DerivativesBreadcrumbProps {
  projectId?: string;
  currentPage?: string;
  className?: string;
}

export function DerivativesBreadcrumb({ 
  projectId,
  currentPage = 'Dashboard', 
  className 
}: DerivativesBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      <span>/</span>
      {projectId && (
        <>
          <Link to={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
            Project
          </Link>
          <span>/</span>
        </>
      )}
      <Link to={projectId ? `/projects/${projectId}/injective` : '/injective'} className="hover:text-foreground transition-colors">
        Injective
      </Link>
      <span>/</span>
      <Link to={projectId ? `/projects/${projectId}/injective/derivatives` : '/derivatives'} className="hover:text-foreground transition-colors">
        Derivatives
      </Link>
      {currentPage !== 'Dashboard' && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{currentPage}</span>
        </>
      )}
    </div>
  );
}

/**
 * Quick Stats Component for Derivatives
 */
interface DerivativesStatsProps {
  className?: string;
  totalPositions?: number;
  totalValue?: string;
  unrealizedPnL?: string;
  totalMarkets?: number;
}

export function DerivativesStats({ 
  className,
  totalPositions = 0,
  totalValue = '0',
  unrealizedPnL = '0',
  totalMarkets = 0
}: DerivativesStatsProps) {
  const pnl = parseFloat(unrealizedPnL);
  const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';
  
  const stats = [
    { label: 'Open Positions', value: totalPositions.toString(), color: 'text-blue-600' },
    { label: 'Total Value', value: `$${parseFloat(totalValue).toFixed(2)}`, color: 'text-purple-600' },
    { label: 'Unrealized PnL', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, color: pnlColor },
    { label: 'Active Markets', value: totalMarkets.toString(), color: 'text-amber-600' }
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
