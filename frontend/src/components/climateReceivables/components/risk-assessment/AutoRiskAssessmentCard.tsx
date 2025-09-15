import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Info,
  Zap
} from 'lucide-react';

import { 
  PayerRiskAssessmentService, 
  PayerCreditProfile, 
  RiskAssessmentResult 
} from '@/services/climateReceivables/payerRiskAssessmentService';

interface AutoRiskAssessmentProps {
  payerId: string | null;
  creditRating: string;
  financialHealthScore: number;
  currentRiskScore?: number;
  currentDiscountRate?: number;
  onRiskScoreChange: (riskScore: number) => void;
  onDiscountRateChange: (discountRate: number) => void;
  onAssessmentUpdate: (assessment: RiskAssessmentResult) => void;
}

export const AutoRiskAssessmentCard: React.FC<AutoRiskAssessmentProps> = ({
  payerId,
  creditRating,
  financialHealthScore,
  currentRiskScore,
  currentDiscountRate,
  onRiskScoreChange,
  onDiscountRateChange,
  onAssessmentUpdate
}) => {
  const [assessment, setAssessment] = useState<RiskAssessmentResult | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [manualRiskScore, setManualRiskScore] = useState<number>(currentRiskScore || 0);
  const [manualDiscountRate, setManualDiscountRate] = useState<number>(currentDiscountRate || 0);
  const [showInsights, setShowInsights] = useState(false);
  const [isInvestmentGrade, setIsInvestmentGrade] = useState<boolean>(false);
  const [riskTier, setRiskTier] = useState<string>('');
  const [climateInsights, setClimateInsights] = useState<string[]>([]);

  // Auto-calculate when payer data changes
  const calculateRiskAssessment = useCallback(async () => {
    if (!creditRating || financialHealthScore === undefined) {
      return;
    }

    try {
      const creditProfile: PayerCreditProfile = {
        credit_rating: creditRating,
        financial_health_score: financialHealthScore,
        // Add ESG score from payer data if available
        esg_score: 75 // Default ESG for renewable energy payers
      };

      // Run all async service calls in parallel
      const [result, investmentGradeStatus, riskTierStatus, insights] = await Promise.all([
        PayerRiskAssessmentService.assessPayerRisk(creditProfile),
        PayerRiskAssessmentService.isInvestmentGrade(creditRating),
        PayerRiskAssessmentService.getRiskTier(creditRating),
        PayerRiskAssessmentService.getClimateFinanceInsights(creditProfile)
      ]);

      setAssessment(result);
      setIsInvestmentGrade(investmentGradeStatus);
      setRiskTier(riskTierStatus);
      setClimateInsights(insights);
      
      // Auto-update values if in auto mode
      if (isAutoMode) {
        onRiskScoreChange(result.risk_score);
        onDiscountRateChange(result.discount_rate);
        onAssessmentUpdate(result);
      }
    } catch (error) {
      console.error('Risk assessment calculation failed:', error);
      setAssessment(null);
      setIsInvestmentGrade(false);
      setRiskTier('Unknown');
      setClimateInsights([]);
    }
  }, [creditRating, financialHealthScore, isAutoMode, onRiskScoreChange, onDiscountRateChange, onAssessmentUpdate]);

  // Calculate on mount and when dependencies change
  useEffect(() => {
    calculateRiskAssessment();
  }, [calculateRiskAssessment]);

  // Handle mode toggle
  const handleModeToggle = (autoMode: boolean) => {
    setIsAutoMode(autoMode);
    
    if (autoMode && assessment) {
      // Switch to auto mode - use calculated values
      onRiskScoreChange(assessment.risk_score);
      onDiscountRateChange(assessment.discount_rate);
      onAssessmentUpdate(assessment);
    } else {
      // Switch to manual mode - use current manual values
      onRiskScoreChange(manualRiskScore);
      onDiscountRateChange(manualDiscountRate);
    }
  };

  // Handle manual value changes
  const handleManualRiskScoreChange = (value: number) => {
    setManualRiskScore(value);
    if (!isAutoMode) {
      onRiskScoreChange(value);
    }
  };

  const handleManualDiscountRateChange = (value: number) => {
    setManualDiscountRate(value);
    if (!isAutoMode) {
      onDiscountRateChange(value);
    }
  };

  const getRiskScoreColor = (score: number): string => {
    if (score <= 20) return 'text-green-600';
    if (score <= 40) return 'text-yellow-600';
    if (score <= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score <= 20) return 'default';
    if (score <= 40) return 'secondary';
    if (score <= 60) return 'outline';
    return 'destructive';
  };

  const getDiscountRateColor = (rate: number): string => {
    if (rate <= 2.0) return 'text-green-600';
    if (rate <= 4.0) return 'text-yellow-600';
    if (rate <= 6.0) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!creditRating || financialHealthScore === undefined) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select a payer with credit rating and financial health score to enable automatic risk assessment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Risk Assessment & Pricing
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-mode" className="text-sm">Auto</Label>
            <Switch
              id="auto-mode"
              checked={isAutoMode}
              onCheckedChange={handleModeToggle}
            />
            <Settings className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payer Overview */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Credit Rating:</span>
              <Badge variant={isInvestmentGrade ? 'default' : 'destructive'}>
                {creditRating}
              </Badge>
              <span className="text-xs text-gray-500">
                ({riskTier})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Financial Health:</span>
              <span className={`font-semibold ${financialHealthScore >= 70 ? 'text-green-600' : financialHealthScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {financialHealthScore}/100
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowInsights(!showInsights)}
          >
            <Info className="h-4 w-4 mr-1" />
            Insights
          </Button>
        </div>

        {/* Assessment Results */}
        {assessment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Score */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Risk Score</span>
                  </div>
                  {isAutoMode ? (
                    <Badge variant={getRiskScoreBadgeVariant(assessment.risk_score)}>
                      Auto: {assessment.risk_score}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={manualRiskScore}
                        onChange={(e) => handleManualRiskScoreChange(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border rounded"
                      />
                      <span className="text-xs text-gray-500">Manual</span>
                    </div>
                  )}
                </div>
                <div className={`text-2xl font-bold ${getRiskScoreColor(isAutoMode ? assessment.risk_score : manualRiskScore)}`}>
                  {isAutoMode ? assessment.risk_score : manualRiskScore}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Higher score = Higher risk
                </div>
              </CardContent>
            </Card>

            {/* Discount Rate */}
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Discount Rate</span>
                  </div>
                  {isAutoMode ? (
                    <Badge variant="outline">
                      Auto: {assessment.discount_rate}%
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="15.0"
                        step="0.1"
                        value={manualDiscountRate}
                        onChange={(e) => handleManualDiscountRateChange(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border rounded"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  )}
                </div>
                <div className={`text-2xl font-bold ${getDiscountRateColor(isAutoMode ? assessment.discount_rate : manualDiscountRate)}`}>
                  {isAutoMode ? assessment.discount_rate : manualDiscountRate}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Annual receivables financing rate
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Climate Finance Insights */}
        {showInsights && assessment && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">Climate Finance Insights</span>
              </div>
              
              {/* Methodology */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <div className="font-medium mb-1">Calculation Methodology:</div>
                  {assessment.methodology}
                </AlertDescription>
              </Alert>

              {/* Factors Considered */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-sm mb-2">Factors Considered:</div>
                <ul className="text-sm space-y-1">
                  {assessment.factors_considered.map((factor, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Climate-Specific Insights */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="font-medium text-sm text-green-800 mb-2">Climate Finance Benefits:</div>
                {climateInsights.map((insight, index) => (
                  <div key={index} className="text-sm text-green-700 flex items-start gap-2">
                    <Zap className="h-3 w-3 text-green-600 mt-0.5" />
                    {insight}
                  </div>
                ))}
              </div>

              {/* Confidence Level */}
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-sm font-medium">Assessment Confidence:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${assessment.confidence_level}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{assessment.confidence_level}%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Recalculate Button */}
        <Button 
          onClick={calculateRiskAssessment}
          variant="outline" 
          className="w-full"
          disabled={!creditRating || financialHealthScore === undefined}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Recalculate Risk Assessment
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutoRiskAssessmentCard;