/**
 * Automation Settings Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PspPaymentSettings, WithdrawalFrequency } from '@/types/psp'

interface AutomationSettingsProps {
  settings: PspPaymentSettings | null
  onUpdate: (data: Partial<PspPaymentSettings>) => void
  loading: boolean
}

export function AutomationSettings({ settings, onUpdate, loading }: AutomationSettingsProps) {
  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Automation</CardTitle>
        <CardDescription>Configure automatic payment processing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Automation</Label>
            <div className="text-sm text-muted-foreground">Automatically process payments</div>
          </div>
          <Switch
            checked={settings.automation_enabled}
            onCheckedChange={(checked) => onUpdate({ automation_enabled: checked })}
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Withdrawal Frequency</Label>
          <Select
            value={settings.withdrawal_frequency}
            onValueChange={(value) => onUpdate({ withdrawal_frequency: value as WithdrawalFrequency })}
            disabled={loading}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="continuous">Continuous</SelectItem>
              <SelectItem value="on_demand">On Demand</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
