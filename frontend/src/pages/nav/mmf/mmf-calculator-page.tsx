/**
 * MMF Calculator Page
 * NAV calculation interface for money market funds
 * Following Bonds page pattern
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  MMFCalculatorForm,
  CalculationResults,
  LiquidityPanel,
  ComplianceStatus,
  MMFNavigation,
} from '@/components/nav/mmf'
import { NavNavigation, NavDashboardHeader } from '@/components/nav'
import { useMMF } from '@/hooks/mmf'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'

export default function MMFCalculatorPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  // Fetch MMF data
  const { data: mmfData, isLoading, refetch } = useMMF(fundId!)

  // Calculation result state
  const [calculationResult, setCalculationResult] = useState<any>(null)

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/${fundId}`)
    } else {
      navigate(`/nav/mmf/${fundId}`)
    }
  }

  const handleBackToList = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf`)
    } else {
      navigate('/nav/mmf')
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

  if (!fundId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Invalid Fund ID</p>
            <Button variant="outline" onClick={handleBackToList} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MMFs List
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
        <MMFNavigation projectId={projectId} />
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

  if (!mmfData?.data) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Money Market Fund not found</p>
            <Button variant="outline" onClick={handleBackToList} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MMFs List
            </Button>
          </div>
        </div>
      </>
    )
  }

  const mmf = mmfData.data

  return (
    <>
      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Calculate NAV</h1>
                <p className="text-muted-foreground">{mmf.fund_name}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Project Selector */}
        {!projectId && (
          <div className="flex justify-end">
            <CombinedOrgProjectSelector />
          </div>
        )}

        {/* Calculator or Results */}
        {!calculationResult ? (
          <MMFCalculatorForm
            fundId={fundId}
            fundName={mmf.fund_name}
            fundType={mmf.fund_type}
            onSuccess={handleSuccess}
          />
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Calculation Results</h2>
              <Button onClick={handleNewCalculation}>
                New Calculation
              </Button>
            </div>

            {/* Results Display */}
            <CalculationResults 
              result={calculationResult} 
              fundName={mmf.fund_name}
              onNewCalculation={handleNewCalculation}
            />

            {/* Liquidity Panel */}
            <LiquidityPanel 
              dailyLiquidPercentage={calculationResult.dailyLiquidPercentage}
              weeklyLiquidPercentage={calculationResult.weeklyLiquidPercentage}
              wam={calculationResult.wam}
              wal={calculationResult.wal}
            />

            {/* Compliance Status */}
            <ComplianceStatus 
              complianceStatus={calculationResult.complianceStatus}
              wam={calculationResult.wam}
              wal={calculationResult.wal}
              dailyLiquidPercentage={calculationResult.dailyLiquidPercentage}
              weeklyLiquidPercentage={calculationResult.weeklyLiquidPercentage}
            />
          </div>
        )}
      </div>
    </>
  )
}
