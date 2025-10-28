/**
 * On-Ramp Settings Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PspPaymentSettings } from '@/types/psp'

interface OnRampSettingsProps {
  settings: PspPaymentSettings | null
  onUpdate: (data: Partial<PspPaymentSettings>) => void
  loading: boolean
}

export function OnRampSettings({ settings, onUpdate, loading }: OnRampSettingsProps) {
  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-Ramp Settings</CardTitle>
        <CardDescription>Configure USD to crypto conversion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable On-Ramp</Label>
            <div className="text-sm text-muted-foreground">Auto-convert USD to crypto</div>
          </div>
          <Switch
            checked={settings.onramp_enabled}
            onCheckedChange={(checked) => onUpdate({ onramp_enabled: checked })}
            disabled={loading}
          />
        </div>
        
        {settings.onramp_enabled && (
          <>
            <div className="space-y-2">
              <Label>Target Asset</Label>
              <Select
                value={settings.onramp_target_asset || ''}
                onValueChange={(value) => onUpdate({ onramp_target_asset: value })}
              >
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Network</Label>
              <Select
                value={settings.onramp_target_network || ''}
                onValueChange={(value) => onUpdate({ onramp_target_network: value })}
              >
                <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
