/**
 * Injective Horizontal Navigation Component
 * 
 * Provides horizontal tab navigation for Injective TokenFactory features
 * Matches the ClimateReceivables pattern
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { 
  LayoutDashboard,
  Coins,
  TrendingUp,
  Settings,
  Wallet,
  Activity,
  ArrowLeftRight,
  BarChart3
} from "lucide-react";

interface InjectiveNavigationProps {
  projectId?: string;
}

export const InjectiveNavigation: React.FC<InjectiveNavigationProps> = ({ projectId }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Get project-aware or standalone URLs
  const getPath = (subPath: string) => {
    if (projectId) {
      return `/projects/${projectId}/injective${subPath}`;
    }
    return `/injective${subPath}`;
  };

  // Define navigation links
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: getPath(""),
      active: currentPath === getPath("") || currentPath === `/injective`,
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Wallet",
      href: getPath("/wallet"),
      active: isActive("/wallet"),
    },
    {
      icon: <Coins className="h-4 w-4" />,
      label: "Deploy Token",
      href: getPath("/deploy"),
      active: isActive("/deploy"),
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Launch Market",
      href: getPath("/market"),
      active: isActive("/market"),
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Derivatives",
      href: getPath("/derivatives"),
      active: isActive("/derivatives"),
    },
    {
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: "MTS Transfer",
      href: getPath("/mts-transfer"),
      active: isActive("/mts-transfer"),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Manage Tokens",
      href: getPath("/manage"),
      active: isActive("/manage"),
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: "Transactions",
      href: getPath("/transactions"),
      active: isActive("/transactions"),
    },
  ];

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navLinks.map((link) => {
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-2 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                link.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Breadcrumb Navigation for Injective
 */
interface InjectiveBreadcrumbProps {
  currentPage?: string;
  className?: string;
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
      <span>/</span>
      <Link to="/injective" className="hover:text-foreground transition-colors">
        Injective
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
 * Quick Stats Component for Injective
 */
interface InjectiveStatsProps {
  className?: string;
  walletBalance?: string;
  tokenCount?: number;
  marketCount?: number;
  transactionCount?: number;
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
