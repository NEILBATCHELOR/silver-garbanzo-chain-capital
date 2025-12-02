/**
 * ETF Detail Page
 * Detailed view of a single ETF product with full analytics
 * Enhanced to match MMF pattern with proper navigation and components
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator, Edit, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { ETFNavigation, ProductDetails } from '@/components/nav/etf'
import { useTokenProjectContext } from '@/hooks/project'
import { etfService } from '@/services/nav/etfService'
import type { ETFProduct } from '@/types/nav/etf'

export default function ETFDetailPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  // Product state
  const [product, setProduct] = useState<ETFProduct | null>(null)
  const [holdings, setHoldings] = useState<any[]>([])
  const [isLoadingProduct, setIsLoadingProduct] = useState(true)
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true)
  const [productError, setProductError] = useState<string | null>(null)

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

  // Load ETF holdings
  useEffect(() => {
    if (!fundId) return

    const loadHoldings = async () => {
      try {
        setIsLoadingHoldings(true)
        const response = await etfService.getHoldings(fundId)
        
        if (response.success && response.data) {
          setHoldings(response.data)
        }
      } catch (error) {
        console.error('Failed to load holdings:', error)
      } finally {
        setIsLoadingHoldings(false)
      }
    }

    loadHoldings()
  }, [fundId])

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf`)
    } else {
      navigate('/nav/etf')
    }
  }

  const handleEdit = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${fundId}/edit`)
    } else {
      navigate(`/nav/etf/${fundId}/edit`)
    }
  }

  const handleCalculate = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${fundId}/calculate`)
    } else {
      navigate(`/nav/etf/${fundId}/calculate`)
    }
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
          title="Exchange-Traded Funds"
          subtitle="ETF Details"
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

  if (isLoadingProduct || isLoadingHoldings || isLoadingProject) {
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
          title="Exchange-Traded Funds"
          subtitle="ETF Details"
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
            <Button variant="outline" onClick={handleBack}>
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
        title={product.fund_name}
        subtitle={`${product.fund_ticker} • ETF Details`}
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={true}
        onCalculateNav={handleCalculate}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* ETF-specific Sub-navigation */}
      <ETFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to ETFs
        </Button>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit ETF
          </Button>
          <Button onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Calculate NAV
          </Button>
        </div>

        {/* Product Details Component */}
        <ProductDetails
          product={product}
          projectId={projectId}
          holdings={holdings}
        />
      </div>
    </>
  )
}
