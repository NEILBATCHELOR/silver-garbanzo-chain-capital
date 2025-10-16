/**
 * MMF Calculator Page
 * NAV calculation interface for money market funds
 * Following Bonds page pattern with enhanced header
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  MMFCalculatorForm,
  CalculationResults,
  LiquidityPanel,
  ComplianceStatus,
  MMFNavigation,
} from '@/components/nav/mmf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useMMF } from '@/hooks/mmf'
import { useTokenProjectContext } from '@/hooks/project'

export default function MMFCalculatorPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  // Fetch MMF data
  const { data: mmfData, isLoading, refetch } = useMMF(fundId!)

  // Calculation result state
  const [calculationResult, setCalculationResult] = useState<any>(null)
  const [configLimits, setConfigLimits] = useState<{
    wamLimit: number
    walLimit: number
    dailyLiquidMinimum: number
    weeklyLiquidMinimum: number
  } | null>(null)

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

  const handleSuccess = (result: any, limits: {
    wamLimit: number
    walLimit: number
    dailyLiquidMinimum: number
    weeklyLiquidMinimum: number
  }) => {
    console.log('=== PAGE RECEIVED ===')
    console.log('Result:', result)
    console.log('Config Limits:', limits)
    setCalculationResult(result)
    setConfigLimits(limits)
  }

  const handleNewCalculation = () => {
    setCalculationResult(null)
    setConfigLimits(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/${fundId}/calculate`)
    }
  }

  if (!fundId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Calculator"
          subtitle="Calculate NAV for Money Market Funds"
          isLoading={isLoadingProject}
        />
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

  if (isLoading || isLoadingProject) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Calculator"
          subtitle="Calculate NAV for Money Market Funds"
          isLoading={true}
        />
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
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="MMF Calculator"
          subtitle="Calculate NAV for Money Market Funds"
          isLoading={isLoadingProject}
        />
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
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Calculate MMF NAV"
        subtitle={`${mmf.fund_name} (${mmf.fund_type})`}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoading || isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            Back to List
          </Button>
        </div>

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
              configLimits={configLimits}
            />

            {/* Compliance Status */}
            <ComplianceStatus 
              complianceStatus={calculationResult.complianceStatus}
              wam={calculationResult.wam}
              wal={calculationResult.wal}
              dailyLiquidPercentage={calculationResult.dailyLiquidPercentage}
              weeklyLiquidPercentage={calculationResult.weeklyLiquidPercentage}
              configLimits={configLimits}
            />
          </div>
        )}
      </div>
    </>
  )
}
