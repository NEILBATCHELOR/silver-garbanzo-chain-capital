/**
 * ETF Calculator Page
 * NAV calculation interface for exchange-traded funds
 * Enhanced to match MMF pattern with proper navigation hierarchy
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ETFCalculatorForm,
  CalculationResults,
  PremiumDiscountPanel,
  TrackingMetricsPanel,
  CryptoMetricsPanel,
  ETFNavigation,
} from '@/components/nav/etf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import { etfService } from '@/services/nav/etfService'
import type { ETFProduct, ETFCalculationResult } from '@/types/nav/etf'

export default function ETFCalculatorPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  // Product state
  const [product, setProduct] = useState<ETFProduct | null>(null)
  const [isLoadingProduct, setIsLoadingProduct] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)

  // Calculation result state
  const [calculationResult, setCalculationResult] = useState<ETFCalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Load ETF product
  useEffect(() => {
    if (!fundId) return

    const loadProduct = async () => {
      try {
        setIsLoadingProduct(true)
        const response = await etfService.getETFProduct(fundId)
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load ETF product')
        }

        setProduct(response.data)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setProductError(message)
      } finally {
        setIsLoadingProduct(false)
      }
    }

    loadProduct()
  }, [fundId])

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${fundId}`)
    } else {
      navigate(`/nav/etf/${fundId}`)
    }
  }

  const handleBackToList = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf`)
    } else {
      navigate('/nav/etf')
    }
  }

  const handleCalculationComplete = (result: ETFCalculationResult) => {
    setCalculationResult(result)
    setIsCalculating(false)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf`)
    }
  }

  if (!fundId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF Calculator"
          subtitle="Calculate NAV"
          onRefresh={handleRefresh}
          onProjectChange={handleProjectChange}
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>ETF ID is required</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  if (isLoadingProduct || isLoadingProject) {
    return (
      <>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="container mx-auto px-6 py-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </>
    )
  }

  if (productError || !product) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF Calculator"
          subtitle="Calculate NAV"
          onRefresh={handleRefresh}
          onProjectChange={handleProjectChange}
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Error Loading ETF</AlertTitle>
            <AlertDescription>
              {productError || 'ETF product not found'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to ETF List
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title={`${product.fund_name} - NAV Calculator`}
        subtitle={`${product.fund_ticker} • Calculate Net Asset Value`}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* ETF-specific Sub-navigation */}
      <ETFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
          <span className="text-muted-foreground">|</span>
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            All ETFs
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Calculator Form */}
          <div>
            <ETFCalculatorForm
              product={product}
              onSuccess={handleCalculationComplete}
              onError={(error) => {
                setIsCalculating(false)
                console.error('Calculation error:', error)
              }}
            />
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {calculationResult ? (
              <>
                <CalculationResults result={calculationResult} product={product} />
                
                {calculationResult.marketPrice && (
                  <PremiumDiscountPanel
                    result={calculationResult}
                    product={product}
                  />
                )}

                {calculationResult.trackingError !== undefined && (
                  <TrackingMetricsPanel
                    result={calculationResult}
                    product={product}
                  />
                )}

                {calculationResult.cryptoMetrics && (
                  <CryptoMetricsPanel
                    metrics={calculationResult.cryptoMetrics}
                    product={product}
                  />
                )}
              </>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  {isCalculating 
                    ? 'Calculating NAV...' 
                    : 'Run calculation to see results'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
