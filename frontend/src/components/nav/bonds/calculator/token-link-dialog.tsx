/**
 * Token Link Dialog
 * Dialog for creating/editing bond-token links with parity ratios
 */

import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { useTokens } from '@/hooks/tokens'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface TokenLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bondId: string
  bondName: string
  projectId: string
  existingLink?: {
    id: string
    tokenId: string
    parityRatio: number
    collateralizationPercentage: number
  }
  onSuccess?: () => void
}

export function TokenLinkDialog({
  open,
  onOpenChange,
  bondId,
  bondName,
  projectId,
  existingLink,
  onSuccess,
}: TokenLinkDialogProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>(existingLink?.tokenId || '')
  const [parityRatio, setParityRatio] = useState<string>(
    existingLink?.parityRatio?.toString() || '1.0'
  )
  const [collateralizationPercentage, setCollateralizationPercentage] = useState<string>(
    existingLink?.collateralizationPercentage?.toString() || '100.0'
  )
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Fetch tokens for this project
  const { data: tokens = [], isLoading: isLoadingTokens } = useTokens(projectId)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedTokenId(existingLink?.tokenId || '')
      setParityRatio(existingLink?.parityRatio?.toString() || '1.0')
      setCollateralizationPercentage(existingLink?.collateralizationPercentage?.toString() || '100.0')
      setError(null)
    }
  }, [open, existingLink])

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: {
      tokenId: string
      parityRatio: number
      collateralizationPercentage: number
    }) => {
      const endpoint = existingLink
        ? `${import.meta.env.VITE_API_URL}/api/v1/nav/bonds/${bondId}/token-links/${existingLink.id}`
        : `${import.meta.env.VITE_API_URL}/api/v1/nav/bonds/${bondId}/token-links`

      const method = existingLink ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: data.tokenId,
          parityRatio: data.parityRatio,
          collateralizationPercentage: data.collateralizationPercentage,
          projectId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `Failed to ${existingLink ? 'update' : 'create'} token link`)
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success(`Token link ${existingLink ? 'updated' : 'created'} successfully`)
      // Invalidate all token link queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['tokenLinks'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      setError(error.message)
      toast.error(error.message)
    },
  })

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!selectedTokenId) {
      setError('Please select a token')
      return
    }

    const parityNum = parseFloat(parityRatio)
    const collateralNum = parseFloat(collateralizationPercentage)

    if (isNaN(parityNum) || parityNum <= 0) {
      setError('Parity ratio must be a positive number')
      return
    }

    if (isNaN(collateralNum) || collateralNum <= 0) {
      setError('Collateralization percentage must be a positive number')
      return
    }

    mutation.mutate({
      tokenId: selectedTokenId,
      parityRatio: parityNum,
      collateralizationPercentage: collateralNum,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {existingLink ? 'Edit' : 'Create'} Token Link
          </DialogTitle>
          <DialogDescription>
            Link <strong>{bondName}</strong> to a token and set the parity ratio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Token *</Label>
            {isLoadingTokens ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading tokens...</span>
              </div>
            ) : tokens.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tokens found in this project. Please create a token first.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                <SelectTrigger id="token">
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={token.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({token.symbol})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Select the token that will be backed by this bond
            </p>
          </div>

          {/* Parity Ratio */}
          <div className="space-y-2">
            <Label htmlFor="parity">Parity Ratio *</Label>
            <Input
              id="parity"
              type="number"
              step="0.01"
              min="0.01"
              value={parityRatio}
              onChange={(e) => setParityRatio(e.target.value)}
              placeholder="1.0"
            />
            <p className="text-xs text-muted-foreground">
              Ratio of bond units to token units (1.0 = 1:1 parity)
            </p>
          </div>

          {/* Collateralization Percentage */}
          <div className="space-y-2">
            <Label htmlFor="collateral">Collateralization % *</Label>
            <Input
              id="collateral"
              type="number"
              step="0.01"
              min="0.01"
              value={collateralizationPercentage}
              onChange={(e) => setCollateralizationPercentage(e.target.value)}
              placeholder="100.0"
            />
            <p className="text-xs text-muted-foreground">
              Percentage of collateralization (100 = fully collateralized, 150 = 150% over-collateralized)
            </p>
          </div>

          {/* Preview Calculation */}
          {parityRatio && collateralizationPercentage && !isNaN(parseFloat(parityRatio)) && !isNaN(parseFloat(collateralizationPercentage)) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                Example Calculation:
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                If bond NAV = $1,000, then token value = ${((1000 * parseFloat(parityRatio)) * (parseFloat(collateralizationPercentage) / 100)).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !selectedTokenId || tokens.length === 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingLink ? 'Update' : 'Create'} Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
