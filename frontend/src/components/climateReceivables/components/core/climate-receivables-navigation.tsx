import { useState } from 'react';
import { cn } from '@/utils/utils';
import { 
  HomeIcon, 
  Sun,
  Wind,
  Receipt,
  Award,
  Leaf,
  Medal,
  LineChart,
  Wallet,
  Settings,
  BarChart3
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
 * Navigation component for the Climate Receivables module
 * Provides access to all major features and entity types
 */
export function ClimateReceivablesNavigation() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState<string>('dashboard');

  const handleNavigate = (path: string, item: string) => {
    navigate(path);
    setActiveItem(item);
  };

  return (
    <div className="flex flex-col space-y-6 w-64 bg-background border-r p-4 h-screen">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold">Climate Finance</h2>
      </div>

      <NavigationMenu orientation="vertical" className="max-w-full block space-y-1">
        <NavigationMenuList className="flex flex-col space-y-1">
          <NavigationMenuItem className="w-full">
            <Button 
              variant={activeItem === 'dashboard' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => handleNavigate('/climate-receivables', 'dashboard')}
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </NavigationMenuItem>

          {/* Assets Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('assets') && "bg-accent text-accent-foreground"
            )}>
              <Sun className="mr-2 h-4 w-4" />
              Energy Assets
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/assets', 'assets-list')}
                    >
                      All Assets
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/assets/create', 'assets-create')}
                    >
                      Add New Asset
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/production-data', 'assets-production')}
                    >
                      Production Data
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Receivables Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('receivables') && "bg-accent text-accent-foreground"
            )}>
              <Receipt className="mr-2 h-4 w-4" />
              Receivables
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/receivables', 'receivables-list')}
                    >
                      All Receivables
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/receivables/create', 'receivables-create')}
                    >
                      Add New Receivable
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/payers', 'receivables-payers')}
                    >
                      Manage Payers
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Incentives Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('incentives') && "bg-accent text-accent-foreground"
            )}>
              <Award className="mr-2 h-4 w-4" />
              Incentives
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/incentives', 'incentives-list')}
                    >
                      All Incentives
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/incentives/create', 'incentives-create')}
                    >
                      Add New Incentive
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/policies', 'incentives-policies')}
                    >
                      Policy Management
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Carbon Offsets Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('carbon') && "bg-accent text-accent-foreground"
            )}>
              <Leaf className="mr-2 h-4 w-4" />
              Carbon Offsets
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/carbon-offsets', 'carbon-list')}
                    >
                      All Carbon Offsets
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/carbon-offsets/create', 'carbon-create')}
                    >
                      Add New Offset
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* RECs Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('recs') && "bg-accent text-accent-foreground"
            )}>
              <Medal className="mr-2 h-4 w-4" />
              RECs
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/recs', 'recs-list')}
                    >
                      All RECs
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/recs/create', 'recs-create')}
                    >
                      Add New REC
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Tokenization Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('tokenization') && "bg-accent text-accent-foreground"
            )}>
              <Wallet className="mr-2 h-4 w-4" />
              Tokenization
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/pools', 'tokenization-pools')}
                    >
                      Tokenization Pools
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/pools/create', 'tokenization-create')}
                    >
                      Create New Pool
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/investors', 'tokenization-investors')}
                    >
                      Investor Management
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Analysis Section */}
          <NavigationMenuItem className="w-full">
            <NavigationMenuTrigger className={cn(
              "w-full justify-start",
              activeItem.startsWith('analysis') && "bg-accent text-accent-foreground"
            )}>
              <LineChart className="mr-2 h-4 w-4" />
              Analysis
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-1 p-2 w-60">
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/analysis/cash-flow', 'analysis-cash-flow')}
                    >
                      Cash Flow Forecast
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/analysis/risk', 'analysis-risk')}
                    >
                      Risk Assessment
                    </Button>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => handleNavigate('/climate-receivables/analysis/production', 'analysis-production')}
                    >
                      Production Analysis
                    </Button>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Reports Section */}
          <NavigationMenuItem className="w-full">
            <Button 
              variant={activeItem === 'reports' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => handleNavigate('/climate-receivables/reports', 'reports')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </NavigationMenuItem>

          {/* Settings Section */}
          <NavigationMenuItem className="w-full">
            <Button 
              variant={activeItem === 'settings' ? 'default' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => handleNavigate('/climate-receivables/settings', 'settings')}
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
