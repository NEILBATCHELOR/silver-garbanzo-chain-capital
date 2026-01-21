/**
 * XRPL Horizontal Navigation Component
 * 
 * Provides horizontal tab navigation for XRPL features
 * Matches the ClimateReceivables pattern
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  Wallet,
  Coins,
  Image,
  Send,
  ArrowLeftRight,
  Shield,
  TrendingUp,
  Droplets,
  User,
  ShieldCheck,
  Key,
  Wrench,
  Activity,
  FileText
} from "lucide-react";

interface XRPLNavigationProps {
  projectId?: string;
}

export const XRPLNavigation: React.FC<XRPLNavigationProps> = ({ projectId }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Get project-aware or standalone URLs
  const getPath = (subPath: string) => {
    if (projectId) {
      return `/projects/${projectId}/xrpl${subPath}`;
    }
    return `/xrpl${subPath}`;
  };

  // Define navigation links - comprehensive XRPL features
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: getPath(""),
      active: currentPath === getPath("") || currentPath === `/xrpl`,
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Wallet",
      href: getPath("/wallet"),
      active: isActive("/wallet"),
    },
    {
      icon: <Coins className="h-4 w-4" />,
      label: "MPT Tokens",
      href: getPath("/mpt"),
      active: isActive("/mpt"),
    },
    {
      icon: <Image className="h-4 w-4" />,
      label: "NFTs",
      href: getPath("/nfts"),
      active: isActive("/nfts"),
    },
    {
      icon: <Send className="h-4 w-4" />,
      label: "Payments",
      href: getPath("/payments"),
      active: isActive("/payments"),
    },
    {
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: "Advanced Payments",
      href: getPath("/advanced"),
      active: isActive("/advanced"),
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Multi-Sig",
      href: getPath("/multisig"),
      active: isActive("/multisig"),
    },
    {
      icon: <Droplets className="h-4 w-4" />,
      label: "AMM Pools",
      href: getPath("/amm"),
      active: isActive("/amm"),
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "DEX Trading",
      href: getPath("/dex"),
      active: isActive("/dex"),
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Trust Lines",
      href: getPath("/trustlines"),
      active: isActive("/trustlines"),
    },
    {
      icon: <User className="h-4 w-4" />,
      label: "Identity",
      href: getPath("/identity"),
      active: isActive("/identity"),
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Compliance",
      href: getPath("/compliance"),
      active: isActive("/compliance"),
    },
    {
      icon: <Key className="h-4 w-4" />,
      label: "Security",
      href: getPath("/security"),
      active: isActive("/security"),
    },
    {
      icon: <Wrench className="h-4 w-4" />,
      label: "Advanced Tools",
      href: getPath("/tools"),
      active: isActive("/tools"),
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: "Monitoring",
      href: getPath("/monitoring"),
      active: isActive("/monitoring"),
    },
    {
      icon: <FileText className="h-4 w-4" />,
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
 * Breadcrumb Navigation for XRPL
 */
interface XRPLBreadcrumbProps {
  currentPage?: string;
  className?: string;
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
      <span>/</span>
      <Link to="/xrpl" className="hover:text-foreground transition-colors">
        XRPL
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
 * Quick Stats Component for XRPL
 */
interface XRPLStatsProps {
  className?: string;
  walletBalance?: string;
  mptCount?: number;
  nftCount?: number;
  transactionCount?: number;
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
