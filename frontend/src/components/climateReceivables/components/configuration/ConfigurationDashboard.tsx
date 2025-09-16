import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  Sliders,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RiskParametersManager,
  CreditRatingMatrixManager, 
  MarketDataConfigManager,
  CashFlowForecastingManager
} from './index';

type ConfigurationSection = 
  | 'overview' 
  | 'risk-parameters' 
  | 'credit-rating-matrix'
  | 'market-data-config'
  | 'forecasting-parameters';

interface ConfigurationDashboardProps {
  projectId?: string;
}

export const ConfigurationDashboard: React.FC<ConfigurationDashboardProps> = ({
  projectId
}) => {
  const [activeSection, setActiveSection] = useState<ConfigurationSection>('overview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleConfigurationChange = () => {
    // Called when any configuration component makes changes
    // This could trigger a refresh of dependent components
    console.log('Configuration updated - refreshing dependent systems...');
  };

  const configurationSections = [
    {
      id: 'risk-parameters' as ConfigurationSection,
      title: 'Risk Parameters',
      description: 'Configure risk calculation weights, thresholds, and discount rate parameters',
      icon: Sliders,
      priority: 'High',
      status: 'Ready',
      component: RiskParametersManager
    },
    {
      id: 'credit-rating-matrix' as ConfigurationSection, 
      title: 'Credit Rating Matrix',
      description: 'Manage credit ratings with default rates, spreads, and risk classifications',
      icon: CreditCard,
      priority: 'High',
      status: 'Ready',
      component: CreditRatingMatrixManager
    },
    {
      id: 'market-data-config' as ConfigurationSection,
      title: 'Market Data Configuration',
      description: 'Configure baseline market parameters, cache settings, and data quality thresholds',
      icon: TrendingUp,
      priority: 'Medium',
      status: 'Ready',
      component: MarketDataConfigManager
    },
    {
      id: 'forecasting-parameters' as ConfigurationSection,
      title: 'Cash Flow Forecasting',
      description: 'Configure seasonal factors, growth rates, and forecasting model weights',
      icon: BarChart3,
      priority: 'Medium', 
      status: 'Ready',
      component: CashFlowForecastingManager
    }
  ];

  if (activeSection === 'overview') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Climate Receivables Configuration</h1>
            <p className="text-muted-foreground">
              Manage all risk calculation, credit rating, market data, and forecasting parameters
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configuration changes will affect all new risk calculations and forecasts. 
            Existing calculations are not automatically recalculated.
          </AlertDescription>
        </Alert>

        {/* Configuration Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configurationSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Card 
                key={section.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveSection(section.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={section.priority === 'High' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {section.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {section.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {section.description}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Configure {section.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* System Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">4</div>
                <p className="text-sm text-muted-foreground">Configuration Modules</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Ready</div>
                <p className="text-sm text-muted-foreground">System Status</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <p className="text-sm text-muted-foreground">Pending Changes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('risk-parameters')}
              >
                <Sliders className="h-4 w-4 mr-2" />
                Configure Risk Parameters
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('credit-rating-matrix')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Credit Ratings
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('market-data-config')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Market Data Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection('forecasting-parameters')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Forecasting Parameters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render specific configuration component
  const activeConfig = configurationSections.find(section => section.id === activeSection);
  
  if (!activeConfig) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Configuration section not found</p>
        <Button onClick={() => setActiveSection('overview')} className="mt-4">
          Return to Overview
        </Button>
      </div>
    );
  }

  const ConfigComponent = activeConfig.component;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setActiveSection('overview')}
        >
          ← Back to Overview
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{activeConfig.title}</h1>
          <p className="text-muted-foreground">{activeConfig.description}</p>
        </div>
      </div>

      {/* Configuration Component */}
      <ConfigComponent onConfigurationChange={handleConfigurationChange} />
    </div>
  );
};