/**
 * Bond Calculator Page
 * Page for calculating NAV for a specific bond (database mode)
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BondCalculatorForm } from '@/components/nav/bonds/calculator/bond-calculator-form'
import { CalculationResults } from '@/components/nav/bonds/calculator/calculation-results'
import { CalculationBreakdown } from '@/components/nav/bonds/calculator/calculation-breakdown'
import { RiskMetricsPanel } from '@/components/nav/bonds/calculator/risk-metrics-panel'
import { useBond } from '@/hooks/bonds/useBondData'
import type { NAVResult } from '@/types/nav/bonds'

export default function BondCalculatorPage() {
  const navigate = useNavigate()
  const { bondId } = useParams<{ bondId: string }>()
  const [result, setResult] = useState<NAVResult | null>(null)

  const { data: bondData, isLoading, error } = useBond(bondId || '')

  const handleBack = () => {
    navigate(`/nav/bonds/${bondId}`)
  }

  const handleBackToList = () => {
    navigate('/nav/bonds')
  }

  const handleNewCalculation = () => {
    setResult(null)
  }

  const handleSuccess = (calculationResult: NAVResult) => {
    setResult(calculationResult)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Bond</CardTitle>
            <CardDescription className="text-red-600">
              {error.message || 'Failed to load bond for calculation. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bond
              </Button>
              <Button variant="outline" onClick={handleBackToList}>
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!bondId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">No Bond Selected</CardTitle>
            <CardDescription className="text-yellow-600">
              Please select a bond from the list to calculate NAV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const bond = bondData?.data

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bond
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Calculator className="h-6 w-6 mr-2" />
              Calculate NAV
            </h1>
            {bond?.asset_name && (
              <p className="text-muted-foreground">
                {bond.asset_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Calculator or Results */}
      {!result ? (
        <BondCalculatorForm
          bondId={bondId}
          bondName={bond?.asset_name || ''}
          currentAccountingMethod={bond?.accounting_treatment}
          onSuccess={handleSuccess}
        />
      ) : (
        <div className="space-y-6">
          {/* Results Display */}
          <CalculationResults
            result={result}
            bondName={bond?.asset_name || ''}
            onNewCalculation={handleNewCalculation}
          />

          {/* Breakdown (if available) */}
          {result.breakdown && (
            <CalculationBreakdown
              breakdown={result.breakdown}
            />
          )}

          {/* Risk Metrics (if available) */}
          {result.riskMetrics && (
            <RiskMetricsPanel
              metrics={result.riskMetrics}
            />
          )}

          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex space-x-2">
                <Button onClick={handleNewCalculation}>
                  <Calculator className="h-4 w-4 mr-2" />
                  New Calculation
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Back to Bond Details
                </Button>
                <Button variant="outline" onClick={handleBackToList}>
                  Back to List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
