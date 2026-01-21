/**
 * Vault Horizontal Navigation Component
 * 
 * Provides horizontal tab navigation for Vault (CCeTracker) features
 * Matches the ClimateReceivables pattern
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { 
  LayoutDashboard,
  PiggyBank,
  PlusCircle,
  MinusCircle,
  BarChart3,
  FileText,
  Settings
} from "lucide-react";

interface VaultNavigationProps {
  projectId?: string;
}

export const VaultNavigation: React.FC<VaultNavigationProps> = ({ projectId }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Get project-aware or standalone URLs
  const getPath = (subPath: string) => {
    if (projectId) {
      return `/projects/${projectId}/vault${subPath}`;
    }
    return `/vault${subPath}`;
  };

  // Define navigation links
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: getPath(""),
      active: currentPath === getPath("") || currentPath === `/vault`,
    },
    {
      icon: <PiggyBank className="h-4 w-4" />,
      label: "My Vaults",
      href: getPath("/list"),
      active: isActive("/list"),
    },
    {
      icon: <PlusCircle className="h-4 w-4" />,
      label: "Deposit",
      href: getPath("/deposit"),
      active: isActive("/deposit"),
    },
    {
      icon: <MinusCircle className="h-4 w-4" />,
      label: "Withdraw",
      href: getPath("/withdraw"),
      active: isActive("/withdraw"),
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Analytics",
      href: getPath("/analytics"),
      active: isActive("/analytics"),
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Reports",
      href: getPath("/reports"),
      active: isActive("/reports"),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      href: getPath("/settings"),
      active: isActive("/settings"),
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
 * Breadcrumb Navigation for Vault
 */
interface VaultBreadcrumbProps {
  projectId?: string;
  projectName?: string;
  currentPage?: string;
  className?: string;
}

export function VaultBreadcrumb({ 
  projectId,
  projectName,
  currentPage = 'Dashboard', 
  className 
}: VaultBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Link to="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      <span>/</span>
      {projectId && projectName ? (
        <>
          <Link to="/projects" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <span>/</span>
          <Link to={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
            {projectName}
          </Link>
          <span>/</span>
        </>
      ) : null}
      <Link to={projectId ? `/projects/${projectId}/vault` : '/vault'} className="hover:text-foreground transition-colors">
        Vault
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
 * Quick Stats Component for Vault
 */
interface VaultStatsProps {
  className?: string;
  totalDeposited?: string;
  totalYield?: string;
  activeVaults?: number;
  totalTransactions?: number;
}

export function VaultStats({ 
  className,
  totalDeposited = '0',
  totalYield = '0',
  activeVaults = 0,
  totalTransactions = 0
}: VaultStatsProps) {
  const stats = [
    { label: 'Total Deposited', value: `$${totalDeposited}`, color: 'text-blue-600' },
    { label: 'Total Yield', value: `$${totalYield}`, color: 'text-green-600' },
    { label: 'Active Vaults', value: activeVaults.toString(), color: 'text-purple-600' },
    { label: 'Transactions', value: totalTransactions.toString(), color: 'text-amber-600' }
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
