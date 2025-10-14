import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/utils';
import {
  LayoutDashboard,
  Calculator,
  FileText,
  TrendingUp,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';

interface NavNavigationProps {
  projectId?: string;
}

/**
 * Horizontal navigation component for the NAV module
 * Provides quick access to all major NAV sections
 */
const NavNavigation: React.FC<NavNavigationProps> = ({ projectId }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    // Exact match for dashboard
    if (path === '/nav' && (currentPath === '/nav' || currentPath === '/nav/')) {
      return true;
    }
    // Prefix match for other paths
    return currentPath.startsWith(path) && path !== '/nav';
  };

  // Define navigation links
  const navLinks = [
    {
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: 'Dashboard',
      href: projectId ? `/projects/${projectId}/nav` : '/nav',
      active: currentPath === '/nav' || currentPath === '/nav/',
    },
    {
      icon: <Landmark className="h-4 w-4" />,
      label: 'Bonds',
      href: projectId ? `/projects/${projectId}/nav/bonds` : '/nav/bonds',
      active: isActive('/nav/bonds'),
    },
  ];

  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex space-x-8 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              'flex items-center gap-2 py-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
              link.active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NavNavigation;
