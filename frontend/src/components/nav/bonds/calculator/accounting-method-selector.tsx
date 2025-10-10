import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AccountingMethodSelectorProps {
  value: 'held_to_maturity' | 'available_for_sale' | 'trading'
  onChange: (value: 'held_to_maturity' | 'available_for_sale' | 'trading') => void
  currentMethod?: 'held_to_maturity' | 'available_for_sale' | 'trading'
}

const accountingMethods = [
  {
    value: 'held_to_maturity' as const,
    label: 'Held-to-Maturity (HTM)',
    description: 'Amortized cost method - bonds held until maturity',
    valuationMethod: 'DCF with YTM',
    badge: 'HTM',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'available_for_sale' as const,
    label: 'Available-for-Sale (AFS)',
    description: 'Mark-to-market with OCI - may be sold before maturity',
    valuationMethod: 'Market Price',
    badge: 'AFS',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'trading' as const,
    label: 'Trading',
    description: 'Mark-to-market through P&L - actively traded',
    valuationMethod: 'Market Price',
    badge: 'Trading',
    color: 'bg-orange-100 text-orange-800',
  },
]

export function AccountingMethodSelector({
  value,
  onChange,
  currentMethod,
}: AccountingMethodSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange}>
      <div className="grid gap-4">
        {accountingMethods.map((method) => {
          const isCurrent = currentMethod === method.value
          
          return (
            <Card
              key={method.value}
              className={`relative cursor-pointer transition-colors ${
                value === method.value
                  ? 'border-primary bg-accent'
                  : 'hover:bg-accent/50'
              }`}
            >
              <label
                htmlFor={method.value}
                className="flex items-start gap-4 p-4 cursor-pointer"
              >
                <RadioGroupItem
                  value={method.value}
                  id={method.value}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method.label}</span>
                    <Badge variant="secondary" className={method.color}>
                      {method.badge}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Valuation:</span>
                    <Badge variant="outline">{method.valuationMethod}</Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs space-y-2">
                            {method.value === 'held_to_maturity' && (
                              <>
                                <p className="font-medium">DCF with YTM</p>
                                <p className="text-sm">
                                  Discounts future cash flows using yield-to-maturity.
                                  Best for bonds held until maturity with predictable cash flows.
                                </p>
                              </>
                            )}
                            {method.value === 'available_for_sale' && (
                              <>
                                <p className="font-medium">Market Price Valuation</p>
                                <p className="text-sm">
                                  Uses latest market prices. Unrealized gains/losses flow to OCI.
                                  Appropriate when bonds may be sold before maturity.
                                </p>
                              </>
                            )}
                            {method.value === 'trading' && (
                              <>
                                <p className="font-medium">Mark-to-Market</p>
                                <p className="text-sm">
                                  Daily market price valuation. All gains/losses hit P&L immediately.
                                  Required for actively traded securities.
                                </p>
                              </>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </label>
            </Card>
          )
        })}
      </div>
    </RadioGroup>
  )
}
