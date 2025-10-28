/**
 * API Keys Page Component
 * Main page for managing PSP API keys
 */

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useApiKeys } from '@/hooks/psp'
import { ApiKeysList, ApiKeyDialog, ApiKeyDetails } from '@/components/psp/api-keys'
import { PspApiKey } from '@/types/psp'

export default function ApiKeysPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<PspApiKey | null>(null)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<PspApiKey | null>(null)

  const {
    apiKeys,
    loading,
    createApiKey,
    revokeApiKey,
    addIpToWhitelist,
    removeIpFromWhitelist
  } = useApiKeys(projectId)

  const handleViewDetails = (apiKey: PspApiKey) => {
    setSelectedApiKey(apiKey)
    setDetailsOpen(true)
  }

  const handleRevoke = (apiKey: PspApiKey) => {
    setKeyToRevoke(apiKey)
    setRevokeDialogOpen(true)
  }

  const handleConfirmRevoke = async () => {
    if (keyToRevoke) {
      await revokeApiKey(keyToRevoke.id)
      setRevokeDialogOpen(false)
      setKeyToRevoke(null)
    }
  }

  const handleAddIp = async (ipAddress: string) => {
    if (selectedApiKey) {
      await addIpToWhitelist(selectedApiKey.id, ipAddress)
    }
  }

  const handleRemoveIp = async (ipAddress: string) => {
    if (selectedApiKey) {
      await removeIpFromWhitelist(selectedApiKey.id, ipAddress)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">
            Manage API keys for your PSP integration
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {loading && apiKeys.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading API keys...</p>
          </div>
        </div>
      ) : (
        <ApiKeysList
          apiKeys={apiKeys}
          onViewDetails={handleViewDetails}
          onRevoke={handleRevoke}
        />
      )}

      <ApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={async (data) => {
          if (projectId) {
            return await createApiKey({
              ...data,
              project_id: projectId
            })
          }
          return null
        }}
        projectId={projectId || ''}
      />

      <ApiKeyDetails
        apiKey={selectedApiKey}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onAddIp={handleAddIp}
        onRemoveIp={handleRemoveIp}
      />

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone and will
              immediately stop all requests using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRevoke}>
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
