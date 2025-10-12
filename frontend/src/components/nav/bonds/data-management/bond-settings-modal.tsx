/**
 * Bond Settings Modal
 * Settings and preferences for bond management
 */

import React, { useState } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

interface BondSettingsModalProps {
  bondId: string
  open: boolean
  onClose: () => void
}

export function BondSettingsModal({ bondId, open, onClose }: BondSettingsModalProps) {
  const { toast } = useToast()
  
  // Settings state
  const [autoCalculate, setAutoCalculate] = useState(false)
  const [notifyOnPayment, setNotifyOnPayment] = useState(true)
  const [defaultCalculationMethod, setDefaultCalculationMethod] = useState('dcf')

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Bond settings have been updated successfully.',
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Bond Settings
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Configure settings and preferences for this bond
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calculation Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Calculation Settings</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-calculate" className="flex flex-col gap-1">
                <span>Auto-calculate NAV</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Automatically calculate NAV when supporting data changes
                </span>
              </Label>
              <Switch
                id="auto-calculate"
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-method">Default Calculation Method</Label>
              <Select
                value={defaultCalculationMethod}
                onValueChange={setDefaultCalculationMethod}
              >
                <SelectTrigger id="default-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dcf">Discounted Cash Flow (DCF)</SelectItem>
                  <SelectItem value="market">Market-to-Market</SelectItem>
                  <SelectItem value="amortized">Amortized Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-payment" className="flex flex-col gap-1">
                <span>Payment notifications</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Receive alerts for upcoming coupon payments
                </span>
              </Label>
              <Switch
                id="notify-payment"
                checked={notifyOnPayment}
                onCheckedChange={setNotifyOnPayment}
              />
            </div>
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Data Management</h3>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                Export Bond Data (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Export Calculation History
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Validate Data Completeness
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}