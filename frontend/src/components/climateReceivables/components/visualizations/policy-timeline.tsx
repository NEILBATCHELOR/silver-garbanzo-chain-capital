import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  RefreshCw, 
  AlertTriangle, 
  Calendar,
  Filter,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { PolicyRiskTrackingService } from "../../services/api/policy-risk-tracking-service";
import { POLICY_COLORS, CHART_STYLES, withOpacity } from "../../constants/chart-colors";

interface PolicyTimelineProps {
  projectId?: string;
}

// Transform PolicyAlert to PolicyTimelineEvent format
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
  deadline?: string;
  alertType: string;
  affectedAssets: number;
  affectedReceivables: number;
  recommendedActions: string[];
  resolved: boolean;
}

interface PolicyAlert {
  alertId: string;
  policyId: string;
  alertType: 'new_policy' | 'policy_change' | 'expiration_warning' | 'compliance_deadline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedAssets: string[];
  affectedReceivables: string[];
  recommendedActions: string[];
  deadline?: string;
  createdAt: string;
  resolved: boolean;
}

/**
 * Policy Impact Timeline Component - REAL API DATA ONLY
 * 
 * Provides real-time visualization of regulatory changes from live government APIs:
 * - Federal Register API (free, no API key required)
 * - GovInfo API (optional API key)  
 * - LegiScan API (optional API key)
 * 
 * NO HARDCODED OR MOCK DATA - All data comes from PolicyRiskTrackingService.monitorRegulatoryChanges()
 */
export function PolicyTimeline({ projectId }: PolicyTimelineProps) {
  const [policyEvents, setPolicyEvents] = useState<PolicyTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '6m' | '1y' | '2y'>('6m');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedAlertType, setSelectedAlertType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // New state for expanded descriptions and details
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PolicyTimelineEvent | null>(null);

  // Available alert types for filtering
  const availableAlertTypes = [
    'all',
    'new_policy',
    'policy_change',
    'expiration_warning',
    'compliance_deadline'
  ];

  // Load real policy data on component mount and when filters change
  useEffect(() => {
    loadRealPolicyData();
  }, [selectedTimeRange, selectedSeverity, selectedAlertType]);

  /**
   * Transform PolicyAlert from real API to PolicyTimelineEvent format
   */
  const transformPolicyAlertToTimelineEvent = (alert: PolicyAlert): PolicyTimelineEvent => {
    // Map alert source based on policyId patterns (from real API implementation)
    let source: PolicyTimelineEvent['source'] = 'regulatory_news';
    if (alert.policyId.includes('federal_register')) source = 'federal_register';
    if (alert.policyId.includes('govinfo')) source = 'congress_gov';
    if (alert.policyId.includes('legiscan')) source = 'industry_alert';

    // Infer policy type from title/description content
    const title = alert.title.toLowerCase();
    let policyType: PolicyTimelineEvent['policyType'] = 'other';
    if (title.includes('tax credit') || title.includes('itc') || title.includes('ptc')) policyType = 'tax_credit';
    if (title.includes('renewable portfolio') || title.includes('rps') || title.includes('standard')) policyType = 'renewable_standard';
    if (title.includes('carbon') || title.includes('emission') || title.includes('cap and trade')) policyType = 'carbon_pricing';
    if (title.includes('regulation') || title.includes('rule') || title.includes('requirement')) policyType = 'regulation';
    if (title.includes('tariff') || title.includes('trade') || title.includes('import')) policyType = 'trade_policy';

    // Infer affected sectors from title/description
    const affectedSectors = [];
    if (title.includes('solar')) affectedSectors.push('solar');
    if (title.includes('wind')) affectedSectors.push('wind');
    if (title.includes('storage') || title.includes('battery')) affectedSectors.push('energy_storage');
    if (title.includes('renewable') || title.includes('clean energy')) affectedSectors.push('renewable_energy');
    if (title.includes('grid') || title.includes('utility')) affectedSectors.push('grid_modernization');
    if (affectedSectors.length === 0) affectedSectors.push('renewable_energy');

    // Extract effective date from description if available, otherwise use deadline or created date
    let effectiveDate = alert.deadline; // Use deadline as effective date if available
    const description = alert.description || '';
    const effectiveDateMatch = description.match(/effective\s+(?:date\s+)?(?:is\s+)?(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (effectiveDateMatch) {
      effectiveDate = effectiveDateMatch[1];
    }

    return {
      id: alert.alertId,
      date: alert.createdAt.split('T')[0], // Retrieved date (when alert was created)
      title: alert.title,
      summary: alert.description || alert.title, // Full description for 3-line display
      description: alert.description || alert.title,
      impactLevel: alert.severity,
      policyType,
      source,
      affectedSectors,
      regions: ['federal'], // From real API - federal monitoring
      url: undefined, // Real API doesn't provide direct URLs currently
      effectiveDate, // Actual policy effective date if available
      deadline: alert.deadline,
      alertType: alert.alertType,
      affectedAssets: alert.affectedAssets.length,
      affectedReceivables: alert.affectedReceivables.length,
      recommendedActions: alert.recommendedActions,
      resolved: alert.resolved
    };
  };

  /**
   * Helper functions for description expansion
   */
  const truncateToLines = (text: string, lines: number = 3): { truncated: string; isTruncated: boolean } => {
    const words = text.split(' ');
    const avgWordsPerLine = 12; // Approximate words per line
    const maxWords = lines * avgWordsPerLine;
    
    if (words.length <= maxWords) {
      return { truncated: text, isTruncated: false };
    }
    
    return { 
      truncated: words.slice(0, maxWords).join(' ') + '...', 
      isTruncated: true 
    };
  };

  const toggleDescription = (eventId: string) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedDescriptions(newExpanded);
  };

  const openDetailsModal = (event: PolicyTimelineEvent) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  /**
   * NO HARDCODED DATA - Only calls PolicyRiskTrackingService.monitorRegulatoryChanges
   */
  const loadRealPolicyData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Policy Timeline: Loading real policy data from government APIs');

      // Get real policy alerts from live APIs (Federal Register, GovInfo, LegiScan)
      const realAlerts = await PolicyRiskTrackingService.monitorRegulatoryChanges(['federal']);
      console.log(`Policy Timeline: Received ${realAlerts.length} real policy alerts`);

      // Transform alerts to timeline event format
      let transformedEvents = realAlerts.map(transformPolicyAlertToTimelineEvent);

      // Apply time range filter (based on created date)
      const now = new Date();
      const cutoffDate = new Date();
      switch (selectedTimeRange) {
        case '30d': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
        case '90d': cutoffDate.setDate(cutoffDate.getDate() - 90); break;
        case '6m': cutoffDate.setMonth(cutoffDate.getMonth() - 6); break;
        case '1y': cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); break;
        case '2y': cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); break;
      }

      transformedEvents = transformedEvents.filter(event => 
        new Date(event.date) >= cutoffDate
      );

      // Apply severity filter
      if (selectedSeverity !== 'all') {
        transformedEvents = transformedEvents.filter(event => 
          event.impactLevel === selectedSeverity
        );
      }

      // Apply alert type filter
      if (selectedAlertType !== 'all') {
        transformedEvents = transformedEvents.filter(event => 
          event.alertType === selectedAlertType
        );
      }

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        transformedEvents = transformedEvents.filter(event => 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.summary.toLowerCase().includes(searchLower)
        );
      }

      // Sort by date (newest first)
      transformedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPolicyEvents(transformedEvents);
      setLastUpdate(new Date());
      console.log(`Policy Timeline: Displaying ${transformedEvents.length} filtered policy events`);

    } catch (err) {
      console.error('Policy Timeline: Error loading real policy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load real policy data');
      setPolicyEvents([]); // NO FALLBACK DATA - show empty state if APIs fail
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh policy data from live APIs
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRealPolicyData();
    setRefreshing(false);
  };

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Debounce search - reload after 500ms delay
    const timeoutId = setTimeout(() => {
      loadRealPolicyData();
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
   * Get badge variant for alert type
   */
  const getAlertTypeBadge = (alertType: string) => {
    switch (alertType) {
      case 'new_policy': return { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' };
      case 'policy_change': return { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      case 'expiration_warning': return { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      case 'compliance_deadline': return { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' };
      default: return { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
    }
  };

  /**
   * Format policy event for timeline display - REAL DATA ONLY
   */
  const formatTimelineEvent = (event: PolicyTimelineEvent, index: number) => {
    const alertTypeBadge = getAlertTypeBadge(event.alertType);
    const isDescriptionExpanded = expandedDescriptions.has(event.id);
    const { truncated, isTruncated } = truncateToLines(event.description, 3);
    const displayDescription = isDescriptionExpanded ? event.description : truncated;
    
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
                        Retrieved: {new Date(event.date).toLocaleDateString()}
                      </span>
                      {event.effectiveDate && event.effectiveDate !== event.date && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="h-3 w-3" />
                          Effective: {new Date(event.effectiveDate).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {event.source.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant={alertTypeBadge.variant}
                        className={`text-xs ${alertTypeBadge.color}`}
                      >
                        {event.alertType.replace('_', ' ')}
                      </Badge>
                      <Badge className={`text-xs ${event.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {event.resolved ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Active</>
                        )}
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
              {/* 3-Line Expandable Description */}
              <div className="text-sm text-gray-600 mb-3">
                <p className={isDescriptionExpanded ? '' : 'line-clamp-3'}>
                  {displayDescription}
                </p>
                {isTruncated && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleDescription(event.id)}
                    className="mt-1 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
              
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

              {/* Impact metrics - REAL DATA */}
              <div className="flex gap-4 text-xs text-gray-500 mb-2">
                <span>Assets Affected: {event.affectedAssets}</span>
                <span>Receivables Affected: {event.affectedReceivables}</span>
              </div>

              {/* Deadline warning */}
              {event.deadline && (
                <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                  <AlertTriangle className="h-3 w-3" />
                  Deadline: {new Date(event.deadline).toLocaleDateString()}
                </div>
              )}

              {/* Recommended actions - REAL DATA */}
              {event.recommendedActions.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500">Recommended Actions:</span>
                  <ul className="text-xs text-gray-600 mt-1 space-y-1">
                    {event.recommendedActions.slice(0, 2).map((action, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                    {event.recommendedActions.length > 2 && (
                      <li className="text-gray-500">+{event.recommendedActions.length - 2} more recommendations</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => openDetailsModal(event)}
                >
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

  // Generate summary statistics from REAL data
  const getSummaryStats = () => {
    if (policyEvents.length === 0) return null;

    const severityCounts = {
      critical: policyEvents.filter(e => e.impactLevel === 'critical').length,
      high: policyEvents.filter(e => e.impactLevel === 'high').length,
      medium: policyEvents.filter(e => e.impactLevel === 'medium').length,
      low: policyEvents.filter(e => e.impactLevel === 'low').length
    };

    const alertTypeCounts = {
      new_policy: policyEvents.filter(e => e.alertType === 'new_policy').length,
      policy_change: policyEvents.filter(e => e.alertType === 'policy_change').length,
      expiration_warning: policyEvents.filter(e => e.alertType === 'expiration_warning').length,
      compliance_deadline: policyEvents.filter(e => e.alertType === 'compliance_deadline').length
    };

    const chartData = [
      { name: 'Critical', value: severityCounts.critical, fill: '#dc2626' },
      { name: 'High', value: severityCounts.high, fill: '#ea580c' },
      { name: 'Medium', value: severityCounts.medium, fill: '#d97706' },
      { name: 'Low', value: severityCounts.low, fill: '#65a30d' }
    ].filter(item => item.value > 0);

    return { severityCounts, alertTypeCounts, chartData };
  };

  const summaryStats = getSummaryStats();

  // Details Modal Component
  const DetailsModal = () => {
    if (!selectedEvent) return null;

    return (
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Policy Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedEvent.source.replace('_', ' ')} policy alert
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Title and basic info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{selectedEvent.source.replace('_', ' ')}</Badge>
                <Badge variant="outline">{selectedEvent.policyType.replace('_', ' ')}</Badge>
                <Badge 
                  variant="outline"
                  style={{ 
                    backgroundColor: `${getImpactColor(selectedEvent.impactLevel)}20`,
                    borderColor: getImpactColor(selectedEvent.impactLevel),
                    color: getImpactColor(selectedEvent.impactLevel)
                  }}
                >
                  {selectedEvent.impactLevel.toUpperCase()} Impact
                </Badge>
                <Badge className={selectedEvent.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {selectedEvent.resolved ? 'Resolved' : 'Active'}
                </Badge>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Important Dates</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Retrieved:</span>
                    <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                  </div>
                  {selectedEvent.effectiveDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-600">Effective:</span>
                      <span className="text-blue-600">{new Date(selectedEvent.effectiveDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedEvent.deadline && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-gray-600">Deadline:</span>
                      <span className="text-red-600">{new Date(selectedEvent.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Impact Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div>Assets Affected: <span className="font-medium">{selectedEvent.affectedAssets}</span></div>
                  <div>Receivables Affected: <span className="font-medium">{selectedEvent.affectedReceivables}</span></div>
                  <div>Alert Type: <span className="font-medium">{selectedEvent.alertType.replace('_', ' ')}</span></div>
                </div>
              </div>
            </div>

            {/* Full description */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Full Description</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>
            </div>

            {/* Affected sectors */}
            {selectedEvent.affectedSectors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Affected Sectors</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedEvent.affectedSectors.map((sector) => (
                    <Badge key={sector} variant="secondary">
                      {sector.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended actions */}
            {selectedEvent.recommendedActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">All Recommended Actions</h4>
                <ul className="space-y-2">
                  {selectedEvent.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regions */}
            {selectedEvent.regions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Applicable Regions</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedEvent.regions.map((region) => (
                    <Badge key={region} variant="outline">
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Policy Impact Timeline</CardTitle>
            <CardDescription>Loading real-time regulatory changes from government APIs...</CardDescription>
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
            <CardDescription>Error loading real policy data from government APIs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500 mb-4">
                This component only displays real data from government APIs (Federal Register, GovInfo, LegiScan).
                No fallback or mock data is provided.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry API Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      
      {/* Header with controls */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Policy Impact Timeline</h2>
          <p className="text-gray-600">
            Real-time regulatory changes from Federal Register, GovInfo, and LegiScan APIs
            {projectId && <span className="ml-2 text-xs">• Project Context</span>}
          </p>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdate.toLocaleString()} • {policyEvents.length} real policy alerts loaded
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh APIs
          </Button>
        </div>
      </div>

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
                placeholder="Search real policy data..."
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
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedAlertType} onValueChange={setSelectedAlertType}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableAlertTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Alert Types' : type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timeline">Policy Timeline</TabsTrigger>
          <TabsTrigger value="summary-stats">Summary Stats</TabsTrigger>
        </TabsList>

        {/* Timeline View - REAL DATA ONLY */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Live Policy Events Timeline</CardTitle>
              <CardDescription>
                Real regulatory changes from government APIs • {policyEvents.length} events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policyEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No real policy events found for the selected filters.</p>
                  <p className="text-sm">Try adjusting your search criteria or check if government APIs are accessible.</p>
                  <p className="text-xs mt-2 text-blue-600">
                    This component only displays real data from Federal Register, GovInfo, and LegiScan APIs.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {policyEvents.map((event, index) => formatTimelineEvent(event, index))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Statistics - REAL DATA ONLY */}
        <TabsContent value="summary-stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Real policy alerts by impact level</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryStats && summaryStats.chartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryStats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-500">
                    No real policy data available for chart
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Types</CardTitle>
                <CardDescription>Real alerts by type</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryStats ? (
                  <div className="space-y-3">
                    {[
                      { type: 'new_policy', label: 'New Policy', icon: '📋' },
                      { type: 'policy_change', label: 'Policy Change', icon: '🔄' },
                      { type: 'expiration_warning', label: 'Expiration Warning', icon: '⏰' },
                      { type: 'compliance_deadline', label: 'Compliance Deadline', icon: '📅' }
                    ].map(({ type, label, icon }) => {
                      const count = summaryStats.alertTypeCounts[type as keyof typeof summaryStats.alertTypeCounts];
                      const percentage = policyEvents.length ? ((count / policyEvents.length) * 100).toFixed(1) : '0';
                      
                      return (
                        <div key={type} className="flex items-center justify-between">
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
                ) : (
                  <div className="text-center text-gray-500">
                    No real alert type data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <DetailsModal />
    </div>
  );
}

export default PolicyTimeline;