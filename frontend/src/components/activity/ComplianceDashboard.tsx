/**
 * Compliance Dashboard
 * Comprehensive compliance monitoring and reporting for regulatory standards
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  Eye,
  TrendingUp,
  Info
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

import { backendAuditService, ComplianceReport } from '@/services/audit/BackendAuditService';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | number | Date | null | undefined, formatString: string = 'MMM dd, yyyy'): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
};

interface ComplianceDashboardProps {
  dateRange?: DateRange;
  projectId?: string;
  className?: string;
}

type ComplianceStandard = 'SOX' | 'GDPR' | 'PCI_DSS' | 'ISO27001';

const COMPLIANCE_STANDARDS: Array<{
  key: ComplianceStandard;
  name: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'SOX',
    name: 'Sarbanes-Oxley',
    description: 'Financial reporting and corporate governance',
    icon: <FileText className="h-4 w-4" />
  },
  {
    key: 'GDPR',
    name: 'GDPR',
    description: 'Data protection and privacy',
    icon: <Shield className="h-4 w-4" />
  },
  {
    key: 'PCI_DSS',
    name: 'PCI DSS',
    description: 'Payment card industry data security',
    icon: <Shield className="h-4 w-4" />
  },
  {
    key: 'ISO27001',
    name: 'ISO 27001',
    description: 'Information security management',
    icon: <Shield className="h-4 w-4" />
  }
];

export function ComplianceDashboard({ 
  dateRange, 
  projectId,
  className = '' 
}: ComplianceDashboardProps) {
  const [activeStandard, setActiveStandard] = useState<ComplianceStandard>('SOX');
  const [reports, setReports] = useState<Record<ComplianceStandard, ComplianceReport | null>>({
    SOX: null,
    GDPR: null,
    PCI_DSS: null,
    ISO27001: null
  });
  const [loading, setLoading] = useState<Record<ComplianceStandard, boolean>>({
    SOX: false,
    GDPR: false,
    PCI_DSS: false,
    ISO27001: false
  });
  const [error, setError] = useState<string | null>(null);

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-500';
    if (score >= 85) return 'text-yellow-500';
    if (score >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getComplianceVariant = (score: number) => {
    if (score >= 95) return 'success';
    if (score >= 85) return 'secondary';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'non_compliant':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const loadComplianceReport = async (standard: ComplianceStandard) => {
    try {
      setLoading(prev => ({ ...prev, [standard]: true }));
      setError(null);

      const result = await backendAuditService.getComplianceReport(
        standard,
        dateRange?.from?.toISOString(),
        dateRange?.to?.toISOString()
      );

      if (result.success) {
        setReports(prev => ({ ...prev, [standard]: result.data }));
      } else {
        throw new Error(`Failed to load ${standard} compliance report`);
      }
    } catch (err) {
      console.error(`Error loading ${standard} compliance report:`, err);
      setError(err instanceof Error ? err.message : `Failed to load ${standard} compliance report`);
    } finally {
      setLoading(prev => ({ ...prev, [standard]: false }));
    }
  };

  const loadAllReports = async () => {
    await Promise.all(
      COMPLIANCE_STANDARDS.map(({ key }) => loadComplianceReport(key))
    );
  };

  useEffect(() => {
    loadComplianceReport(activeStandard);
  }, [activeStandard, dateRange]);

  const handleExportReport = async (standard: ComplianceStandard, format: 'pdf' | 'excel') => {
    try {
      const result = await backendAuditService.exportAuditData({
        format,
        filters: {
          category: 'compliance',
          entity_type: standard.toLowerCase(),
          project_id: projectId,
        },
        dateRange: {
          from: dateRange?.from?.toISOString() || '',
          to: dateRange?.to?.toISOString() || '',
        },
      });

      if (result.success) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export compliance report');
    }
  };

  const currentReport = reports[activeStandard];
  const isLoading = loading[activeStandard];

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => loadComplianceReport(activeStandard)}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`compliance-dashboard space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Compliance Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Monitor regulatory compliance across all standards
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={activeStandard} onValueChange={setActiveStandard as (value: string) => void}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_STANDARDS.map((standard) => (
                <SelectItem key={standard.key} value={standard.key}>
                  <div className="flex items-center gap-2">
                    {standard.icon}
                    {standard.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadComplianceReport(activeStandard)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllReports}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Load All
          </Button>
        </div>
      </div>

      {/* Compliance Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COMPLIANCE_STANDARDS.map((standard) => {
          const report = reports[standard.key];
          const isStandardLoading = loading[standard.key];
          
          return (
            <Card 
              key={standard.key}
              className={`cursor-pointer transition-colors ${
                activeStandard === standard.key ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => setActiveStandard(standard.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {standard.icon}
                    <span className="font-semibold text-sm">{standard.name}</span>
                  </div>
                  {report && (
                    <Badge variant={getComplianceVariant(report.compliance_score)} className="text-xs">
                      {report.compliance_score}%
                    </Badge>
                  )}
                </div>
                
                {isStandardLoading ? (
                  <div className="flex items-center justify-center h-8">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  </div>
                ) : report ? (
                  <div>
                    <Progress value={report.compliance_score} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {report.requirements.filter(r => r.status === 'compliant').length} of{' '}
                      {report.requirements.length} requirements met
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Click to load report</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Report */}
      {currentReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {COMPLIANCE_STANDARDS.find(s => s.key === activeStandard)?.icon}
                  {COMPLIANCE_STANDARDS.find(s => s.key === activeStandard)?.name} Compliance Report
                </CardTitle>
                <CardDescription>
                  Report period: {safeFormatDate(currentReport.period?.from)} to {safeFormatDate(currentReport.period?.to)}
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getComplianceVariant(currentReport.compliance_score)} 
                  className="text-lg px-3 py-1"
                >
                  {currentReport.compliance_score}%
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport(activeStandard, 'pdf')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport(activeStandard, 'excel')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs defaultValue="requirements" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="requirements" className="space-y-4">
                {currentReport.requirements.map((requirement, idx) => (
                  <div 
                    key={idx}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(requirement.status)}
                          <span className="font-medium">{requirement.requirement}</span>
                          <Badge variant={
                            requirement.status === 'compliant' ? 'success' :
                            requirement.status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {requirement.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {requirement.details}
                        </p>
                        {requirement.evidence.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1">Evidence:</p>
                            <div className="flex flex-wrap gap-1">
                              {requirement.evidence.map((evidence, evidenceIdx) => (
                                <Badge key={evidenceIdx} variant="outline" className="text-xs">
                                  {evidence}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="issues" className="space-y-4">
                {currentReport.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold">No Compliance Issues</p>
                    <p className="text-muted-foreground">All requirements are being met</p>
                  </div>
                ) : (
                  currentReport.issues.map((issue, idx) => (
                    <Alert 
                      key={idx}
                      variant={issue.severity === 'high' ? 'destructive' : 'default'}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              issue.severity === 'high' ? 'destructive' : 'secondary'
                            }>
                              {issue.severity}
                            </Badge>
                            <span className="font-medium">{issue.description}</span>
                          </div>
                          <p className="text-sm">{issue.remediation}</p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-3">
                {currentReport.recommendations.map((recommendation, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950"
                  >
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading {activeStandard} compliance report...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
