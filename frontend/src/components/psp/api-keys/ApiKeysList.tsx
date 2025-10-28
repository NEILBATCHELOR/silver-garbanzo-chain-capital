/**
 * API Keys List Component
 * Displays a list of API keys with status indicators and actions
 */

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Key, Copy, MoreVertical, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { PspApiKey } from '@/types/psp'

interface ApiKeysListProps {
  apiKeys: PspApiKey[]
  onViewDetails: (apiKey: PspApiKey) => void
  onRevoke: (apiKey: PspApiKey) => void
}

export function ApiKeysList({ apiKeys, onViewDetails, onRevoke }: ApiKeysListProps) {
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

  const getEnvironmentBadge = (environment: string) => {
    return environment === 'production' 
      ? <Badge variant="default">Production</Badge>
      : <Badge variant="secondary">Sandbox</Badge>
  }

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7
  }

  if (apiKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Key className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
        <p className="text-muted-foreground">
          Get started by creating your first API key
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Usage Count</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{apiKey.key_description}</span>
                  {isExpiringSoon(apiKey.expires_at) && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                {apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {apiKey.ip_whitelist.length} IP(s) whitelisted
                  </div>
                )}
              </TableCell>
              <TableCell>{getEnvironmentBadge(apiKey.environment)}</TableCell>
              <TableCell>{getStatusBadge(apiKey.status)}</TableCell>
              <TableCell>
                {apiKey.last_used_at 
                  ? formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell>{apiKey.usage_count}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(apiKey)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onRevoke(apiKey)}
                      className="text-destructive"
                      disabled={apiKey.status === 'revoked'}
                    >
                      Revoke Key
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
