/**
 * ETF Bulk Upload Page
 * Page for uploading holdings to an existing ETF via CSV
 * Following MMF Upload page pattern
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HoldingsImport } from '@/components/nav/etf/data-input'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { ETFNavigation } from '@/components/nav/etf'
import { useTokenProjectContext } from '@/hooks/project'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { etfService } from '@/services/nav/etfService'
import { useQuery } from '@tanstack/react-query'

export default function ETFUploadPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // State for selected ETF
  const [selectedFundId, setSelectedFundId] = useState<string>('')

  // Fetch ETFs for selector
  const { data: etfsData, isLoading: isLoadingETFs } = useQuery({
    queryKey: ['etf-products', projectId],
    queryFn: () => etfService.getETFProducts(projectId!),
    enabled: !!projectId,
  })
  const etfs = etfsData?.data || []

  const handleUploadComplete = () => {
    toast({
      title: 'Upload Successful',
      description: 'Holdings have been uploaded successfully',
      variant: 'default',
    })
    
    // Navigate back to ETF detail page after successful upload
    if (projectId && selectedFundId) {
      navigate(`/projects/${projectId}/nav/etf/${selectedFundId}`)
    } else if (selectedFundId) {
      navigate(`/nav/etf/${selectedFundId}`)
    }
  }

  const handleCancel = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/etf`)
    } else {
      navigate('/nav/etf')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/upload`)
      setSelectedFundId('') // Reset fund selection when project changes
    }
  }

  if (isLoadingProject) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="container mx-auto px-6 py-8">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="Upload ETF Holdings"
          subtitle="Please select a project to upload holdings"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              Please select a project to upload holdings
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Upload ETF Holdings"
        subtitle="Import holdings data via CSV"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />
      <NavNavigation projectId={projectId} />
      <ETFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Fund Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select ETF</CardTitle>
              <CardDescription>
                Choose the ETF to which you want to upload holdings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ETF..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingETFs ? (
                    <SelectItem value="loading" disabled>Loading ETFs...</SelectItem>
                  ) : etfs.length === 0 ? (
                    <SelectItem value="none" disabled>No ETFs found</SelectItem>
                  ) : (
                    etfs.map((etf) => (
                      <SelectItem key={etf.id} value={etf.id}>
                        {etf.fund_name || etf.fund_ticker} ({etf.fund_type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Upload Component */}
          {selectedFundId ? (
            <HoldingsImport
              product={etfs.find(e => e.id === selectedFundId)!}
              onSuccess={handleUploadComplete}
              onCancel={handleCancel}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Please select an ETF to begin uploading holdings
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
