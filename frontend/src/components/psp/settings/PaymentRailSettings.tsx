/**
 * Payment Rail Settings Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PspPaymentSettings, DefaultFiatRail } from '@/types/psp'

interface PaymentRailSettingsProps {
  settings: PspPaymentSettings | null
  onUpdate: (data: Partial<PspPaymentSettings>) => void
  loading: boolean
}

export function PaymentRailSettings({ settings, onUpdate, loading }: PaymentRailSettingsProps) {
  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Rail Settings</CardTitle>
        <CardDescription>Configure default payment rails</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Default Fiat Rail</Label>
          <Select
            value={settings.default_fiat_rail}
            onValueChange={(value) => onUpdate({ default_fiat_rail: value as DefaultFiatRail })}
            disabled={loading}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ach">ACH</SelectItem>
              <SelectItem value="wire">Wire</SelectItem>
              <SelectItem value="rtp">RTP</SelectItem>
              <SelectItem value="fednow">FedNow</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Default payment rail for fiat transactions
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
