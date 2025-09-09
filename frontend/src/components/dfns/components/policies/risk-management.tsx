import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Lock,
  Unlock,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCcw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsPolicy, 
  DfnsPolicyApproval,
  DfnsPolicySummary,
  DfnsApprovalSummary,
  DfnsActivityKind 
} from "../../../../types/dfns";

/**
 * Risk Management Component
 * 
 * Provides comprehensive policy analytics and risk management features:
 * - Policy effectiveness metrics
 * - Risk assessment and trends  
 * - Compliance monitoring
 * - Activity pattern analysis
 */
export function RiskManagement() {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<DfnsPolicy[]>([]);
  const [approvals, setApprovals] = useState<DfnsPolicyApproval[]>([]);
  const [policySummaries, setPolicySummaries] = useState<DfnsPolicySummary[]>([]);
  const [approvalSummaries, setApprovalSummaries] = useState<DfnsApprovalSummary[]>([]);
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  // Initialize DFNS service
  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service. Please check your configuration.');
      }
    };

    initializeDfns();
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);
        
        const policyService = dfnsService.getPolicyService();
        
        // Fetch all relevant data
        const [allPolicies, allApprovals, summaries, approvalSummaries] = await Promise.all([
          policyService.getAllPolicies(),
          policyService.listApprovals().then(response => response.items),
          policyService.getPoliciesSummary(),
          policyService.getApprovalsSummary()
        ]);

        setPolicies(allPolicies);
        setApprovals(allApprovals);
        setPolicySummaries(summaries);
        setApprovalSummaries(approvalSummaries);
      } catch (error) {
        console.error('Failed to fetch risk management data:', error);
        setError(`Failed to load risk data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dfnsService]);

  // Calculate risk metrics
  const calculateRiskMetrics = () => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.status === 'Active').length;
    const totalTriggered = policySummaries.reduce((sum, s) => sum + s.triggeredCount, 0);
    const totalApproved = policySummaries.reduce((sum, s) => sum + s.approvedCount, 0);
    const totalDenied = policySummaries.reduce((sum, s) => sum + s.deniedCount, 0);
    const pendingApprovals = approvals.filter(a => a.status === 'Pending').length;
    
    const approvalRate = totalTriggered > 0 ? (totalApproved / totalTriggered * 100) : 0;
    const denialRate = totalTriggered > 0 ? (totalDenied / totalTriggered * 100) : 0;
    const coverageRate = totalPolicies > 0 ? (activePolicies / totalPolicies * 100) : 0;
    
    return {
      totalPolicies,
      activePolicies,
      totalTriggered,
      totalApproved,
      totalDenied,
      pendingApprovals,
      approvalRate,
      denialRate,
      coverageRate
    };
  };

  const metrics = calculateRiskMetrics();

  // Get activity distribution
  const getActivityDistribution = () => {
    const distribution: Record<string, number> = {};
    
    policies.forEach(policy => {
      distribution[policy.activityKind] = (distribution[policy.activityKind] || 0) + 1;
    });

    return Object.entries(distribution).map(([activity, count]) => ({
      activity,
      count,
      percentage: (count / policies.length * 100).toFixed(1)
    }));
  };

  // Get risk levels by activity
  const getRiskLevels = () => {
    const riskLevels: Record<string, 'Low' | 'Medium' | 'High'> = {
      'WalletsSign': 'High',
      'WalletsTransfer': 'High',
      'WalletsCreate': 'Medium',
      'WalletsDelegate': 'Medium',
      'KeysSign': 'High',
      'KeysCreate': 'Medium'
    };

    return getActivityDistribution().map(item => ({
      ...item,
      riskLevel: riskLevels[item.activity as keyof typeof riskLevels] || 'Low'
    }));
  };

  // Get most triggered policies
  const getMostTriggeredPolicies = () => {
    return policySummaries
      .filter(summary => summary.triggeredCount > 0)
      .sort((a, b) => b.triggeredCount - a.triggeredCount)
      .slice(0, 10);
  };

  // Calculate compliance score
  const getComplianceScore = () => {
    if (metrics.totalTriggered === 0) return 100;
    
    const handledRequests = metrics.totalApproved + metrics.totalDenied;
    const complianceRate = (handledRequests / metrics.totalTriggered) * 100;
    
    return Math.round(complianceRate);
  };

  // Refresh data
  const refreshData = async () => {
    if (!dfnsService) return;
    
    try {
      setLoading(true);
      const policyService = dfnsService.getPolicyService();
      
      const [allPolicies, allApprovals, summaries, approvalSummaries] = await Promise.all([
        policyService.getAllPolicies(),
        policyService.listApprovals().then(response => response.items),
        policyService.getPoliciesSummary(),
        policyService.getApprovalsSummary()
      ]);

      setPolicies(allPolicies);
      setApprovals(allApprovals);
      setPolicySummaries(summaries);
      setApprovalSummaries(approvalSummaries);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dfnsService) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing DFNS Risk Management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activityDistribution = getActivityDistribution();
  const riskLevels = getRiskLevels();
  const mostTriggered = getMostTriggeredPolicies();
  const complianceScore = getComplianceScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Risk Management</h2>
          <p className="text-muted-foreground">
            Monitor policy effectiveness and compliance
          </p>
        </div>
        <Button 
          onClick={refreshData}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policy Coverage</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.coverageRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.activePolicies} of {metrics.totalPolicies} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${complianceScore >= 90 ? 'text-green-600' : complianceScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {complianceScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Response rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.approvalRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalApproved} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.pendingApprovals}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending reviews
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Risk Overview</TabsTrigger>
          <TabsTrigger value="policies">Policy Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>
                  Breakdown of policies by activity type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {activityDistribution.map((item) => (
                      <div key={item.activity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span className="font-medium">{item.activity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{item.count} policies</span>
                          <span className="text-sm text-muted-foreground">({item.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No activity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>
                  Risk levels by activity type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {riskLevels.length > 0 ? (
                  <div className="space-y-3">
                    {riskLevels.map((item) => (
                      <div key={item.activity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium">{item.activity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              item.riskLevel === 'High' ? 'destructive' :
                              item.riskLevel === 'Medium' ? 'default' : 'secondary'
                            }
                          >
                            {item.riskLevel} Risk
                          </Badge>
                          <span className="text-sm text-muted-foreground">{item.count} policies</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No risk data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Triggered Policies</CardTitle>
              <CardDescription>
                Policies with the highest activation rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : mostTriggered.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Policy</th>
                        <th className="text-left py-2">Activity</th>
                        <th className="text-left py-2">Rule</th>
                        <th className="text-right py-2">Triggered</th>
                        <th className="text-right py-2">Approved</th>
                        <th className="text-right py-2">Denied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostTriggered.map((summary) => (
                        <tr key={summary.policyId} className="border-b">
                          <td className="py-2 font-medium">{summary.name}</td>
                          <td className="py-2">
                            <Badge variant="outline">{summary.activityKind}</Badge>
                          </td>
                          <td className="py-2">{summary.ruleKind}</td>
                          <td className="py-2 text-right font-semibold">{summary.triggeredCount}</td>
                          <td className="py-2 text-right text-green-600">{summary.approvedCount}</td>
                          <td className="py-2 text-right text-red-600">{summary.deniedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No policy trigger data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trends & Patterns</CardTitle>
              <CardDescription>
                Historical trends and pattern analysis (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Historical trend analysis and pattern detection features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Overall compliance and governance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.totalTriggered}</div>
                    <div className="text-sm text-muted-foreground">Total Triggers</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.totalApproved}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics.totalDenied}</div>
                    <div className="text-sm text-muted-foreground">Denied</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{metrics.pendingApprovals}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Recommendations</CardTitle>
                <CardDescription>
                  Suggested improvements for better risk management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.coverageRate < 100 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Consider creating additional policies to improve coverage. Current coverage: {metrics.coverageRate.toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {metrics.pendingApprovals > 0 && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        {metrics.pendingApprovals} approval requests are pending review. Consider reviewing them to maintain compliance.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {complianceScore < 90 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        Compliance score is below optimal level ({complianceScore}%). Review approval workflows and response times.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {complianceScore >= 90 && metrics.pendingApprovals === 0 && metrics.coverageRate === 100 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Excellent! Your policy framework is operating at optimal compliance levels.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
