/**
 * Solana Horizontal Navigation Component
 * 
 * Provides horizontal tab navigation for Solana Token Launchpad features
 * Includes all available components
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { 
  LayoutDashboard,
  Rocket,
  List,
  ArrowLeftRight,
  Coins,
  Search,
  Users,
  TrendingUp,
  Info,
  History,
  Send,
  Download,
  Settings
} from "lucide-react";

export interface SolanaNavigationProps {
  projectId?: string;
  tokenId?: string; // For token-specific navigation
}

export const SolanaNavigation: React.FC<SolanaNavigationProps> = ({ 
  projectId, 
  tokenId 
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Get project-aware or standalone URLs
  const getPath = (subPath: string) => {
    if (projectId) {
      return `/projects/${projectId}/solana${subPath}`;
    }
    return `/solana${subPath}`;
  };

  // Define navigation links for Token Launchpad
  const mainNavLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: getPath(""),
      active: currentPath === getPath("") || currentPath === `/solana`,
    },
    {
      icon: <Rocket className="h-4 w-4" />,
      label: "Deploy Token",
      href: getPath("/deploy"),
      active: isActive("/deploy"),
    },
    {
      icon: <List className="h-4 w-4" />,
      label: "My Tokens",
      href: getPath("/list"),
      active: isActive("/list"),
    },
  ];

  // Token-specific navigation (shows when viewing a specific token)
  const tokenNavLinks = tokenId ? [
    {
      icon: <Info className="h-4 w-4" />,
      label: "Overview",
      href: getPath(`/token/${tokenId}`),
      active: currentPath === getPath(`/token/${tokenId}`),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Operations",
      href: getPath(`/token/${tokenId}/operations`),
      active: isActive("/operations"),
    },
    {
      icon: <Coins className="h-4 w-4" />,
      label: "Balance",
      href: getPath(`/token/${tokenId}/balance`),
      active: isActive("/balance"),
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Metadata",
      href: getPath(`/token/${tokenId}/metadata`),
      active: isActive("/metadata"),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Holders",
      href: getPath(`/token/${tokenId}/holders`),
      active: isActive("/holders"),
    },
    {
      icon: <History className="h-4 w-4" />,
      label: "Transactions",
      href: getPath(`/token/${tokenId}/transactions`),
      active: isActive("/transactions"),
    },
    {
      icon: <Send className="h-4 w-4" />,
      label: "Transfer",
      href: getPath(`/token/${tokenId}/transfer`),
      active: isActive("/transfer"),
    },
    {
      icon: <Search className="h-4 w-4" />,
      label: "Search",
      href: getPath(`/token/${tokenId}/search`),
      active: isActive("/search"),
    },
    {
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: "Batch Transfer",
      href: getPath(`/token/${tokenId}/batch`),
      active: isActive("/batch"),
    },
  ] : [];

  const navLinks = tokenId ? tokenNavLinks : mainNavLinks;

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
 * Breadcrumb Navigation for Solana
 */
export interface SolanaBreadcrumbProps {
  projectId?: string;
  projectName?: string;
  currentPage?: string;
  tokenName?: string;
  className?: string;
}

export function SolanaBreadcrumb({ 
  projectId,
  projectName,
  currentPage = 'Dashboard',
  tokenName,
  className 
}: SolanaBreadcrumbProps) {
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
      <Link to={projectId ? `/projects/${projectId}/solana` : '/solana'} className="hover:text-foreground transition-colors">
        Solana Token Launchpad
      </Link>
      {tokenName && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{tokenName}</span>
        </>
      )}
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
 * Quick Stats Component for Solana Token Launchpad
 */
export interface SolanaStatsProps {
  className?: string;
  totalTokens?: number;
  splTokens?: number;
  token2022Count?: number;
  totalDeployments?: number;
}

export function SolanaStats({ 
  className,
  totalTokens = 0,
  splTokens = 0,
  token2022Count = 0,
  totalDeployments = 0
}: SolanaStatsProps) {
  const stats = [
    { label: 'Total Tokens', value: totalTokens.toString(), color: 'text-blue-600', icon: <Coins className="h-4 w-4" /> },
    { label: 'SPL Tokens', value: splTokens.toString(), color: 'text-green-600', icon: <Coins className="h-4 w-4" /> },
    { label: 'Token-2022', value: token2022Count.toString(), color: 'text-purple-600', icon: <Coins className="h-4 w-4" /> },
    { label: 'Total Deployments', value: totalDeployments.toString(), color: 'text-amber-600', icon: <Rocket className="h-4 w-4" /> }
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <div className={cn('p-2 rounded-full bg-background', stat.color)}>
            {stat.icon}
          </div>
          <div>
            <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
