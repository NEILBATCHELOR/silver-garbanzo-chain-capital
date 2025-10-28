/**
 * Webhook Dialog Component
 * Dialog for creating/editing webhooks
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import type { CreateWebhookRequest } from '@/types/psp/webhooks'

interface WebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateWebhookRequest) => Promise<void>
  loading?: boolean
}

export function WebhookDialog({
  open,
  onOpenChange,
  onSubmit,
  loading
}: WebhookDialogProps) {
  const [callbackUrl, setCallbackUrl] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate URL
    if (!callbackUrl) {
      newErrors.callbackUrl = 'Callback URL is required'
    } else {
      try {
        new URL(callbackUrl)
        if (!callbackUrl.startsWith('https://')) {
          newErrors.callbackUrl = 'URL must use HTTPS'
        }
      } catch {
        newErrors.callbackUrl = 'Invalid URL format'
      }
    }

    // Validate username
    if (!authUsername) {
      newErrors.authUsername = 'Username is required'
    } else if (authUsername.length < 3) {
      newErrors.authUsername = 'Username must be at least 3 characters'
    }

    // Validate password
    if (!authPassword) {
      newErrors.authPassword = 'Password is required'
    } else if (authPassword.length < 8) {
      newErrors.authPassword = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    await onSubmit({
      callback_url: callbackUrl,
      auth_username: authUsername,
      auth_password: authPassword
    })

    // Reset form
    setCallbackUrl('')
    setAuthUsername('')
    setAuthPassword('')
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook to receive real-time payment notifications
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your webhook endpoint will receive POST requests with payment events.
              Make sure your server can handle authentication.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="callbackUrl">Callback URL *</Label>
            <Input
              id="callbackUrl"
              placeholder="https://your-domain.com/webhooks/psp"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              disabled={loading}
            />
            {errors.callbackUrl && (
              <p className="text-sm text-destructive">{errors.callbackUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="authUsername">Authentication Username *</Label>
            <Input
              id="authUsername"
              placeholder="webhook_user"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              disabled={loading}
            />
            {errors.authUsername && (
              <p className="text-sm text-destructive">{errors.authUsername}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Username for basic authentication
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="authPassword">Authentication Password *</Label>
            <Input
              id="authPassword"
              type="password"
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              disabled={loading}
            />
            {errors.authPassword && (
              <p className="text-sm text-destructive">{errors.authPassword}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Password for basic authentication (min 8 characters)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Webhook'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
