/**
 * Trade Finance Breadcrumb
 * Navigation breadcrumb for trade finance pages
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function TradeFinanceBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbMap: Record<string, string> = {
    'trade-finance': 'Trade Finance',
    'marketplace': 'Marketplace',
    'markets': 'Markets',
    'supply': 'Supply',
    'borrow': 'Borrow',
    'portfolio': 'Portfolio',
    'admin': 'Administration',
    'history': 'Transaction History',
    'analytics': 'Analytics',
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const isLast = index === pathSegments.length - 1;
        const label = breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <div key={path} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
