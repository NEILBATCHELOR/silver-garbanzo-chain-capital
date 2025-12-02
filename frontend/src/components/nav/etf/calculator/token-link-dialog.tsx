import React, { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

import { etfService } from '@/services/nav/etfService'

interface TokenLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose?: () => void  // Optional callback for backwards compatibility
  fundId: string
  fundName: string
  projectId: string
  tokens: Array<{ id: string; symbol: string; name: string }>
  existingLink?: {
    id: string
    token_id: string
    supports_rebase: boolean
    rebase_frequency?: string
  }
  onSuccess?: () => void
}

export function TokenLinkDialog({
  open,
  onOpenChange,
  fundId,
  fundName,
  projectId,
  tokens,
  existingLink,
  onSuccess,
}: TokenLinkDialogProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>(existingLink?.token_id || '')
  const [supportsRebase, setSupportsRebase] = useState<boolean>(existingLink?.supports_rebase || false)
  const [rebaseFrequency, setRebaseFrequency] = useState<string>(
    existingLink?.rebase_frequency || 'daily'
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedTokenId(existingLink?.token_id || '')
      setSupportsRebase(existingLink?.supports_rebase || false)
      setRebaseFrequency(existingLink?.rebase_frequency || 'daily')
      setError(null)
    }
  }, [open, existingLink])

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      if (!selectedTokenId) {
        setError('Please select a token')
        return
      }

      const response = await etfService.linkToken({
        fund_product_id: fundId,
        token_id: selectedTokenId,
        link_type: 'primary',
        is_active: true,
        supports_rebase: supportsRebase,
        rebase_frequency: supportsRebase ? rebaseFrequency : undefined,
      })

      if (response.success) {
        toast.success(existingLink ? 'Token link updated' : 'Token linked successfully')
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(response.error || 'Failed to link token')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {existingLink ? 'Update Token Link' : 'Link Token to ETF'}
          </DialogTitle>
          <DialogDescription>
            Link a blockchain token to {fundName} for on-chain representation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="token">Select Token</Label>
            <Select
              value={selectedTokenId}
              onValueChange={setSelectedTokenId}
              disabled={!!existingLink}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a token..." />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {existingLink && (
              <p className="text-xs text-muted-foreground">
                Token cannot be changed after linking. Create a new link if needed.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 space-y-0">
              <Checkbox
                id="supportsRebase"
                checked={supportsRebase}
                onCheckedChange={(checked) => setSupportsRebase(checked === true)}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="supportsRebase" className="cursor-pointer">
                  Enable Rebase Mechanism
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically adjust token supply to maintain target price (algorithmic ETF)
                </p>
              </div>
            </div>

            {supportsRebase && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="rebaseFrequency">Rebase Frequency</Label>
                <Select
                  value={rebaseFrequency}
                  onValueChange={setRebaseFrequency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="on_nav_update">On NAV Update</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often the token supply should be adjusted to reflect NAV changes
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedTokenId}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                {existingLink ? 'Update Link' : 'Link Token'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
