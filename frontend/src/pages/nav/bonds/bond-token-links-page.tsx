/**
 * Bond Token Links Page
 * Project-level view of bond-token connections
 */

import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavNavigation, NavDashboardHeaderEnhanced } from '@/components/nav'
import { BondNavigation } from '@/components/nav/bonds'
import { useTokenProjectContext } from '@/hooks/project'
import { useBonds } from '@/hooks/bonds/useBondData'
import { Link as LinkIcon, CheckCircle2, XCircle, Plus, Table as TableIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenLinkDialog } from '@/components/nav/bonds/calculator/token-link-dialog'
import { TokenLinksTable } from '@/components/nav/bonds/calculator/token-links-table'

// Component to show token link status for a single bond
function BondTokenLinkRow({ 
  bond, 
  projectId, 
  onLinkClick 
}: { 
  bond: any; 
  projectId: string;
  onLinkClick: (bondId: string, bondName: string) => void;
}) {
  // Fetch token links from the new API
  const [tokenLinksCount, setTokenLinksCount] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchTokenLinks = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/nav/token-links?bond_id=${bond.id}&project_id=${projectId}`,
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
  }, [bond.id, projectId])
  
  const isConnected = tokenLinksCount > 0
  
  const handleClick = () => {
    if (!isConnected) {
      // Open token link dialog for not connected bonds
      onLinkClick(bond.id, bond.asset_name || bond.cusip || bond.isin || 'Bond')
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
            {bond.asset_name || bond.cusip || bond.isin || 'Unnamed Bond'}
          </p>
          <p className="text-sm text-muted-foreground">
            {bond.issuer_name || 'Unknown Issuer'} • {bond.coupon_rate ? `${(bond.coupon_rate * 100).toFixed(2)}%` : 'N/A'}
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
                    onLinkClick(bond.id, bond.asset_name || bond.cusip || bond.isin || 'Bond')
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

export default function BondTokenLinksPage() {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams()
  const { projectId: contextProjectId, project, isLoading: isLoadingProject } = useTokenProjectContext()
  
  // Dialog state
  const [tokenLinkDialogOpen, setTokenLinkDialogOpen] = useState(false)
  const [selectedBond, setSelectedBond] = useState<{ id: string; name: string } | null>(null)

  // Get project ID from URL param or context
  const projectId = urlProjectId || contextProjectId

  // Fetch all bonds for this project
  const { data: bondsData, isLoading: isLoadingBonds, refetch: refetchBonds } = useBonds(projectId || '')
  
  const handleLinkClick = (bondId: string, bondName: string) => {
    setSelectedBond({ id: bondId, name: bondName })
    setTokenLinkDialogOpen(true)
  }
  
  const handleLinkSuccess = () => {
    // Refetch bonds to update token link counts
    refetchBonds()
  }

  const handleRefresh = () => {
    refetchBonds()
  }

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      navigate(`/projects/${newProjectId}/nav/bonds/token-links`)
    }
  }

  if (isLoadingProject || isLoadingBonds) {
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
          title="Bond-Token Links"
          subtitle="View and manage connections between bonds and tokens"
          onRefresh={handleRefresh}
          isLoading={false}
          showCalculateNav={false}
          showAddButtons={false}
        />
        
        <NavNavigation />
        <BondNavigation />

        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium">No Project Selected</p>
            <p className="text-yellow-600 text-sm mt-2">
              Please select a project from the dropdown above to view bond-token links.
            </p>
          </div>
        </div>
      </>
    )
  }

  const bonds = bondsData?.data || []

  return (
    <>
      {/* Enhanced Header */}
      <NavDashboardHeaderEnhanced
        projectId={projectId}
        projectName={project?.name}
        title="Bond-Token Links"
        subtitle="Manage connections between bonds and tokenized assets"
        onRefresh={handleRefresh}
        onProjectChange={handleProjectChange}
        isLoading={isLoadingProject}
        showCalculateNav={false}
        showAddButtons={false}
      />

      {/* Top-level NAV Navigation */}
      <NavNavigation projectId={projectId} />

      {/* Bond-specific Sub-navigation */}
      <BondNavigation projectId={projectId} />

      <div className="container mx-auto px-6 py-8 space-y-6">
        {bonds.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No Bonds Found</p>
            <p className="text-gray-500 text-sm mt-2">
              Add bonds to create token connections
            </p>
          </div>
        ) : (
          <>
            {/* Tabbed View */}
            <Tabs defaultValue="bonds" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bonds">
                  Bonds Overview
                </TabsTrigger>
                <TabsTrigger value="links">
                  <TableIcon className="h-4 w-4 mr-2" />
                  All Token Links
                </TabsTrigger>
              </TabsList>

              {/* Bonds List Tab */}
              <TabsContent value="bonds" className="space-y-6">
                {/* Bonds List with Token Connection Status */}
                <div className="bg-white rounded-lg border">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">All Bonds</h3>
                    <p className="text-sm text-muted-foreground">
                      Click "Link Token" button on unconnected bonds to create token connections
                    </p>
                  </div>
                  <div className="divide-y">
                    {bonds.map((bond) => (
                      <BondTokenLinkRow 
                        key={bond.id} 
                        bond={bond} 
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
                      <p className="text-blue-800 font-medium">💡 How Token Connections Work</p>
                      <p className="text-blue-600 text-sm mt-2">
                        Token connections allow you to link bonds to tokenized assets, set parity ratios, 
                        and automatically update token valuations based on bond NAV calculations. Each bond can 
                        be linked to multiple tokens with different ratios for fractional ownership or derivative products.
                      </p>
                      <ul className="text-blue-600 text-sm mt-2 space-y-1 list-disc list-inside">
                        <li>Link multiple tokens to a single bond</li>
                        <li>Set custom parity ratios (e.g., 1:1, 100:1)</li>
                        <li>Set collateralization percentages (e.g., 100%, 150%)</li>
                        <li>Automatic NAV propagation to linked tokens</li>
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
                      View, edit, and manage all bond-token connections for this project
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
      {selectedBond && projectId && (
        <TokenLinkDialog
          open={tokenLinkDialogOpen}
          onOpenChange={setTokenLinkDialogOpen}
          bondId={selectedBond.id}
          bondName={selectedBond.name}
          projectId={projectId}
          onSuccess={handleLinkSuccess}
        />
      )}
    </>
  )
}
