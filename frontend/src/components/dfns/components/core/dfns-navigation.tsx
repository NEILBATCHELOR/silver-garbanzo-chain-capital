import { useState } from 'react';
import { cn } from '@/utils/utils';
import { 
  HomeIcon, 
  Wallet,
  Shield,
  Users,
  ArrowRightLeft,
  FileCheck,
  BarChart3,
  Settings,
  Key,
  CreditCard
} from 'lucide-react';
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem,
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * Navigation component for the DFNS module
 * Provides access to all major DFNS features and functionality
 */
export function DfnsNavigation() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState<string>('dashboard');

  const handleNavigate = (path: string, item: string) => {
    navigate(path);
    setActiveItem(item);
  };

  return (
    <div className="flex flex-col space-y-6 w-64 bg-background border-r p-4 h-screen">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold">DFNS Platform</h2>
      </div>

      <NavigationMenu orientation="vertical" className="max-w-full block space-y-1">
        <NavigationMenuList className="flex flex-col space-y-1">
          <NavigationMenuItem className="w-full">
            <Button 
              variant={activeItem === 'dashboard' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => handleNavigate('/wallet/dfns', 'dashboard')}
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </NavigationMenuItem>

          {/* Wallets Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('wallets') && "bg-accent text-accent-foreground"
            )}>
              <Wallet className="mr-2 h-4 w-4" />
              Wallets
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/wallets', 'wallets-list')}
                    >
                      All Wallets
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/wallets/create', 'wallets-create')}
                    >
                      Create Wallet
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/assets', 'wallets-assets')}
                    >
                      Asset Management
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Authentication Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('auth') && "bg-accent text-accent-foreground"
            )}>
              <Shield className="mr-2 h-4 w-4" />
              Authentication
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/auth/users', 'auth-users')}
                    >
                      Users
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/auth/service-accounts', 'auth-service-accounts')}
                    >
                      Service Accounts
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/auth/tokens', 'auth-tokens')}
                    >
                      Personal Access Tokens
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/auth/credentials', 'auth-credentials')}
                    >
                      Credentials
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Permissions Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('permissions') && "bg-accent text-accent-foreground"
            )}>
              <Key className="mr-2 h-4 w-4" />
              Permissions
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/permissions', 'permissions-list')}
                    >
                      Permission Management
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/permissions/assignments', 'permissions-assignments')}
                    >
                      Access Assignments
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/permissions/roles', 'permissions-roles')}
                    >
                      Role Templates
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Transactions Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('transactions') && "bg-accent text-accent-foreground"
            )}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transactions
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/transactions', 'transactions-list')}
                    >
                      Transaction History
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/transactions/broadcast', 'transactions-broadcast')}
                    >
                      Broadcast Transaction
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/transactions/pending', 'transactions-pending')}
                    >
                      Pending Transactions
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Policies Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('policies') && "bg-accent text-accent-foreground"
            )}>
              <FileCheck className="mr-2 h-4 w-4" />
              Policies
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/policies', 'policies-list')}
                    >
                      Policy Dashboard
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/policies/approvals', 'policies-approvals')}
                    >
                      Approval Queue
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Analytics Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('analytics') && "bg-accent text-accent-foreground"
            )}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/analytics/activity', 'analytics-activity')}
                    >
                      Activity Analytics
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/analytics/security', 'analytics-security')}
                    >
                      Security Metrics
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/wallet/dfns/analytics/usage', 'analytics-usage')}
                    >
                      Usage Statistics
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Settings Section */}
          <NavigationMenuItem className="w-full">
            <Button 
              variant={activeItem === 'settings' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => handleNavigate('/wallet/dfns/settings', 'settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
