import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import {
  LayoutDashboard,
  Wallet,
  Shield,
  Key,
  ArrowRightLeft,
  FileCheck,
  BarChart3,
  Settings,
} from "lucide-react";

interface DfnsHorizontalNavigationProps {
  // No projectId needed for DFNS - it's wallet-scoped
}

function DfnsHorizontalNavigation({}: DfnsHorizontalNavigationProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: `/wallet/dfns/dashboard`,
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Wallets",
      href: `/wallet/dfns/wallets`,
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Authentication",
      href: `/wallet/dfns/auth`,
    },
    {
      icon: <Key className="h-4 w-4" />,
      label: "Permissions",
      href: `/wallet/dfns/permissions`,
    },
    {
      icon: <ArrowRightLeft className="h-4 w-4" />,
      label: "Transactions",
      href: `/wallet/dfns/transactions`,
    },
    {
      icon: <FileCheck className="h-4 w-4" />,
      label: "Policies",
      href: `/wallet/dfns/policies`,
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Analytics",
      href: `/wallet/dfns/analytics`,
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      href: `/wallet/dfns/settings`,
    },
  ];

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navItems.map((item) => {
          // Check if this is the dashboard item and we're on the base dfns path
          const isDashboardActive = 
            item.label === "Dashboard" && 
            (pathname === `/wallet/dfns` || 
             pathname === `/wallet/dfns/dashboard`);
             
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

export default DfnsHorizontalNavigation;