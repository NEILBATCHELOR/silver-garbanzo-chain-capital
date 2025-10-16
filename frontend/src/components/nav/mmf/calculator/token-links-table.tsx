/**
 * MMF Token Links Table Component
 * Displays MMF-token links with full CRUD functionality
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit, Trash, Link2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TokenLinkDialog } from './token-link-dialog'
import { toast } from 'sonner'

interface TokenLink {
  id: string
  mmf_id: string
  token_id: string
  token_name: string
  token_symbol: string
  mmf_name: string
  parity: number
  ratio: number
  effective_date: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
}

interface TokenLinksTableProps {
  projectId: string
  fundId?: string // Optional: filter by MMF
  onRefresh?: () => void
}

export function TokenLinksTable({ projectId, fundId, onRefresh }: TokenLinksTableProps) {
  const [editingLink, setEditingLink] = useState<TokenLink | null>(null)
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Fetch token links
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mmfTokenLinks', projectId, fundId],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: projectId })
      if (fundId) {
        params.append('mmf_id', fundId)
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/nav/mmf/token-links?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch MMF token links')
      }
      
      const result = await response.json()
      return result.data as TokenLink[]
    },
    enabled: !!projectId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const link = data?.find(l => l.token_id === tokenId)
      if (!link) throw new Error('Link not found')

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/nav/mmf/${link.mmf_id}/token-links/${tokenId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete token link')
      }
    },
    onSuccess: () => {
      toast.success('Token link deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['mmfTokenLinks'] })
      refetch()
      onRefresh?.()
      setDeletingLinkId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete token link')
    },
  })

  const handleEdit = (link: TokenLink) => {
    setEditingLink(link)
    setDialogOpen(true)
  }

  const handleDelete = (tokenId: string) => {
    setDeletingLinkId(tokenId)
  }

  const confirmDelete = () => {
    if (deletingLinkId) {
      deleteMutation.mutate(deletingLinkId)
    }
  }

  const handleDialogSuccess = () => {
    refetch()
    onRefresh?.()
    setEditingLink(null)
  }

  const getHealthStatus = (link: TokenLink): {
    status: 'healthy' | 'warning' | 'critical'
    message: string
    icon: typeof CheckCircle2
  } => {
    // Convert ratio to percentage for display
    const collateralPercentage = link.ratio * 100

    if (collateralPercentage < 100) {
      return { status: 'critical', message: 'Under-collateralized', icon: AlertCircle }
    }
    if (collateralPercentage < 110) {
      return { status: 'warning', message: 'Low buffer', icon: AlertCircle }
    }
    return { status: 'healthy', message: 'Well-collateralized', icon: CheckCircle2 }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading token links...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium text-destructive">Error loading token links</p>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
      </div>
    )
  }

  const tokenLinks = data || []

  if (tokenLinks.length === 0) {
    return (
      <div className="text-center py-8">
        <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No token links found</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MMF</TableHead>
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Parity</TableHead>
              <TableHead className="text-right">Collateral %</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokenLinks.map((link) => {
              const health = getHealthStatus(link)
              const HealthIcon = health.icon
              
              return (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{link.mmf_name || 'Unknown MMF'}</div>
                      <div className="text-xs text-muted-foreground">{link.mmf_id.slice(0, 8)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{link.token_name}</div>
                      <div className="text-xs text-muted-foreground">{link.token_symbol}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {link.parity.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {(link.ratio * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {new Date(link.effective_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.status === 'active' ? 'default' : 'secondary'}>
                      {link.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        health.status === 'healthy'
                          ? 'default'
                          : health.status === 'warning'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      <HealthIcon className="h-3 w-3 mr-1" />
                      {health.message}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(link)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(link.token_id)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingLink && (
        <TokenLinkDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingLink(null)
          }}
          fundId={editingLink.mmf_id}
          fundName={editingLink.mmf_name}
          projectId={projectId}
          existingLink={{
            id: editingLink.id,
            tokenId: editingLink.token_id,
            parityRatio: editingLink.parity,
            collateralizationPercentage: editingLink.ratio * 100, // Convert back to percentage
          }}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingLinkId} onOpenChange={() => setDeletingLinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Token Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the MMF-token link. This action cannot be undone.
              NAV updates will no longer propagate to the token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
