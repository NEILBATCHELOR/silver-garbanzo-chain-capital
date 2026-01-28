/**
 * Product Category Selector - Step 1 of Universal Product Wizard
 * 
 * Visual selector for 22 structured product categories
 * Grouped by type with descriptions and use cases
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  TrendingUp, 
  Target, 
  Phone, 
  GitBranch, 
  Activity, 
  AlertTriangle, 
  Percent, 
  DollarSign,
  BarChart3,
  Zap,
  Search
} from 'lucide-react';
import { useState } from 'react';
import type { ProductCategory } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

interface ProductCategoryOption {
  category: ProductCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  popularity: 'high' | 'medium' | 'low';
}

interface ProductCategoryGroup {
  title: string;
  description: string;
  categories: ProductCategoryOption[];
}

const PRODUCT_CATEGORIES: ProductCategoryGroup[] = [
  {
    title: 'Capital Protection',
    description: 'Products with principal guarantee or downside protection',
    categories: [
      {
        category: 'capital_guarantee',
        name: 'Capital Guarantee',
        description: '100% principal protected at maturity',
        icon: <Shield className="h-5 w-5" />,
        features: ['Full protection', 'Capped upside', 'Credit risk only'],
        popularity: 'high'
      },
      {
        category: 'partial_protection',
        name: 'Partial Protection',
        description: 'Buffer or barrier-based protection',
        icon: <Shield className="h-5 w-5" />,
        features: ['Buffer zone', 'Conditional protection', 'Enhanced upside'],
        popularity: 'high'
      }
    ]
  },
  {
    title: 'Yield Enhancement',
    description: 'High income products with potential capital risk',
    categories: [
      {
        category: 'yield_enhancement',
        name: 'Yield Enhancement',
        description: 'High coupons with capital at risk',
        icon: <TrendingUp className="h-5 w-5" />,
        features: ['Enhanced yields', 'Downside exposure', 'Reverse convertible'],
        popularity: 'high'
      },
      {
        category: 'income_generation',
        name: 'Income Generation',
        description: 'Regular distributions focus',
        icon: <DollarSign className="h-5 w-5" />,
        features: ['Periodic income', 'Stable returns', 'Lower volatility'],
        popularity: 'medium'
      }
    ]
  },
  {
    title: 'Participation Products',
    description: 'Upside exposure with varying leverage',
    categories: [
      {
        category: 'participation',
        name: 'Participation',
        description: 'Direct upside participation',
        icon: <Target className="h-5 w-5" />,
        features: ['Linear payoff', 'Capped/uncapped', 'Downside options'],
        popularity: 'high'
      },
      {
        category: 'leveraged_participation',
        name: 'Leveraged Participation',
        description: 'Geared exposure to underlying',
        icon: <Zap className="h-5 w-5" />,
        features: ['Amplified gains', 'Leverage risk', 'Outperformance'],
        popularity: 'medium'
      }
    ]
  },
  {
    title: 'Autocallable & Callable',
    description: 'Early redemption features',
    categories: [
      {
        category: 'autocallable',
        name: 'Autocallable',
        description: 'Automatic early redemption',
        icon: <Phone className="h-5 w-5" />,
        features: ['Memory coupons', 'Barrier triggers', 'Popular in Asia'],
        popularity: 'high'
      },
      {
        category: 'callable',
        name: 'Callable',
        description: 'Issuer call rights',
        icon: <Phone className="h-5 w-5" />,
        features: ['Issuer option', 'Call schedule', 'Premium yield'],
        popularity: 'medium'
      }
    ]
  },
  {
    title: 'Path-Dependent',
    description: 'Products where history matters',
    categories: [
      {
        category: 'range_accrual',
        name: 'Range Accrual',
        description: 'Accumulation within range',
        icon: <GitBranch className="h-5 w-5" />,
        features: ['Daily accrual', 'Range barriers', 'Snowball notes'],
        popularity: 'medium'
      },
      {
        category: 'path_dependent',
        name: 'Path Dependent',
        description: 'Lookback, Asian, Cliquet',
        icon: <GitBranch className="h-5 w-5" />,
        features: ['Averaging', 'Reset features', 'Complex payoffs'],
        popularity: 'low'
      }
    ]
  },
  {
    title: 'Volatility Products',
    description: 'Exposure to market volatility',
    categories: [
      {
        category: 'volatility',
        name: 'Volatility',
        description: 'Vol exposure products',
        icon: <Activity className="h-5 w-5" />,
        features: ['Variance swaps', 'Vol index', 'Vega exposure'],
        popularity: 'low'
      },
      {
        category: 'dispersion',
        name: 'Dispersion',
        description: 'Index vs component volatility',
        icon: <Activity className="h-5 w-5" />,
        features: ['Correlation play', 'Advanced strategy', 'Institutional'],
        popularity: 'low'
      }
    ]
  },
  {
    title: 'Credit Products',
    description: 'Credit-linked and derivative structures',
    categories: [
      {
        category: 'credit_linked',
        name: 'Credit Linked',
        description: 'Credit event exposure',
        icon: <AlertTriangle className="h-5 w-5" />,
        features: ['CLN structure', 'Enhanced yield', 'Default risk'],
        popularity: 'medium'
      },
      {
        category: 'credit_derivative',
        name: 'Credit Derivative',
        description: 'CDS and credit swaps',
        icon: <AlertTriangle className="h-5 w-5" />,
        features: ['Pure protection', 'ISDA terms', 'Institutional'],
        popularity: 'low'
      }
    ]
  },
  {
    title: 'Rate-Linked',
    description: 'Interest rate and inflation exposure',
    categories: [
      {
        category: 'rate_linked',
        name: 'Rate Linked',
        description: 'Interest rate exposure',
        icon: <Percent className="h-5 w-5" />,
        features: ['SOFR linked', 'Rate curves', 'Duration risk'],
        popularity: 'medium'
      },
      {
        category: 'inflation_linked',
        name: 'Inflation Linked',
        description: 'CPI and inflation protection',
        icon: <Percent className="h-5 w-5" />,
        features: ['Real returns', 'CPI indexed', 'Long duration'],
        popularity: 'medium'
      }
    ]
  },
  {
    title: 'FX & Commodity',
    description: 'Currency and commodity exposure',
    categories: [
      {
        category: 'fx_linked',
        name: 'FX Linked',
        description: 'Currency exposure',
        icon: <DollarSign className="h-5 w-5" />,
        features: ['FX rates', 'Currency risk', 'Hedging'],
        popularity: 'medium'
      },
      {
        category: 'dual_currency',
        name: 'Dual Currency',
        description: 'Multi-currency products',
        icon: <DollarSign className="h-5 w-5" />,
        features: ['Currency optionality', 'Enhanced yield', 'FX volatility'],
        popularity: 'medium'
      },
      {
        category: 'commodity_linked',
        name: 'Commodity Linked',
        description: 'Commodity exposure',
        icon: <BarChart3 className="h-5 w-5" />,
        features: ['Gold, oil, etc.', 'Physical/cash', 'Contango risk'],
        popularity: 'medium'
      }
    ]
  },
  {
    title: 'Options',
    description: 'Standard and exotic option structures',
    categories: [
      {
        category: 'option',
        name: 'Standard Option',
        description: 'Vanilla calls and puts',
        icon: <Target className="h-5 w-5" />,
        features: ['Call/put', 'American/European', 'Strike levels'],
        popularity: 'high'
      },
      {
        category: 'exotic_option',
        name: 'Exotic Option',
        description: 'Path-dependent options',
        icon: <Target className="h-5 w-5" />,
        features: ['Barriers', 'Asian', 'Complex payoffs'],
        popularity: 'low'
      }
    ]
  }
];

interface ProductCategorySelectorProps {
  value?: ProductCategory;
  onChange: (category: ProductCategory, subtype: string) => void;
}

export function ProductCategorySelector({ value, onChange }: ProductCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Filter categories based on search
  const filteredGroups = PRODUCT_CATEGORIES.map(group => ({
    ...group,
    categories: group.categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(group => group.categories.length > 0);

  const handleSelect = (category: ProductCategory, name: string) => {
    // Generate default subtype from category name
    const subtype = name.toLowerCase().replace(/\s+/g, '_');
    onChange(category, subtype);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search product categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">22</div>
            <p className="text-xs text-muted-foreground mt-1">Product types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Popular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">Most used</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-muted-foreground mt-1">Category groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Groups */}
      {filteredGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{group.title}</h3>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.categories.map((category) => (
              <Card
                key={category.category}
                className={`cursor-pointer transition-all hover:border-primary ${
                  value === category.category ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleSelect(category.category, category.name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {category.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        category.popularity === 'high'
                          ? 'default'
                          : category.popularity === 'medium'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {category.popularity === 'high' ? 'Popular' : category.popularity === 'medium' ? 'Common' : 'Advanced'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* No Results */}
      {filteredGroups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No categories match your search</p>
            <Button
              variant="link"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
