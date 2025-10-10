/**
 * Bonds List Page
 * Main page for viewing and managing all bonds in a project
 */

import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BondListTable } from '@/components/nav/bonds/data-management/bond-list-table'
import { useTokenProjectContext } from '@/hooks/project'

export default function BondsListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId: contextProjectId, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from context or URL
  const projectId = contextProjectId || searchParams.get('projectId')

  const handleSelectBond = (bondId: string) => {
    navigate(`/nav/bonds/${bondId}`)
  }

  const handleEditBond = (bondId: string) => {
    navigate(`/nav/bonds/${bondId}/edit`)
  }

  const handleCalculateNAV = (bondId: string) => {
    navigate(`/nav/bonds/${bondId}/calculate`)
  }

  const handleAddNewBond = () => {
    navigate('/nav/bonds/new')
  }

  const handleBulkUpload = () => {
    navigate('/nav/bonds/upload')
  }

  if (isLoadingProject) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">No Project Selected</CardTitle>
            <CardDescription className="text-yellow-600">
              Please select a project from the dropdown to view bonds.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bonds Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage bond holdings for NAV calculations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUpload}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button
              size="sm"
              onClick={handleAddNewBond}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bond
            </Button>
          </div>
        </div>
      </div>

      {/* Bonds Table */}
      <BondListTable
        projectId={projectId}
        onSelect={handleSelectBond}
        onEdit={handleEditBond}
        onCalculate={handleCalculateNAV}
      />
    </div>
  )
}
