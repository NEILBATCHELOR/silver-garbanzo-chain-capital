/**
 * MMF Bulk Upload Page
 * Page for uploading holdings to an existing Money Market Fund via CSV
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MMFCsvUpload } from '@/components/nav/mmf/data-input'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { MMFNavigation } from '@/components/nav/mmf'
import { useTokenProjectContext } from '@/hooks/project'
import { useToast } from '@/components/ui/use-toast'
import { useMMFs } from '@/hooks/mmf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MMFUploadPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // State for selected MMF
  const [selectedFundId, setSelectedFundId] = useState<string>('')

  // Fetch MMFs for selector
  const { data: mmfsData, isLoading: isLoadingMMFs } = useMMFs(projectId!)
  const mmfs = mmfsData?.data || []

  // Set default fund if not specified
  useEffect(() => {
    if (!selectedFundId && mmfs.length > 0) {
      setSelectedFundId(mmfs[0].id)
    }
  }, [selectedFundId, mmfs])

  const handleUploadComplete = () => {
    toast({
      title: 'Upload Successful',
      description: 'Holdings have been uploaded successfully',
      variant: 'default',
    })
    
    // Navigate back to MMF detail page after successful upload
    if (projectId && selectedFundId) {
      navigate(`/projects/${projectId}/nav/mmf/${selectedFundId}`)
    } else if (selectedFundId) {
      navigate(`/nav/mmf/${selectedFundId}`)
    }
  }

  const handleCancel = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf`)
    } else {
      navigate('/nav/mmf')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/upload`)
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
          title="Bulk Upload MMF Holdings"
          subtitle="Upload holdings to an existing Money Market Fund via CSV"
          onRefresh={handleRefresh}
          isLoading={false}
          showCalculateNav={false}
          showAddButtons={false}
        />
        
        <NavNavigation />
        <MMFNavigation />

        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to upload holdings.
            </p>
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
        title="Bulk Upload MMF Holdings"
        subtitle="Upload holdings to an existing Money Market Fund via CSV"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* MMF-specific Sub-navigation */}
      <MMFNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Fund Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Money Market Fund</CardTitle>
            <CardDescription>
              Choose which MMF you want to upload holdings to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMMFs ? (
              <div className="text-sm text-muted-foreground">Loading MMFs...</div>
            ) : mmfs.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No MMFs found. Please create an MMF first before uploading holdings.
              </div>
            ) : (
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Money Market Fund" />
                </SelectTrigger>
                <SelectContent>
                  {mmfs.map((mmf) => (
                    <SelectItem key={mmf.id} value={mmf.id}>
                      {mmf.fund_name} ({mmf.fund_ticker || mmf.id.slice(0, 8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* CSV Upload Component - Only show when fund is selected */}
        {selectedFundId && (
          <MMFCsvUpload
            fundId={selectedFundId}
            fundCurrency={mmfs.find(m => m.id === selectedFundId)?.currency || 'USD'}
            onSuccess={handleUploadComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </>
  )
}
