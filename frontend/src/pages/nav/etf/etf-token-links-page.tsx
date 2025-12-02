/**
 * ETF Token Links Page
 * Project-level view of ETF-token connections
 * Following MMF Token Links page pattern
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { ETFNavigation } from '@/components/nav/etf'
import { useTokenProjectContext } from '@/hooks/project'
import { Link as LinkIcon, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TokenLinkDialog } from '@/components/nav/etf/calculator'
import { etfService } from '@/services/nav/etfService'
import { useQuery } from '@tanstack/react-query'

// Component to show token link status for a single ETF
function ETFTokenLinkRow({ 
  etf, 
  projectId, 
  onLinkClick 
}: { 
  etf: any; 
  projectId: string;
  onLinkClick: (fundId: string, fundName: string) => void;
}) {
  const [tokenLinksCount, setTokenLinksCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchTokenLinks = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/nav/etf/${etf.id}/token-links?project_id=${projectId}`,
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
  }, [etf.id, projectId])
  
  const isConnected = tokenLinksCount > 0
  
  const handleClick = () => {
    if (!isConnected) {
      // Open token link dialog for not connected ETFs
      onLinkClick(etf.id, etf.fund_name || etf.fund_ticker || 'ETF')
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
            {etf.fund_name || etf.fund_ticker || 'Unnamed ETF'}
          </p>
          <p className="text-sm text-muted-foreground">
            {etf.fund_type || 'Unknown Type'} • 
            {etf.expense_ratio ? ` ${(etf.expense_ratio * 100).toFixed(2)}%` : ' N/A'}
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
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
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

export default function ETFTokenLinksPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  const projectId = urlProjectId || contextProjectId
  
  // Token link dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFundId, setSelectedFundId] = useState<string>('')
  const [selectedFundName, setSelectedFundName] = useState<string>('')

  // Fetch ETFs for selector
  const { data: etfsData, refetch } = useQuery({
    queryKey: ['etf-products', projectId],
    queryFn: () => etfService.getETFProducts(projectId!),
    enabled: !!projectId,
  })
  const etfs = etfsData?.data || []

  const handleRefresh = () => {
    refetch()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/etf/token-links`)
    }
  }

  const handleLinkClick = (fundId: string, fundName: string) => {
    setSelectedFundId(fundId)
    setSelectedFundName(fundName)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedFundId('')
    setSelectedFundName('')
    // Refresh data to show new link
    refetch()
  }

  if (!projectId) {
    return (
      <>
        <NavDashboardHeaderEnhanced
          projectId={projectId}
          projectName={project?.name}
          title="ETF Token Links"
          subtitle="Please select a project to view token links"
          isLoading={isLoadingProject}
        />
        <NavNavigation projectId={projectId} />
        <ETFNavigation projectId={projectId} />
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              Please select a project to view token links
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
        title="ETF Token Links"
        subtitle="Connect ETFs to blockchain tokens for on-chain NAV updates"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Navigation */}
      <NavNavigation projectId={projectId} />
      <ETFNavigation projectId={projectId} />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <LinkIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{etfs.length}</p>
                <p className="text-sm text-muted-foreground">Total ETFs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {etfs.filter(e => e.token_links && e.token_links.length > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {etfs.filter(e => !e.token_links || e.token_links.length === 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Not Connected</p>
              </div>
            </div>
          </div>
        </div>

        {/* ETF List */}
        {etfs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">
              No ETFs found. Create an ETF to link tokens.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            <div className="p-4 bg-gray-50">
              <h3 className="font-semibold text-lg">ETF Token Connections</h3>
              <p className="text-sm text-muted-foreground">
                Click on unconnected ETFs to link a token
              </p>
            </div>
            {etfs.map((etf) => (
              <ETFTokenLinkRow 
                key={etf.id} 
                etf={etf} 
                projectId={projectId}
                onLinkClick={handleLinkClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Token Link Dialog */}
      <TokenLinkDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onClose={handleDialogClose}
        fundId={selectedFundId}
        fundName={selectedFundName}
        projectId={projectId}
        tokens={[]} // TODO: Fetch available tokens from project
      />
    </>
  )
}
