import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  Cell
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  FileText,
  ExternalLink,
  Clock
} from "lucide-react";
import { PolicyRiskTrackingService } from "../../services/api/policy-risk-tracking-service";
import { POLICY_COLORS, CHART_STYLES, withOpacity } from "../../constants/chart-colors";

interface PolicyTimelineProps {
  projectId?: string;
}

interface PolicyTimelineEvent {
  id: string;
  date: string;
  title: string;
  summary: string;
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  policyType: 'regulation' | 'tax_credit' | 'renewable_standard' | 'carbon_pricing' | 'trade_policy' | 'other';
  source: 'federal_register' | 'congress_gov' | 'regulatory_news' | 'industry_alert';
  affectedSectors: string[];
  regions: string[];
  url?: string;
  effectiveDate?: string;
  expirationDate?: string;
  estimatedImpact?: number;
  status: 'proposed' | 'enacted' | 'effective' | 'expired' | 'withdrawn';
}

interface PolicyImpactData {
  date: string;
  cumulative_impact: number;
  policy_count: number;
  regulatory_risk_index: number;
  renewable_incentive_index: number;
}

interface PolicyAlert {
  alertId: string;
  policyId: string;
  alertType: 'new_policy' | 'policy_change' | 'expiration_warning' | 'compliance_deadline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  deadline?: string;
  resolved: boolean;
}

/**
 * Policy Impact Timeline Component
 * 
 * Provides comprehensive visualization of regulatory changes affecting renewable energy:
 * - Visual timeline of policy events from Federal Register and Congress.gov APIs
 * - Impact assessment for each policy change with risk scoring
 * - Renewable energy policy tracking with incentive analysis  
 * - Integration with regulatory news feeds for real-time updates
 * 
 * Integrates with PolicyRiskTrackingService for zero-cost policy monitoring
 */
export function PolicyTimeline({ projectId }: PolicyTimelineProps) {
  const [policyEvents, setPolicyEvents] = useState<PolicyTimelineEvent[]>([]);
  const [impactHistory, setImpactHistory] = useState<PolicyImpactData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<PolicyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '6m' | '1y' | '2y'>('6m');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedImpactLevel, setSelectedImpactLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Available sectors for filtering
  const availableSectors = [
    'all',
    'renewable_energy',
    'solar',
    'wind',
    'energy_storage',
    'electric_vehicles',
    'carbon_markets',
    'tax_incentives',
    'grid_modernization'
  ];

  // Load policy data on component mount and when filters change
  useEffect(() => {
    loadPolicyData();
  }, [selectedTimeRange, selectedSector, selectedImpactLevel]);

  /**
   * Load policy timeline data and impact analysis
   */
  const loadPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get policy events based on filters
      const events = await PolicyRiskTrackingService.getPolicyTimeline({
        timeRange: selectedTimeRange,
        sector: selectedSector === 'all' ? undefined : selectedSector,
        impactLevel: selectedImpactLevel === 'all' ? undefined : selectedImpactLevel as any,
        searchTerm: searchTerm || undefined
      });

      setPolicyEvents(events);

      // Get cumulative policy impact data
      const impactData = await PolicyRiskTrackingService.getPolicyImpactHistory(selectedTimeRange);
      setImpactHistory(impactData);

      // Get active policy alerts
      const alerts = await PolicyRiskTrackingService.getActivePolicyAlerts();
      setActiveAlerts(alerts);

    } catch (err) {
      console.error('Error loading policy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh policy data
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPolicyData();
    setRefreshing(false);
  };

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Debounce search - reload after 500ms delay
    const timeoutId = setTimeout(() => {
      loadPolicyData();
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  /**
   * Get color for impact level
   */
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c'; // orange-600
      case 'medium': return '#d97706'; // amber-600
      case 'low': return '#65a30d'; // lime-600
      default: return '#6b7280'; // gray-500
    }
  };

  /**
   * Get badge variant for policy status
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enacted': return { variant: 'default' as const, color: 'bg-green-100 text-green-800' };
      case 'effective': return { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' };
      case 'proposed': return { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      case 'expired': return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
      case 'withdrawn': return { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      default: return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
    }
  };

  /**
   * Format policy event for timeline display
   */
  const formatTimelineEvent = (event: PolicyTimelineEvent, index: number) => {
    const statusBadge = getStatusBadge(event.status);
    
    return (
      <div key={event.id} className="relative flex gap-4 pb-6">
        {/* Timeline connector */}
        {index < policyEvents.length - 1 && (
          <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
        )}
        
        {/* Timeline dot */}
        <div 
          className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
          style={{ backgroundColor: getImpactColor(event.impactLevel) }}
        >
          <div className="w-3 h-3 rounded-full bg-white" />
        </div>
        
        {/* Event content */}
        <div className="flex-1 min-w-0">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {event.source.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant={statusBadge.variant}
                        className={`text-xs ${statusBadge.color}`}
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs whitespace-nowrap"
                    style={{ 
                      backgroundColor: `${getImpactColor(event.impactLevel)}20`,
                      borderColor: getImpactColor(event.impactLevel),
                      color: getImpactColor(event.impactLevel)
                    }}
                  >
                    {event.impactLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-3">{event.summary}</p>
              
              {/* Affected sectors */}
              {event.affectedSectors.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500">Sectors: </span>
                  <div className="inline-flex gap-1 flex-wrap">
                    {event.affectedSectors.slice(0, 3).map((sector) => (
                      <Badge key={sector} variant="secondary" className="text-xs">
                        {sector.replace('_', ' ')}
                      </Badge>
                    ))}
                    {event.affectedSectors.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{event.affectedSectors.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Key dates */}
              {(event.effectiveDate || event.expirationDate) && (
                <div className="flex gap-4 text-xs text-gray-500 mb-2">
                  {event.effectiveDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Effective: {new Date(event.effectiveDate).toLocaleDateString()}
                    </span>
                  )}
                  {event.expirationDate && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Expires: {new Date(event.expirationDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Impact estimate */}
              {event.estimatedImpact !== undefined && (
                <div className="text-xs text-gray-500 mb-2">
                  Estimated Impact: 
                  <span className={`ml-1 font-medium ${event.estimatedImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {event.estimatedImpact >= 0 ? '+' : ''}{(event.estimatedImpact * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                {event.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Source
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => {/* TODO: Implement details modal */}}>
                  <FileText className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Policy Impact Timeline</CardTitle>
            <CardDescription>Loading regulatory changes timeline...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Policy Impact Timeline</CardTitle>
            <CardDescription>Error loading policy data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Policy Impact Timeline</h2>
          <p className="text-gray-600">
            Regulatory changes from Federal Register and Congress.gov APIs
            {projectId && <span className="ml-2 text-xs">• Project Context</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active alerts summary */}
      {activeAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-sm text-yellow-800">Active Policy Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 3).map((alert) => (
                <div key={alert.alertId} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.description}</p>
                  </div>
                  <Badge 
                    variant={alert.severity === 'high' || alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs ml-2"
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{activeAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector === 'all' ? 'All Sectors' : sector.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedImpactLevel} onValueChange={setSelectedImpactLevel}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Policy Timeline</TabsTrigger>
          <TabsTrigger value="impact-analysis">Impact Analysis</TabsTrigger>
          <TabsTrigger value="summary-stats">Summary Stats</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Changes Timeline</CardTitle>
              <CardDescription>
                Chronological view of policy events affecting renewable energy • {policyEvents.length} events loaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policyEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No policy events found for the selected filters.</p>
                  <p className="text-sm">Try adjusting your search criteria.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {policyEvents.map((event, index) => formatTimelineEvent(event, index))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Analysis Chart */}
        <TabsContent value="impact-analysis">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Policy Impact</CardTitle>
              <CardDescription>
                Financial and regulatory impact trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={impactHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Impact Index', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Policy Count', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => {
                        if (name === 'policy_count') return [value, 'Policy Count'];
                        if (name === 'cumulative_impact') return [`${(value * 100).toFixed(1)}%`, 'Cumulative Impact'];
                        if (name === 'regulatory_risk_index') return [value.toFixed(2), 'Risk Index'];
                        if (name === 'renewable_incentive_index') return [value.toFixed(2), 'Incentive Index'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="cumulative_impact" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Cumulative Impact"
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="policy_count" 
                      stroke="#82ca9d" 
                      strokeWidth={1.5}
                      name="Policy Count"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="regulatory_risk_index" 
                      stroke="#ffc658" 
                      strokeWidth={1.5}
                      name="Risk Index"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="renewable_incentive_index" 
                      stroke="#ff7300" 
                      strokeWidth={1.5}
                      name="Incentive Index"
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Statistics */}
        <TabsContent value="summary-stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Policy Impact Distribution</CardTitle>
                <CardDescription>Events by impact level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="category"
                        dataKey="impactLevel"
                        domain={['low', 'medium', 'high', 'critical']}
                      />
                      <YAxis 
                        type="number"
                        dataKey="count"
                        label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [value, 'Policy Count']}
                        labelFormatter={(value) => `Impact Level: ${value}`}
                      />
                      <Scatter 
                        name="Policies"
                        data={[
                          { impactLevel: 'low', count: policyEvents.filter(e => e.impactLevel === 'low').length },
                          { impactLevel: 'medium', count: policyEvents.filter(e => e.impactLevel === 'medium').length },
                          { impactLevel: 'high', count: policyEvents.filter(e => e.impactLevel === 'high').length },
                          { impactLevel: 'critical', count: policyEvents.filter(e => e.impactLevel === 'critical').length }
                        ]}
                      >
                        {[
                          { impactLevel: 'low', count: policyEvents.filter(e => e.impactLevel === 'low').length },
                          { impactLevel: 'medium', count: policyEvents.filter(e => e.impactLevel === 'medium').length },
                          { impactLevel: 'high', count: policyEvents.filter(e => e.impactLevel === 'high').length },
                          { impactLevel: 'critical', count: policyEvents.filter(e => e.impactLevel === 'critical').length }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getImpactColor(entry.impactLevel)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Policy Sources</CardTitle>
                <CardDescription>Events by data source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { source: 'federal_register', label: 'Federal Register', icon: '🏛️' },
                    { source: 'congress_gov', label: 'Congress.gov', icon: '📜' },
                    { source: 'regulatory_news', label: 'Regulatory News', icon: '📰' },
                    { source: 'industry_alert', label: 'Industry Alerts', icon: '⚠️' }
                  ].map(({ source, label, icon }) => {
                    const count = policyEvents.filter(e => e.source === source).length;
                    const percentage = policyEvents.length ? ((count / policyEvents.length) * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{icon}</span>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                          <span className="text-xs text-gray-500 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Data sources footer */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-medium mb-2">Free Policy Data Sources</p>
            <div className="flex justify-center gap-6 flex-wrap">
              <span>🏛️ Federal Register • Regulatory Changes</span>
              <span>📜 Congress.gov • Legislative Tracking</span>
              <span>📰 govinfo.gov • Policy Documents</span>
              <span>⚠️ LegiScan API • State Legislation</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Real-time policy monitoring • Zero API costs • Updated hourly
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PolicyTimeline;
