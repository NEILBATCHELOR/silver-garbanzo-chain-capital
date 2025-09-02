import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/utils";
import { 
  LayoutDashboard,
  Factory,
  Zap,
  FileText,
  Package,
  Trophy,
  Leaf,
  Gauge,
  Combine,
  Users,
  TrendingUp
} from "lucide-react";

interface ClimateReceivablesNavigationProps {
  projectId: string;
}

/**
 * Navigation component for the Climate Receivables module
 */
const ClimateReceivablesNavigation: React.FC<ClimateReceivablesNavigationProps> = ({ projectId }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.includes(path);
  };

  // Define navigation links with project-aware URLs
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
      href: `/projects/${projectId}/climate-receivables/dashboard`,
      active: currentPath === `/projects/${projectId}/climate-receivables/dashboard` || 
              currentPath === `/projects/${projectId}/climate-receivables`,
    },
    {
      icon: <Factory className="h-4 w-4" />,
      label: "Energy Assets",
      href: `/projects/${projectId}/climate-receivables/assets`,
      active: isActive("/climate-receivables/assets"),
    },
    {
      icon: <Zap className="h-4 w-4" />,
      label: "Production Data",
      href: `/projects/${projectId}/climate-receivables/production`,
      active: isActive("/climate-receivables/production"),
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Receivables",
      href: `/projects/${projectId}/climate-receivables/receivables`,
      active: isActive("/climate-receivables/receivables"),
    },
    {
      icon: <Package className="h-4 w-4" />,
      label: "Tokenization Pools",
      href: `/projects/${projectId}/climate-receivables/pools`,
      active: isActive("/climate-receivables/pools"),
    },
    {
      icon: <Combine className="h-4 w-4" />,
      label: "Pool Management",
      href: `/projects/${projectId}/climate-receivables/pools/manage`,
      active: isActive("/climate-receivables/pools/manage"),
    },
    {
      icon: <Trophy className="h-4 w-4" />,
      label: "Incentives",
      href: `/projects/${projectId}/climate-receivables/incentives`,
      active: isActive("/climate-receivables/incentives"),
    },
    {
      icon: <Leaf className="h-4 w-4" />,
      label: "Carbon Offsets",
      href: `/projects/${projectId}/climate-receivables/carbon-offsets`,
      active: isActive("/climate-receivables/carbon-offsets"),
    },
    {
      icon: <Gauge className="h-4 w-4" />,
      label: "RECs",
      href: `/projects/${projectId}/climate-receivables/recs`,
      active: isActive("/climate-receivables/recs"),
    },
    {
      icon: <Combine className="h-4 w-4" />,
      label: "Tokenization",
      href: `/projects/${projectId}/climate-receivables/tokenization`,
      active: isActive("/climate-receivables/tokenization"),
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Distribution",
      href: `/projects/${projectId}/climate-receivables/distribution`,
      active: isActive("/climate-receivables/distribution"),
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Visualizations",
      href: `/projects/${projectId}/climate-receivables/visualizations`,
      active: isActive("/climate-receivables/visualizations"),
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

export default ClimateReceivablesNavigation;