/**
 * Trade Finance Administration Page
 * 
 * Comprehensive admin dashboard for managing trade finance protocol:
 * - Contract Deployments (UUPS proxies, implementations, versions)
 * - Deployment Parameters (initialization params for ALL 27 contracts)
 * - Risk Parameters
 * - Asset Listings
 * - Emergency Controls
 */

import { useState } from 'react';
import { ContractDeployments } from '@/components/trade-finance/admin';
import { RiskParameterControl, AssetListing, EmergencyControls } from '@/components/trade-finance/admin';
import { TradeFinanceBreadcrumb, TradeFinanceStats } from '@/components/trade-finance/shared';
import { useTradeFinance } from '@/providers/trade-finance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Database, 
  Settings, 
  AlertTriangle, 
  FileText,
  ExternalLink,
  Download
} from 'lucide-react';

export function TradeFinanceAdminPage() {
  const [activeTab, setActiveTab] = useState('deployments');
  const { projectId } = useTradeFinance();

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb Navigation */}
      <TradeFinanceBreadcrumb />
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade Finance Administration</h1>
          <p className="text-muted-foreground mt-1">
            Manage protocol contracts, configurations, and emergency controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Hoodi Testnet</Badge>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://docs.chain-capital.io/trade-finance/admin"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentation
            </a>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <TradeFinanceStats />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="deployments">
            <Database className="w-4 h-4 mr-2" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="parameters">
            <Settings className="w-4 h-4 mr-2" />
            Parameters
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Shield className="w-4 h-4 mr-2" />
            Risk Controls
          </TabsTrigger>
          <TabsTrigger value="assets">
            <FileText className="w-4 h-4 mr-2" />
            Asset Listing
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergency
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Contract Deployments */}
        <TabsContent value="deployments" className="space-y-6">
          <ContractDeployments />
          
          <Card>
            <CardHeader>
              <CardTitle>Deployment Resources</CardTitle>
              <CardDescription>
                Documentation and tools for managing contract deployments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start" asChild>
                  <a href="#" onClick={() => downloadDeploymentGuide()}>
                    <Download className="w-4 h-4 mr-2" />
                    Deployment Guide (PDF)
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href="#" onClick={() => downloadParameterReference()}>
                    <Download className="w-4 h-4 mr-2" />
                    Parameter Reference (PDF)
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a
                    href="https://explorer.hoodi.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Block Explorer
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a
                    href="https://github.com/chain-capital/foundry-contracts"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contract Repository
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Deployment Parameters */}
        <TabsContent value="parameters" className="space-y-6">
          <DeploymentParametersReference />
        </TabsContent>

        {/* Tab 3: Risk Controls */}
        <TabsContent value="risk" className="space-y-6">
          <RiskParameterControl projectId={projectId} />
        </TabsContent>

        {/* Tab 4: Asset Listing */}
        <TabsContent value="assets" className="space-y-6">
          <AssetListing projectId={projectId} />
        </TabsContent>

        {/* Tab 5: Emergency Controls */}
        <TabsContent value="emergency" className="space-y-6">
          <EmergencyControls projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Deployment Parameters Reference Component
 * Displays ALL 27 contract initialization parameters
 */
function DeploymentParametersReference() {
  const parameterGroups = [
    {
      phase: 'Infrastructure',
      contracts: [
        {
          name: 'TradeFinanceRegistry',
          pattern: 'UUPS',
          params: [
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        }
      ]
    },
    {
      phase: 'Phase 1: Governance',
      contracts: [
        {
          name: 'PoolAddressesProvider',
          pattern: 'UUPS',
          params: [
            { name: 'marketId', type: 'string', source: 'MARKET_ID env var' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'ACLManager',
          pattern: 'UUPS',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'PoolConfigurator',
          pattern: 'UUPS',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        }
      ]
    },
    {
      phase: 'Phase 2: Core Protocol',
      contracts: [
        {
          name: 'CommodityLendingPool',
          pattern: 'UUPS',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'CommodityOracle',
          pattern: 'UUPS',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'FuturesCurveOracle',
          pattern: 'UUPS',
          params: [
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'PriceOracleSentinel',
          pattern: 'UUPS',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'CommodityInterestRateStrategyV2',
          pattern: 'Direct',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'optimalUsageRatio', type: 'uint256', source: '8000 (80%)' },
            { name: 'baseVariableBorrowRate', type: 'uint256', source: '200 (2%)' },
            { name: 'variableRateSlope1', type: 'uint256', source: '400 (4%)' },
            { name: 'variableRateSlope2', type: 'uint256', source: '7500 (75%)' }
          ]
        },
        {
          name: 'CommodityInterestRateStrategyV3',
          pattern: 'Direct',
          params: [
            { name: 'provider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'optimalUsageRatio', type: 'uint256', source: '9000 (90%)' },
            { name: 'baseVariableBorrowRate', type: 'uint256', source: '100 (1%)' },
            { name: 'variableRateSlope1', type: 'uint256', source: '300 (3%)' },
            { name: 'variableRateSlope2', type: 'uint256', source: '10000 (100%)' }
          ]
        },
        {
          name: 'CommodityOracleConfigurator',
          pattern: 'Direct',
          params: [
            { name: 'oracle', type: 'address', source: 'CommodityOracle proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' }
          ]
        }
      ]
    },
    {
      phase: 'Phase 3: Risk & Security',
      contracts: [
        {
          name: 'HaircutEngine',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'CircuitBreakers',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'EmergencyModule',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'DutchAuctionLiquidator',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'priceOracle', type: 'address', source: 'CommodityOracle proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'GracefulLiquidation',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'FlashLiquidation',
          pattern: 'UUPS',
          params: [
            { name: 'addressesProvider', type: 'address', source: 'PoolAddressesProvider proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'DEXLiquidationAdapter',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'LiquidationDataProvider',
          pattern: 'UUPS',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' },
            { name: 'priceOracle', type: 'address', source: 'CommodityOracle proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        }
      ]
    },
    {
      phase: 'Phase 4: Rewards & Treasury',
      contracts: [
        {
          name: 'EmissionManager',
          pattern: 'UUPS',
          params: [
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'RewardsController',
          pattern: 'UUPS',
          params: [
            { name: 'emissionManager', type: 'address', source: 'EmissionManager proxy (circular)' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'RewardsDistributor',
          pattern: 'UUPS',
          params: [
            { name: 'rewardsController', type: 'address', source: 'RewardsController proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'Collector',
          pattern: 'UUPS',
          params: [
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'ProtocolReserve',
          pattern: 'UUPS',
          params: [
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' },
            { name: 'owner', type: 'address', source: 'SUPER_ADMIN_ADDRESS' }
          ]
        },
        {
          name: 'RevenueSplitter',
          pattern: 'Direct',
          params: [
            { name: 'collector', type: 'address', source: 'Collector proxy' },
            { name: 'reserve', type: 'address', source: 'ProtocolReserve proxy' },
            { name: 'aclManager', type: 'address', source: 'ACLManager proxy' }
          ]
        }
      ]
    },
    {
      phase: 'Token Templates',
      contracts: [
        {
          name: 'CommodityReceiptToken',
          pattern: 'Direct',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' }
          ]
        },
        {
          name: 'CommodityDebtToken',
          pattern: 'Direct',
          params: [
            { name: 'pool', type: 'address', source: 'CommodityLendingPool proxy' }
          ]
        }
      ]
    }
  ];

  // Calculate totals
  const totalContracts = parameterGroups.reduce((sum, group) => sum + group.contracts.length, 0);
  const upgradeableCount = parameterGroups.reduce(
    (sum, group) => sum + group.contracts.filter(c => c.pattern === 'UUPS').length,
    0
  );
  const directCount = totalContracts - upgradeableCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deployment Parameters Reference</CardTitle>
          <CardDescription>
            Complete list of initialization parameters for all {totalContracts} trade finance contracts
            ({upgradeableCount} UUPS upgradeable, {directCount} direct deployment)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            These parameters are required when deploying contracts. All addresses must be from
            prior deployment phases. See{' '}
            <code className="bg-muted px-1 rounded">CONTRACT_DEPLOYMENT_PARAMETERS.md</code> for
            complete details.
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalContracts}</div>
              <div className="text-xs text-muted-foreground">Total Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{upgradeableCount}</div>
              <div className="text-xs text-muted-foreground">UUPS Upgradeable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{directCount}</div>
              <div className="text-xs text-muted-foreground">Direct Deploy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">5</div>
              <div className="text-xs text-muted-foreground">Deployment Phases</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {parameterGroups.map((group, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="text-lg">{group.phase}</CardTitle>
            <CardDescription>
              {group.contracts.length} contract{group.contracts.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.contracts.map((contract, cidx) => (
              <div key={cidx} className="border-l-2 border-primary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{contract.name}</h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      contract.pattern === 'UUPS' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-amber-500 text-amber-600'
                    }`}
                  >
                    {contract.pattern}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({contract.params.length} param{contract.params.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="space-y-1">
                  {contract.params.map((param, pidx) => (
                    <div
                      key={pidx}
                      className="flex items-start gap-3 text-sm font-mono"
                    >
                      <span className="text-blue-600 dark:text-blue-400 min-w-[140px]">
                        {param.name}
                      </span>
                      <span className="text-muted-foreground min-w-[80px]">
                        {param.type}
                      </span>
                      <span className="text-muted-foreground flex-1">{param.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Helper functions
 */
function downloadDeploymentGuide() {
  // Implementation: Download deployment guide PDF
  console.log('Download deployment guide');
}

function downloadParameterReference() {
  // Implementation: Download parameter reference PDF
  console.log('Download parameter reference');
}

export default TradeFinanceAdminPage;
