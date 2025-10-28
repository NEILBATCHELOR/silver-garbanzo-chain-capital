/**
 * API Key Details Component
 * Shows detailed information about an API key
 */

import React, { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { PspApiKey } from '@/types/psp'

interface ApiKeyDetailsProps {
  apiKey: PspApiKey | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddIp: (ipAddress: string) => Promise<void>
  onRemoveIp: (ipAddress: string) => Promise<void>
}

export function ApiKeyDetails({
  apiKey,
  open,
  onOpenChange,
  onAddIp,
  onRemoveIp
}: ApiKeyDetailsProps) {
  const [newIp, setNewIp] = useState('')
  const [loading, setLoading] = useState(false)

  if (!apiKey) return null

  const handleAddIp = async () => {
    if (!newIp.trim()) return

    setLoading(true)
    try {
      await onAddIp(newIp.trim())
      setNewIp('')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveIp = async (ip: string) => {
    setLoading(true)
    try {
      await onRemoveIp(ip)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>API Key Details</SheetTitle>
          <SheetDescription>
            View and manage API key settings
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-sm text-muted-foreground">Description</Label>
            <p className="text-sm font-medium mt-1">{apiKey.key_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Environment</Label>
              <p className="text-sm font-medium mt-1 capitalize">{apiKey.environment}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(apiKey.status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Usage Count</Label>
              <p className="text-sm font-medium mt-1">{apiKey.usage_count}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Last Used</Label>
              <p className="text-sm font-medium mt-1">
                {apiKey.last_used_at 
                  ? formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })
                  : 'Never'}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Created</Label>
            <p className="text-sm font-medium mt-1">
              {format(new Date(apiKey.created_at), 'PPpp')}
            </p>
          </div>

          {apiKey.expires_at && (
            <div>
              <Label className="text-sm text-muted-foreground">Expires</Label>
              <p className="text-sm font-medium mt-1">
                {format(new Date(apiKey.expires_at), 'PPpp')}
              </p>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3">IP Whitelist</Label>
            
            {apiKey.status !== 'revoked' && (
              <div className="flex gap-2 mb-4">
                <Input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Enter IP address"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddIp()
                    }
                  }}
                />
                <Button
                  onClick={handleAddIp}
                  disabled={!newIp.trim() || loading}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0 ? (
              <div className="space-y-2">
                {apiKey.ip_whitelist.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <code className="text-sm">{ip}</code>
                    {apiKey.status !== 'revoked' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIp(ip)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No IP addresses whitelisted. All IPs are allowed.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
