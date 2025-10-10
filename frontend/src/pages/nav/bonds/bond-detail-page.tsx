/**
 * Bond Detail Page
 * Comprehensive view of a single bond with all data and tabs
 */

import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BondDetailView } from '@/components/nav/bonds/data-management/bond-detail-view'
import { useBond } from '@/hooks/bonds/useBondData'

export default function BondDetailPage() {
  const navigate = useNavigate()
  const { bondId } = useParams<{ bondId: string }>()

  const { data: bondData, isLoading, error } = useBond(bondId || '')

  const handleBack = () => {
    navigate('/nav/bonds')
  }

  const handleEdit = (id: string) => {
    navigate(`/nav/bonds/${id}/edit`)
  }

  const handleCalculate = (id: string) => {
    navigate(`/nav/bonds/${id}/calculate`)
  }

  const handleDelete = async (id: string) => {
    // Deletion is handled by BondDetailView component
    // After successful deletion, navigate back to list
    navigate('/nav/bonds')
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
              {error.message || 'Failed to load bond details. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
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
              Please select a bond from the list to view details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bonds
        </Button>
      </div>

      {/* Bond Detail View Component */}
      <BondDetailView
        bondId={bondId}
        onBack={handleBack}
        onEdit={handleEdit}
        onCalculate={handleCalculate}
      />
    </div>
  )
}
