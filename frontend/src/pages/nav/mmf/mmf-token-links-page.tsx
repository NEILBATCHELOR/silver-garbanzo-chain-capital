/**
 * MMF Token Links Page
 * Project-level view of MMF-token connections
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { MMFNavigation } from '@/components/nav/mmf'
import { useTokenProjectContext } from '@/hooks/project'
import { useMMFs } from '@/hooks/mmf/useMMFData'
import { Link as LinkIcon, CheckCircle2, XCircle, Plus, Table as TableIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenLinkDialog, TokenLinksTable } from '@/components/nav/mmf/calculator'

// Component to show token link status for a single MMF
function MMFTokenLinkRow({ 
  mmf, 
  projectId, 
  onLinkClick 
}: { 
  mmf: any; 
  projectId: string;
  onLinkClick: (fundId: string, fundName: string) => void;
}) {
  const [tokenLinksCount, setTokenLinksCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchTokenLinks = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/nav/mmf/${mmf.id}/token-links?project_id=${projectId}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const result = await response.json()
          setTokenLinksCount(result.data?.length || 0)
        }
      } catch (error) {
        console.error('Failed to fetch token links:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenLinks()
  }, [mmf.id, projectId])
  
  const isConnected = tokenLinksCount > 0
  
  const handleClick = () => {
    if (!isConnected) {
      // Open token link dialog for not connected MMFs
      onLinkClick(mmf.id, mmf.fund_name || mmf.fund_ticker || 'MMF')
    }
  }
  
  return (
    <div
      onClick={handleClick}
      className={`p-4 transition-colors ${!isConnected ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">
            {mmf.fund_name || mmf.fund_ticker || 'Unnamed MMF'}
          </p>
          <p className="text-sm text-muted-foreground">
            {mmf.fund_type || 'Unknown Type'} • 
            {mmf.expense_ratio ? ` ${(mmf.expense_ratio * 100).toFixed(2)}%` : ' N/A'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {isLoading ? '...' : tokenLinksCount}
            </p>
            <p className="text-xs text-muted-foreground">Linked Tokens</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-orange-500" />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLinkClick(mmf.id, mmf.fund_name || mmf.fund_ticker || 'MMF')
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Link Token
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MMFTokenLinksPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  // Dialog state
  const [tokenLinkDialogOpen, setTokenLinkDialogOpen] = useState(false)
  const [selectedMMF, setSelectedMMF] = useState<{ id: string; name: string } | null>(null)

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch all MMFs for this project
  const { data: mmfsData, isLoading: isLoadingMMFs, refetch: refetchMMFs } = useMMFs(projectId || '')
  
  const handleLinkClick = (fundId: string, fundName: string) => {
    setSelectedMMF({ id: fundId, name: fundName })
    setTokenLinkDialogOpen(true)
  }
  
  const handleLinkSuccess = () => {
    // Refetch MMFs to update token link counts
    refetchMMFs()
  }

  const handleRefresh = () => {
    refetchMMFs()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/mmf/token-links`)
    }
  }

  if (isLoadingProject || isLoadingMMFs) {
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
          title="MMF-Token Links"
          subtitle="View and manage connections between Money Market Funds and tokens"
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
              Please select a project from the dropdown above to view MMF-token links.
            </p>
          </div>
        </div>
      </>
    )
  }

  const mmfs = mmfsData?.data || []

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="MMF-Token Links"
        subtitle="Manage connections between Money Market Funds and tokenized assets"
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
        {mmfs.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No Money Market Funds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add MMFs to create token connections
            </p>
          </div>
        ) : (
          <>
            {/* Tabbed View */}
            <Tabs defaultValue="mmfs" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mmfs">
                  MMFs Overview
                </TabsTrigger>
                <TabsTrigger value="links">
                  <TableIcon className="h-4 w-4 mr-2" />
                  All Token Links
                </TabsTrigger>
              </TabsList>

              {/* MMFs List Tab */}
              <TabsContent value="mmfs" className="space-y-6">
                {/* MMFs List with Token Connection Status */}
                <div className="bg-white rounded-lg border">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">All Money Market Funds</h3>
                    <p className="text-sm text-muted-foreground">
                      Click "Link Token" button on unconnected MMFs to create token connections
                    </p>
                  </div>
                  <div className="divide-y">
                    {mmfs.map((mmf) => (
                      <MMFTokenLinkRow 
                        key={mmf.id} 
                        mmf={mmf} 
                        projectId={projectId} 
                        onLinkClick={handleLinkClick}
                      />
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-blue-800 font-medium">💡 How MMF Token Connections Work</p>
                      <p className="text-blue-600 text-sm mt-2">
                        Token connections allow you to link MMFs to tokenized shares, set parity ratios for 
                        fractional ownership, and automatically update token valuations based on stable NAV and 
                        shadow NAV calculations. This enables digital asset representations of money market funds.
                      </p>
                      <ul className="text-blue-600 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>Link multiple tokens to a single MMF</li>
                        <li>Set custom share-to-token ratios (e.g., 1:1, 1000:1)</li>
                        <li>Track stable NAV ($1.00 target) and shadow NAV</li>
                        <li>Monitor breaking the buck events automatically</li>
                        <li>Automatic NAV propagation to linked tokens daily</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* All Token Links Table Tab */}
              <TabsContent value="links" className="space-y-6">
                <div className="bg-white rounded-lg border p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">All Token Links</h3>
                    <p className="text-sm text-muted-foreground">
                      View, edit, and manage all MMF-token connections for this project
                    </p>
                  </div>
                  <TokenLinksTable 
                    projectId={projectId} 
                    onRefresh={handleRefresh}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      
      {/* Token Link Dialog */}
      {selectedMMF && projectId && (
        <TokenLinkDialog
          open={tokenLinkDialogOpen}
          onOpenChange={setTokenLinkDialogOpen}
          fundId={selectedMMF.id}
          fundName={selectedMMF.name}
          projectId={projectId}
          onSuccess={handleLinkSuccess}
        />
      )}
    </>
  )
}
