/**
 * MMF Analytics Page
 * Liquidity and compliance analytics dashboard
 * Following Bonds page pattern
 */

import { useNavigate, useParams } from 'react-router-dom'

import { MMFNavigation, WAMWALChart, LiquidityGauge, DeviationHistory } from '@/components/nav/mmf'
import { NavNavigation } from '@/components/nav'
import { CombinedOrgProjectSelector } from '@/components/organizations'
import { useTokenProjectContext } from '@/hooks/project'
import { useMMFs } from '@/hooks/mmf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

export default function MMFAnalyticsPage() {
  const navigate = useNavigate()
  const { fundId: urlFundId, projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId
  const [selectedFundId, setSelectedFundId] = useState<string>(urlFundId || '')

  // Fetch MMFs for selector
  const { data: mmfsData } = useMMFs(projectId!)
  const mmfs = mmfsData?.data || []

  // Set default fund if not specified
  if (!selectedFundId && mmfs.length > 0) {
    setSelectedFundId(mmfs[0].id)
  }

  if (!projectId) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium mb-4">
              Please select a project to view analytics
            </p>
            <CombinedOrgProjectSelector />
          </div>
        </div>
      </>
    )
  }

  if (mmfs.length === 0) {
    return (
      <>
        <NavNavigation projectId={projectId} />
        <MMFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No money market funds found. Create one to view analytics.
            </p>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MMF Analytics</h1>
            <p className="text-muted-foreground">
              Liquidity and compliance monitoring
            </p>
          </div>
          
          {/* Fund Selector */}
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector />
            <Select value={selectedFundId} onValueChange={setSelectedFundId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select fund" />
              </SelectTrigger>
              <SelectContent>
                {mmfs.map((mmf) => (
                  <SelectItem key={mmf.id} value={mmf.id}>
                    {mmf.fund_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {selectedFundId && (
          <div className="grid gap-6">
            {/* Liquidity Gauge */}
            <LiquidityGauge fundId={selectedFundId} />

            {/* WAM/WAL Chart */}
            <WAMWALChart fundId={selectedFundId} days={30} />

            {/* Deviation History */}
            <DeviationHistory fundId={selectedFundId} />
          </div>
        )}
      </div>
    </>
  )
}
