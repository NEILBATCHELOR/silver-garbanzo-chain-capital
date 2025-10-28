/**
 * Off-Ramp Settings Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { PspPaymentSettings } from '@/types/psp'

interface OffRampSettingsProps {
  settings: PspPaymentSettings | null
  onUpdate: (data: Partial<PspPaymentSettings>) => void
  loading: boolean
}

export function OffRampSettings({ settings, onUpdate, loading }: OffRampSettingsProps) {
  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Off-Ramp Settings</CardTitle>
        <CardDescription>Configure crypto to USD conversion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Off-Ramp</Label>
            <div className="text-sm text-muted-foreground">Auto-convert crypto to USD</div>
          </div>
          <Switch
            checked={settings.offramp_enabled}
            onCheckedChange={(checked) => onUpdate({ offramp_enabled: checked })}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
