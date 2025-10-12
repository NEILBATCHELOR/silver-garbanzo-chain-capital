/**
 * Bond Calculator Page
 * NAV calculation interface for bonds
 * Pattern matches ClimateReceivablesManager structure
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BondCalculatorForm,
  CalculationResults,
  CalculationBreakdown,
  RiskMetricsPanel,
  BondNavigation,
} from '@/components/nav/bonds'
import { NavNavigation, NavDashboardHeader } from '@/components/nav'
import { useBond } from '@/hooks/bonds'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'

export default function BondCalculatorPage() {
  const navigate = useNavigate()
  const { bondId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch bond data
  const { data: bond, isLoading, refetch } = useBond(bondId!)

  // Calculation result state
  const [calculationResult, setCalculationResult] = useState<any>(null)

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds/${bondId}`)
    } else {
      navigate(`/nav/bonds/${bondId}`)
    }
  }

  const handleBackToList = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/bonds`)
    } else {
      navigate('/nav/bonds')
    }
  }

  const handleSuccess = (result: any) => {
    setCalculationResult(result)
  }

  const handleNewCalculation = () => {
    setCalculationResult(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  if (!bondId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Invalid Bond ID</p>
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bonds List
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </>
    )
  }

  if (!bond) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <BondNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Bond Not Found</p>
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bonds List
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />
      
      {/* Project Selector */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <CombinedOrgProjectSelector 
            className="w-64"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bond-specific Sub-navigation */}
      <BondNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Dashboard Header */}
        <div className="space-y-4">
          <NavDashboardHeader
            title="Calculate Bond NAV"
            subtitle={`${bond.data.asset_name || bond.data.cusip || bond.data.isin || 'Bond'} | ${bond.data.issuer_name || 'Unknown Issuer'}`}
            onRefresh={handleRefresh}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
            >
              View Bond Details
            </Button>
          </div>
        </div>

        {/* Calculator or Results */}
        {!calculationResult ? (
          <BondCalculatorForm
            bondId={bondId}
            bondName={bond.data.asset_name || bond.data.cusip || bond.data.isin || 'Bond'}
            accountingClassification={bond.data.accounting_treatment}
            onSuccess={handleSuccess}
          />
        ) : (
          <div className="space-y-6">
            {/* Primary Results */}
            <CalculationResults
              result={calculationResult}
              bondName={bond.data.asset_name || bond.data.cusip || bond.data.isin || 'Bond'}
              onNewCalculation={handleNewCalculation}
            />

            {/* Detailed Breakdown */}
            {calculationResult.breakdown && (
              <CalculationBreakdown breakdown={calculationResult.breakdown} />
            )}

            {/* Risk Metrics */}
            {calculationResult.bondMetrics && (
              <RiskMetricsPanel metrics={calculationResult.bondMetrics} />
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bond Details
              </Button>
              <Button
                variant="default"
                onClick={handleNewCalculation}
              >
                Run New Calculation
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
