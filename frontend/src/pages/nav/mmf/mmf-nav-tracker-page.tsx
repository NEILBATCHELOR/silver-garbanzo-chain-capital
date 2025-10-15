/**
 * MMF NAV Tracker Page
 * Daily NAV tracking with calendar view
 * Following Bonds page pattern
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { MMFNavigation, DailyNAVTracker, ShadowNAVMonitor } from '@/components/nav/mmf'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MMFNAVTrackerPage() {
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
              Please select a project to track NAV
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
              No money market funds found. Create one to track NAV.
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
            <h1 className="text-3xl font-bold tracking-tight">NAV Tracker</h1>
            <p className="text-muted-foreground">
              Daily NAV monitoring and deviation tracking
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

        {/* Tracker Tabs */}
        {selectedFundId && (
          <Tabs defaultValue="daily" className="space-y-6">
            <TabsList>
              <TabsTrigger value="daily">Daily Tracker</TabsTrigger>
              <TabsTrigger value="shadow">Shadow NAV Monitor</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-6">
              <DailyNAVTracker fundId={selectedFundId} />
            </TabsContent>

            <TabsContent value="shadow" className="space-y-6">
              <ShadowNAVMonitor fundId={selectedFundId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}
