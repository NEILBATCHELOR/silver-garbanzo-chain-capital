/**
 * MMF Add Page
 * Create new money market fund
 * Following Bonds page pattern
 */

import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MMFProductForm, MMFNavigation } from '@/components/nav/mmf'
import { NavNavigation } from '@/components/nav'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'
import type { MMFProduct } from '@/types/nav/mmf'

export default function MMFAddPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  if (!projectId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium mb-4">
              Please select a project to create a Money Market Fund
            </p>
            <CombinedOrgProjectSelector />
          </div>
        </div>
      </>
    )
  }

  const handleSuccess = (mmf: MMFProduct) => {
    // Navigate to the new MMF's detail page
    navigate(`/projects/${projectId}/nav/mmf/${mmf.id}`)
  }

  const handleCancel = () => {
    // Navigate back to MMF list
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf`)
    } else {
      navigate('/nav/mmf')
    }
  }

  return (
    <>
      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Money Market Fund</h1>
            <p className="text-muted-foreground">
              Add a new money market fund to your project
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex justify-end">
          <CombinedOrgProjectSelector />
        </div>

        {/* MMF Form */}
        <div className="max-w-4xl">
          <MMFProductForm
            projectId={projectId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </>
  )
}
