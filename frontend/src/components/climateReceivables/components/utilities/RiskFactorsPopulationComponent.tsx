/**
 * Risk Factors Population Component
 * 
 * UI component to populate climate_risk_factors table for all receivables
 * using the RiskFactorsPopulationService
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  Database,
  RefreshCcw,
  TrendingUp,
  Shield
} from 'lucide-react';
import { RiskFactorsPopulationService } from '../../../../services/climateReceivables/riskFactorsPopulationService';
import type { PopulationSummary } from '../../../../services/climateReceivables/riskFactorsPopulationService';

interface PopulationStatus {
  total_receivables: number;
  risk_factors_populated: number;
  completion_percentage: number;
  last_updated?: string;
}

interface QualityMetrics {
  valid_entries: number;
  invalid_entries: number;
  quality_score: number;
  issues: string[];
}

const RiskFactorsPopulationComponent: React.FC = () => {
  const [status, setStatus] = useState<PopulationStatus>({
    total_receivables: 0,
    risk_factors_populated: 0,
    completion_percentage: 0
  });
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [populationResult, setPopulationResult] = useState<PopulationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load initial status on component mount
  useEffect(() => {
    loadStatus();
    loadQualityMetrics();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await RiskFactorsPopulationService.getPopulationStatus();
      setStatus(statusData);
    } catch (err) {
      console.error('Failed to load population status:', err);
    }
  };

  const loadQualityMetrics = async () => {
    try {
      const metrics = await RiskFactorsPopulationService.validateRiskFactorsQuality();
      setQualityMetrics(metrics);
    } catch (err) {
      console.error('Failed to load quality metrics:', err);
    }
  };

  const handlePopulateRiskFactors = async () => {
    try {
      setIsPopulating(true);
      setError(null);
      setPopulationResult(null);

      console.log('🚀 Starting risk factors population...');
      const result = await RiskFactorsPopulationService.populateAllReceivablesRiskFactors();
      
      setPopulationResult(result);
      
      if (result.successful_calculations > 0) {
        await loadStatus(); // Refresh status after successful population
        await loadQualityMetrics(); // Refresh quality metrics
      }

      if (result.failed_calculations > 0) {
        setError(`${result.failed_calculations} calculations failed. See details below.`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Risk factors population failed:', err);
    } finally {
      setIsPopulating(false);
    }
  };

  const getStatusBadgeVariant = () => {
    if (status.completion_percentage === 100) return 'default';
    if (status.completion_percentage > 50) return 'secondary';
    return 'outline';
  };

  const getQualityBadgeVariant = () => {
    if (!qualityMetrics) return 'outline';
    if (qualityMetrics.quality_score >= 90) return 'default';
    if (qualityMetrics.quality_score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Factors Population</h3>
          <p className="text-sm text-muted-foreground">
            Generate production, credit, and policy risk factors for climate receivables
          </p>
        </div>
        <Button
          onClick={handlePopulateRiskFactors}
          disabled={isPopulating}
          className="flex items-center gap-2"
        >
          {isPopulating ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" />
              Generate Risk Factors
            </>
          )}
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Population Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Progress</span>
                <Badge variant={getStatusBadgeVariant()}>
                  {status.completion_percentage}%
                </Badge>
              </div>
              <Progress value={status.completion_percentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {status.risk_factors_populated} of {status.total_receivables} receivables
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Data Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Quality Score</span>
                <Badge variant={getQualityBadgeVariant()}>
                  {qualityMetrics?.quality_score || 0}%
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {qualityMetrics?.valid_entries || 0} valid, {qualityMetrics?.invalid_entries || 0} issues
              </div>
              {qualityMetrics && qualityMetrics.issues.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs p-0 h-auto"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  View Issues
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                {status.last_updated 
                  ? new Date(status.last_updated).toLocaleString()
                  : 'Never'
                }
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadStatus}
                className="text-xs p-0 h-auto"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Population Results */}
      {populationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Population Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {populationResult.successful_calculations}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {populationResult.failed_calculations}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {populationResult.total_receivables}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(populationResult.processing_time_ms / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">Processing Time</div>
                </div>
              </div>

              {/* Successful Risk Factors */}
              {populationResult.risk_factors_created.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Generated Risk Factors</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {populationResult.risk_factors_created.map((rf, index) => (
                      <div key={rf.receivable_id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div className="font-mono text-xs">
                          {rf.receivable_id.slice(0, 8)}...
                        </div>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline">P: {rf.production_risk}</Badge>
                          <Badge variant="outline">C: {rf.credit_risk}</Badge>
                          <Badge variant="outline">Po: {rf.policy_risk}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {populationResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {populationResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Issues Detail */}
      {showDetails && qualityMetrics && qualityMetrics.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {qualityMetrics.issues.map((issue, index) => (
                <div key={index} className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  {issue}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="space-y-2">
            <p>
              <strong>Generate Risk Factors:</strong> Click the button above to calculate production, credit, 
              and policy risk factors for all climate receivables using live market data and payer information.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>• Production Risk: Asset performance and weather factors</span>
              <span>• Credit Risk: Payer creditworthiness and financial health</span>
              <span>• Policy Risk: Regulatory environment and policy changes</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Risk factors are automatically integrated with the Risk Assessment Dashboard and used 
              for receivables valuation and discount rate calculations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskFactorsPopulationComponent;
