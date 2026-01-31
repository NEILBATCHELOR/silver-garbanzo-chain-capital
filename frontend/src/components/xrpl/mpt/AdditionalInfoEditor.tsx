import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AdditionalInfoEditorProps {
  additionalInfo: Record<string, any>
  onChange: (info: Record<string, any>) => void
  disabled?: boolean
  showPresets?: boolean
}

// Common presets for different asset classes
const PRESETS = {
  rwa_treasury: [
    'interest_rate',
    'interest_type',
    'yield_source',
    'maturity_date',
    'cusip'
  ],
  rwa_stablecoin: [
    'peg',
    'backing',
    'audit_frequency',
    'reserve_ratio'
  ],
  rwa_real_estate: [
    'property_type',
    'location',
    'valuation',
    'rental_yield'
  ],
  defi: [
    'total_supply',
    'governance_model',
    'utility'
  ]
}

export const AdditionalInfoEditor: React.FC<AdditionalInfoEditorProps> = ({
  additionalInfo,
  onChange,
  disabled = false,
  showPresets = true
}) => {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  const handleAdd = () => {
    if (!newKey || !newValue) return

    onChange({
      ...additionalInfo,
      [newKey]: newValue
    })
    setNewKey('')
    setNewValue('')
  }

  const handleRemove = (key: string) => {
    const updated = { ...additionalInfo }
    delete updated[key]
    onChange(updated)
  }

  const handleUpdate = (key: string, value: string) => {
    onChange({
      ...additionalInfo,
      [key]: value
    })
  }

  const handlePresetSelect = (preset: string) => {
    if (!preset || preset === 'none') {
      setSelectedPreset('')
      return
    }

    setSelectedPreset(preset)
    const keys = PRESETS[preset as keyof typeof PRESETS] || []
    
    // Add all preset keys with empty values if they don't exist
    const updated = { ...additionalInfo }
    keys.forEach(key => {
      if (!(key in updated)) {
        updated[key] = ''
      }
    })
    onChange(updated)
  }

  const entries = Object.entries(additionalInfo)

  return (
    <div className="space-y-4">
      {/* Preset selector */}
      {showPresets && (
        <div className="space-y-2">
          <Label className="text-sm">Quick Presets</Label>
          <Select value={selectedPreset} onValueChange={handlePresetSelect} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select preset fields..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="rwa_treasury">RWA: Treasury-Backed</SelectItem>
              <SelectItem value="rwa_stablecoin">RWA: Stablecoin</SelectItem>
              <SelectItem value="rwa_real_estate">RWA: Real Estate</SelectItem>
              <SelectItem value="defi">DeFi Token</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Existing fields */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom Fields</Label>
          {entries.map(([key, value]) => (
            <Card key={key} className="p-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <Label className="text-xs text-muted-foreground">{key}</Label>
                </div>
                <div className="col-span-6">
                  <Input
                    value={String(value)}
                    onChange={(e) => handleUpdate(key, e.target.value)}
                    placeholder="Value"
                    disabled={disabled}
                    className="h-9"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(key)}
                    disabled={disabled}
                    className="h-9 w-9 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add new field */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add Custom Field</Label>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key (e.g., interest_rate)"
                disabled={disabled}
              />
            </div>
            <div className="col-span-6">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value (e.g., 5.00%)"
                disabled={disabled}
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                size="icon"
                onClick={handleAdd}
                disabled={disabled || !newKey || !newValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add custom metadata like interest rates, maturity dates, backing info, etc.
          </p>
        </div>
      </Card>

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No custom fields added. Use presets above or add your own key-value pairs.
        </p>
      )}
    </div>
  )
}
