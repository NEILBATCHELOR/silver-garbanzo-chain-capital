/**
 * MMF Detail Page
 * Detailed view of a single money market fund
 * Following Bonds page pattern
 */

import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MMFDetailView, MMFNavigation } from '@/components/nav/mmf'
import { NavNavigation } from '@/components/nav'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'
import type { MMFProduct } from '@/types/nav/mmf'

export default function MMFDetailPage() {
  const navigate = useNavigate()
  const { fundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId

  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf`)
    } else {
      navigate('/nav/mmf')
    }
  }

  const handleEdit = (mmf: MMFProduct) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/${mmf.id}/edit`)
    } else {
      navigate(`/nav/mmf/${mmf.id}/edit`)
    }
  }

  const handleCalculate = (mmf: MMFProduct) => {
    if (projectId) {
      navigate(`/projects/${projectId}/nav/mmf/${mmf.id}/calculate`)
    } else {
      navigate(`/nav/mmf/${mmf.id}/calculate`)
    }
  }

  if (!fundId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Invalid Fund ID</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MMFs List
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <MMFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Project Selector */}
        {!projectId && (
          <div className="flex justify-end">
            <CombinedOrgProjectSelector />
          </div>
        )}

        {/* MMF Detail View */}
        <MMFDetailView
          fundId={fundId}
          onBack={handleBack}
          onEdit={handleEdit}
          onCalculate={handleCalculate}
        />
      </div>
    </>
  )
}
