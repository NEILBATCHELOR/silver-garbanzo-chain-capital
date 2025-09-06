import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle, 
  DollarSign, 
  Activity,
  Shield,
  BarChart3,
  Bell,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useClimateReceivablesServices } from "./hooks";
import { RiskLevel } from "./services/business-logic/enhanced-types";
import type { Alert as AlertType } from "./services/business-logic/enhanced-types";

interface EnhancedClimateReceivablesDashboardProps {
  projectId: string;
}

/**
 * Enhanced Dashboard for Climate Receivables with Real-time Services Integration
 */
const EnhancedClimateReceivablesDashboard: React.FC<EnhancedClimateReceivablesDashboardProps> = ({ 
  projectId 
}) => {
  console.log("%c ENHANCED CLIMATE RECEIVABLES DASHBOARD MOUNTED ", "background: #10b981; color: white; font-size: 20px");
  console.log("ProjectID:", projectId);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize enhanced services
  const {
    riskCalculation,
    cashFlowForecasting,
    alertSystem,
    metrics,
    isLoading,
    isProcessing,
    hasErrors,
    errors,
    initializeAllServices,
    refreshAllData,
    clearAllErrors,
    getDashboardData,
    systemHealth
  } = useClimateReceivablesServices({
    projectId,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableRiskCalculation: true,
    enableCashFlowForecasting: true,
    enableAlerts: true
  });

  const dashboardData = getDashboardData();

  // Navigation helpers for project-aware URLs
  const getProjectUrl = (path: string) => {
    return projectId ? `/projects/${projectId}/climate-receivables${path}` : `/climate-receivables${path}`;
  };

  // Get system health color
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get health icon
  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Show loading skeleton during initial load
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Climate Receivables Dashboard</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={systemHealth.overall === 'healthy' ? 'default' : 'destructive'}>
              {getHealthIcon(systemHealth.overall)}
              <span className="ml-1">System {systemHealth.overall}</span>
            </Badge>
            {isProcessing && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Processing
              </Badge>
            )}
          </div>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={isLoading || isProcessing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isProcessing ? "animate-spin" : ""}`} />
            {isLoading || isProcessing ? "Refreshing..." : "Refresh All"}
          </Button>
          <Button
            variant="outline"
            onClick={() => riskCalculation.calculateBatchRisk()}
            disabled={riskCalculation.calculating}
          >
            {riskCalculation.calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Recalculate Risks
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(getProjectUrl("/assets/new"))}
          >
            New Asset
          </Button>
          <Button 
            onClick={() => navigate(getProjectUrl("/receivables/new"))}
          >
            New Receivable
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {hasErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-start">
              <div>
                <strong>Service Errors Detected:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
              <Button variant="outline" size="sm" onClick={clearAllErrors}>
                Clear Errors
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Overview
            </CardTitle>
            <CardDescription>Total receivables and value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalReceivables}</div>
            <div className="text-sm text-muted-foreground">Active receivables</div>
            <div className="text-lg font-semibold text-green-600 mt-1">
              ${metrics.totalProjectedCashFlow.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Projected value</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Analysis
            </CardTitle>
            <CardDescription>Portfolio risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageRiskScore.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Average risk score</div>
            <Progress 
              value={metrics.averageRiskScore} 
              className="mt-2"
              style={{
                backgroundColor: metrics.averageRiskScore > 70 ? '#fee2e2' : 
                                 metrics.averageRiskScore > 40 ? '#fef3c7' : '#dcfce7'
              }}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {riskCalculation.highRiskCount} high-risk items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Status
            </CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold">{metrics.unacknowledgedAlerts}</div>
              <Badge variant={metrics.criticalAlerts > 0 ? "destructive" : "secondary"} className="text-xs">
                {metrics.criticalAlerts} critical
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">Unacknowledged alerts</div>
            {metrics.criticalAlerts > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setActiveTab("alerts")}
              >
                View Critical Alerts
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Service status monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Calculation</span>
                <span className={`text-sm ${getHealthColor(systemHealth.riskCalculation)}`}>
                  {getHealthIcon(systemHealth.riskCalculation)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cash Flow</span>
                <span className={`text-sm ${getHealthColor(systemHealth.cashFlowForecasting)}`}>
                  {getHealthIcon(systemHealth.cashFlowForecasting)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alerts</span>
                <span className={`text-sm ${getHealthColor(systemHealth.alertSystem)}`}>
                  {getHealthIcon(systemHealth.alertSystem)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground mb-4">
          <TabsTrigger value="overview" className="px-3 py-1.5">Enhanced Overview</TabsTrigger>
          <TabsTrigger value="risk-analysis" className="px-3 py-1.5">Risk Analysis</TabsTrigger>
          <TabsTrigger value="cash-flow" className="px-3 py-1.5">Cash Flow</TabsTrigger>
          <TabsTrigger value="alerts" className="px-3 py-1.5">
            Alerts
            {metrics.unacknowledgedAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 text-xs">
                {metrics.unacknowledgedAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="receivables" className="px-3 py-1.5">Receivables</TabsTrigger>
          <TabsTrigger value="assets" className="px-3 py-1.5">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Portfolio risk level breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.riskAnalysis.distribution).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={level === 'CRITICAL' || level === 'HIGH' ? 'destructive' : 
                                   level === 'MEDIUM' ? 'default' : 'secondary'}
                        >
                          {level}
                        </Badge>
                        <span className="text-sm">{count} receivables</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metrics.totalReceivables > 0 
                          ? ((count / metrics.totalReceivables) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Forecast</CardTitle>
                <CardDescription>12-month projection scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.cashFlowAnalysis.portfolioForecast ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Base Scenario</span>
                      <span className="font-semibold">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.scenarios.base.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm">Optimistic</span>
                      <span className="font-semibold">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.scenarios.optimistic.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-sm">Pessimistic</span>
                      <span className="font-semibold">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.scenarios.pessimistic.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        Avg. Confidence: {(dashboardData.cashFlowAnalysis.averageConfidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">No forecast data available</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cashFlowForecasting.generateForecast()}
                      disabled={cashFlowForecasting.calculating}
                    >
                      {cashFlowForecasting.calculating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Forecast"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk-analysis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Risk Analysis Center</CardTitle>
                <CardDescription>Comprehensive risk assessment and monitoring</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => riskCalculation.fetchStatistics()}
                  disabled={riskCalculation.loading}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Update Statistics
                </Button>
                <Button
                  onClick={() => riskCalculation.calculateBatchRisk()}
                  disabled={riskCalculation.calculating}
                >
                  {riskCalculation.calculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Recalculate All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Average Risk Score</div>
                  <div className="text-2xl font-bold">{dashboardData.riskAnalysis.averageScore.toFixed(1)}</div>
                  <Progress value={dashboardData.riskAnalysis.averageScore} className="mt-2" />
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">High Risk Items</div>
                  <div className="text-2xl font-bold text-red-600">{dashboardData.riskAnalysis.highRiskCount}</div>
                  <div className="text-sm text-muted-foreground">
                    {metrics.totalReceivables > 0 
                      ? ((dashboardData.riskAnalysis.highRiskCount / metrics.totalReceivables) * 100).toFixed(1)
                      : 0}% of portfolio
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Recent Changes</div>
                  <div className="text-2xl font-bold">{dashboardData.riskAnalysis.recentChanges.length}</div>
                  <div className="text-sm text-muted-foreground">Risk score updates</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Recent Risk Changes</h4>
                {dashboardData.riskAnalysis.recentChanges.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.riskAnalysis.recentChanges.slice(0, 5).map((change) => (
                      <div key={change.receivableId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{change.receivableId}</div>
                          <div className="text-sm text-muted-foreground">
                            Risk: {change.compositeRisk.score} ({change.compositeRisk.level})
                          </div>
                        </div>
                        <Badge variant={change.compositeRisk.level === RiskLevel.HIGH || change.compositeRisk.level === RiskLevel.CRITICAL ? 'destructive' : 'default'}>
                          {change.compositeRisk.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No recent risk changes detected.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cash Flow Forecasting</CardTitle>
                <CardDescription>Financial projections and scenario analysis</CardDescription>
              </div>
              <Button
                onClick={() => cashFlowForecasting.generateForecast()}
                disabled={cashFlowForecasting.calculating}
              >
                {cashFlowForecasting.calculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {dashboardData.cashFlowAnalysis.portfolioForecast ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Total Projected</div>
                      <div className="text-xl font-bold">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.totalProjected.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Optimistic</div>
                      <div className="text-xl font-bold text-green-600">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.scenarios.optimistic.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-600">Pessimistic</div>
                      <div className="text-xl font-bold text-red-600">
                        ${dashboardData.cashFlowAnalysis.portfolioForecast.scenarios.pessimistic.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Avg. Confidence</div>
                      <div className="text-xl font-bold text-blue-600">
                        {(dashboardData.cashFlowAnalysis.averageConfidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Risk Factors</h4>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.cashFlowAnalysis.portfolioForecast.riskFactors.map((factor, index) => (
                        <Badge key={index} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No cash flow forecast available</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a comprehensive cash flow forecast to analyze projected returns and risk scenarios.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alert Management</CardTitle>
                <CardDescription>Real-time system alerts and notifications</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={alertSystem.clearAlerts}
                  disabled={alertSystem.alerts.length === 0}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  onClick={alertSystem.acknowledgeAllAlerts}
                  disabled={alertSystem.unacknowledgedCount === 0}
                >
                  Acknowledge All ({alertSystem.unacknowledgedCount})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Total Alerts</div>
                  <div className="text-2xl font-bold">{alertSystem.statistics.total}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-600">Critical</div>
                  <div className="text-2xl font-bold text-red-600">{alertSystem.statistics.critical}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-600">Warning</div>
                  <div className="text-2xl font-bold text-yellow-600">{alertSystem.statistics.warning}</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Unacknowledged</div>
                  <div className="text-2xl font-bold text-blue-600">{alertSystem.statistics.unacknowledged}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {alertSystem.alerts.length > 0 ? (
                  alertSystem.alerts.slice(0, 10).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 border rounded-lg ${
                        alert.acknowledged ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={alert.level === 'critical' ? 'destructive' : 
                                       alert.level === 'warning' ? 'default' : 'secondary'}
                            >
                              {alert.level.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{alert.action}</span>
                          </div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Alert ID: {alert.id}
                          </div>
                          {alert.action && (
                            <div className="mt-2">
                              <div className="text-sm font-medium">Action:</div>
                              <div className="text-sm text-muted-foreground ml-4">
                                {alert.action}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => alertSystem.acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alert.acknowledged && (
                            <Badge variant="outline" className="text-xs">
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No alerts at this time</p>
                    <p className="text-sm text-muted-foreground">System monitoring is active</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Climate Receivables</CardTitle>
                <CardDescription>Manage renewable energy receivables</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/receivables"))}
                variant="outline"
              >
                View All Receivables
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enhanced receivables management with real-time risk scoring and cash flow projections coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Energy Assets</CardTitle>
                <CardDescription>Manage renewable energy assets</CardDescription>
              </div>
              <Button 
                onClick={() => navigate(getProjectUrl("/assets"))}
                variant="outline"
              >
                View All Assets
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enhanced asset management with production analytics and performance monitoring coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedClimateReceivablesDashboard;
