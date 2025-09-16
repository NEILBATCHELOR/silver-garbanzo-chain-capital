/**
 * Enhanced Credit Spreads Test Component
 * 
 * Tests the newly implemented comprehensive credit spreads coverage
 * Displays AAA-to-CCC credit spread spectrum from FRED API
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { FreeMarketDataService } from '@/services/climateReceivables';
import type { CreditSpreads } from '@/services/climateReceivables';

interface TestResult {
  success: boolean;
  data?: CreditSpreads;
  error?: string;
  apiCallCount?: number;
  processingTime?: number;
  seriesSuccess?: number;
  totalSeries?: number;
}

/**
 * Enhanced Credit Spreads Test Component
 */
const EnhancedCreditSpreadsTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTestCreditSpreads = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      console.log('🧪 Testing Enhanced Credit Spreads Coverage...');
      
      const creditSpreads = await FreeMarketDataService.fetchCreditSpreads();
      const processingTime = Date.now() - startTime;
      
      // Calculate success metrics
      const totalSeries = 9;
      const nonZeroSpreads = Object.entries(creditSpreads).filter(([key, value]) => 
        key !== 'last_updated' && key !== 'source' && typeof value === 'number' && value > 0
      ).length;
      
      setTestResult({
        success: true,
        data: creditSpreads,
        processingTime,
        seriesSuccess: nonZeroSpreads,
        totalSeries,
        apiCallCount: 9 // We know it makes 9 API calls
      });

      console.log('✅ Enhanced Credit Spreads Test Successful');
      console.log(`📊 Coverage: ${nonZeroSpreads}/${totalSeries} series with data`);
      
    } catch (error) {
      console.error('❌ Enhanced Credit Spreads Test Failed:', error);
      
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: Date.now() - startTime
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatSpread = (value: number | undefined): string => {
    if (!value || value === 0) return 'N/A';
    return `${value.toFixed(0)} bps`;
  };

  const getSpreadBadge = (value: number | undefined, threshold: number) => {
    if (!value || value === 0) {
      return <Badge variant="outline">N/A</Badge>;
    }
    
    if (value < threshold) {
      return <Badge variant="default" className="bg-green-100 text-green-800">
        <TrendingDown className="w-3 h-3 mr-1" />
        {formatSpread(value)}
      </Badge>;
    } else {
      return <Badge variant="default" className="bg-red-100 text-red-800">
        <TrendingUp className="w-3 h-3 mr-1" />
        {formatSpread(value)}
      </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Enhanced Credit Spreads Test</CardTitle>
              <CardDescription>
                Test comprehensive AAA-to-CCC credit spread coverage from FRED API
              </CardDescription>
            </div>
            <Button 
              onClick={handleTestCreditSpreads} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Testing...' : 'Test Credit Spreads'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Test Results Summary */}
          {testResult && (
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                {testResult.success ? (
                  <Badge className="bg-green-100 text-green-800">✅ SUCCESS</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">❌ FAILED</Badge>
                )}
                {testResult.processingTime && (
                  <Badge variant="outline">{testResult.processingTime}ms</Badge>
                )}
                {testResult.apiCallCount && (
                  <Badge variant="outline">{testResult.apiCallCount} API calls</Badge>
                )}
                {testResult.seriesSuccess && testResult.totalSeries && (
                  <Badge variant="outline">
                    {testResult.seriesSuccess}/{testResult.totalSeries} series
                  </Badge>
                )}
              </div>
              
              {testResult.error && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{testResult.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Credit Spreads Display */}
          {testResult?.success && testResult.data && (
            <div className="space-y-4">
              {/* Investment Grade Spreads */}
              <div>
                <h3 className="font-semibold mb-2">Investment Grade Spreads (AAA → BBB)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">AAA Corporate</div>
                    {getSpreadBadge(testResult.data.corporate_aaa, 50)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">AA Corporate</div>
                    {getSpreadBadge(testResult.data.corporate_aa, 75)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">A Corporate</div>
                    {getSpreadBadge(testResult.data.corporate_a, 100)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">BBB Corporate</div>
                    {getSpreadBadge(testResult.data.corporate_bbb, 150)}
                  </div>
                </div>
              </div>

              {/* High Yield Spreads */}
              <div>
                <h3 className="font-semibold mb-2">High Yield Spreads (BB → CCC)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">BB High Yield</div>
                    {getSpreadBadge(testResult.data.high_yield_bb, 300)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">B High Yield</div>
                    {getSpreadBadge(testResult.data.high_yield_b, 500)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">CCC+ High Yield</div>
                    {getSpreadBadge(testResult.data.high_yield_ccc, 800)}
                  </div>
                </div>
              </div>

              {/* Aggregate Indices */}
              <div>
                <h3 className="font-semibold mb-2">Aggregate Indices (Broad Market)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Investment Grade</div>
                    {getSpreadBadge(testResult.data.investment_grade, 125)}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">High Yield</div>
                    {getSpreadBadge(testResult.data.high_yield, 400)}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div>Last Updated: {new Date(testResult.data.last_updated).toLocaleString()}</div>
                <div>Data Source: {testResult.data.source.toUpperCase()}</div>
                <div>
                  Coverage: Full AAA-to-CCC spectrum from Bank of America Merrill Lynch (BAML) indices
                </div>
              </div>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Enhanced Coverage Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Granular Risk Pricing:</strong> Precise assessment across full credit spectrum</li>
              <li>• <strong>Climate Payer Analysis:</strong> Match utilities (A-BBB) and renewable developers (BB-B)</li>
              <li>• <strong>Credit Migration Detection:</strong> Track payer credit quality changes over time</li>
              <li>• <strong>Market Stress Indicators:</strong> Early warning system for sector-wide credit deterioration</li>
              <li>• <strong>Institutional Validation:</strong> Professional-grade credit spread curve analysis</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCreditSpreadsTest;
