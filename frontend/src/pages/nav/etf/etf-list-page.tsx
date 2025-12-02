/**
 * ETF List Page
 * Main page for viewing and managing all Exchange-Traded Funds in a project
 * Enhanced to match MMF dashboard style
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ETFProductsTable, ETFNavigation } from '@/components/nav/etf'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { useTokenProjectContext } from '@/hooks/project'
import { etfService } from '@/services/nav/etfService'
import type { ETFWithLatestNAV, ETFProduct } from '@/types/nav/etf'
import { toast } from 'sonner'

export default function ETFListPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Products state
  const [products, setProducts] = useState<ETFWithLatestNAV[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  // Fetch products
  useEffect(() => {
    if (!projectId) return

    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const response = await etfService.getETFProducts(projectId)
        
        if (response.success && response.data) {
          setProducts(response.data)
        } else {
          toast.error(response.error || 'Failed to fetch ETF products')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error(message)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [projectId])

  const handleViewDetails = (etf: ETFWithLatestNAV) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${etf.id}`)
    } else {
      navigate(`/nav/etf/${etf.id}`)
    }
  }

  const handleCalculate = (etf: ETFWithLatestNAV) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/${etf.id}/calculate`)
    } else {
      navigate(`/nav/etf/${etf.id}/calculate`)
    }
  }

  const handleAddNewETF = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/create`)
    } else {
      navigate('/nav/etf/create')
    }
  }

  const handleBulkUpload = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf/upload`)
    } else {
      navigate('/nav/etf/upload')
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

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this ETF?')) return

    try {
      const response = await etfService.deleteETFProduct(productId)
      
      if (response.success) {
        toast.success('ETF deleted successfully')
        // Refresh products
        setProducts(prev => prev.filter(p => p.id !== productId))
      } else {
        toast.error(response.error || 'Failed to delete ETF')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(message)
    }
  }

  if (isLoadingProject) {
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

  return (
    <>
      {/* Enhanced Header - Matches MMF/Bonds Style */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Exchange-Traded Funds Management"
        subtitle="View and manage ETF holdings for NAV calculations"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        onAddItem={handleAddNewETF}
        onBulkUpload={handleBulkUpload}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={true}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* ETF-specific Sub-navigation */}
      <ETFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* ETF List Table */}
        {projectId ? (
          <ETFProductsTable
            products={products}
            isLoading={isLoadingProducts}
            onViewDetails={handleViewDetails}
            onCalculate={handleCalculate}
            onCreateNew={handleAddNewETF}
            onDelete={handleDelete}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to view Exchange-Traded Funds.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
