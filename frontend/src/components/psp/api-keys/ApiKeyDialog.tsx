/**
 * API Key Dialog Component
 * Dialog for creating a new API key
 */

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiKeyEnvironment, CreateApiKeyResponse } from '@/types/psp'

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: {
    description: string
    environment: ApiKeyEnvironment
    ipWhitelist?: string[]
  }) => Promise<CreateApiKeyResponse | null>
  projectId: string
}

export function ApiKeyDialog({ 
  open, 
  onOpenChange, 
  onCreate,
  projectId
}: ApiKeyDialogProps) {
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>('sandbox')
  const [ipWhitelist, setIpWhitelist] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) return

    setLoading(true)
    try {
      const result = await onCreate({
        description,
        environment,
        ipWhitelist: ipWhitelist ? ipWhitelist.split('\n').filter(ip => ip.trim()) : undefined
      })

      if (result) {
        setCreatedKey(result.apiKey)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setDescription('')
    setEnvironment('sandbox')
    setIpWhitelist('')
    setCreatedKey(null)
    setCopied(false)
    onOpenChange(false)
  }

  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertDescription>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Production API Key"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={environment}
              onValueChange={(value) => setEnvironment(value as ApiKeyEnvironment)}
              disabled={loading}
            >
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-whitelist">IP Whitelist (Optional)</Label>
            <Textarea
              id="ip-whitelist"
              value={ipWhitelist}
              onChange={(e) => setIpWhitelist(e.target.value)}
              placeholder="One IP address per line&#10;e.g.,&#10;192.168.1.1&#10;10.0.0.1"
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter one IP address per line
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
          >
            {loading ? 'Creating...' : 'Create API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
