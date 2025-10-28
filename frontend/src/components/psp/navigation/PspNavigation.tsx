import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import {
  LayoutDashboard,
  Key,
  Webhook,
  ShieldCheck,
  Wallet,
  Receipt,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  DollarSign,
  Percent,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";

interface PspNavigationProps {
  projectId: string;
}

function PspNavigation({ projectId }: PspNavigationProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: `/projects/${projectId}/psp/dashboard`,
    },
    {
      icon: <Key className="h-4 w-4" />,
      label: "API Keys",
      href: `/projects/${projectId}/psp/api-keys`,
    },
    {
      icon: <Webhook className="h-4 w-4" />,
      label: "Webhooks",
      href: `/projects/${projectId}/psp/webhooks`,
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Identity",
      href: `/projects/${projectId}/psp/identity`,
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Accounts",
      href: `/projects/${projectId}/psp/accounts`,
    },
    {
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: "Payments",
      href: `/projects/${projectId}/psp/payments`,
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Trades",
      href: `/projects/${projectId}/psp/trades`,
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Balances",
      href: `/projects/${projectId}/psp/balances`,
    },
    {
      icon: <Percent className="h-4 w-4" />,
      label: "Spreads",
      href: `/projects/${projectId}/psp/spreads`,
    },
    {
      icon: <Receipt className="h-4 w-4" />,
      label: "Transactions",
      href: `/projects/${projectId}/psp/transactions`,
    },
    {
      icon: <FileSpreadsheet className="h-4 w-4" />,
      label: "Quotes",
      href: `/projects/${projectId}/psp/quotes`,
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Reports",
      href: `/projects/${projectId}/psp/reports`,
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      href: `/projects/${projectId}/psp/settings`,
    },
  ];

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navItems.map((item) => {
          // Check if this is the dashboard item and we're on the base psp path
          const isDashboardActive = 
            item.label === "Dashboard" && 
            (pathname === `/projects/${projectId}/psp` || 
             pathname === `/projects/${projectId}/psp/dashboard`);
             
          // For other items, check if the pathname starts with the href
          const isActive = 
            isDashboardActive || 
            (item.label !== "Dashboard" && pathname.startsWith(item.href));
            
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default PspNavigation;
