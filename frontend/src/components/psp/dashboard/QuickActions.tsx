/**
 * Quick Actions Component
 * Displays quick action buttons for common PSP tasks
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  ArrowLeftRight, 
  Plus, 
  Key,
  Webhook,
  UserCheck,
  CreditCard,
  Wallet
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/utils'

interface QuickActionsProps {
  projectId: string
  className?: string
  onActionClick?: (action: string) => void
}

type QuickAction = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  variant: 'default' | 'outline' | 'secondary'
  action: () => void
  disabled?: boolean
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  projectId,
  className,
  onActionClick
}) => {
  const navigate = useNavigate()
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  const handleAction = async (actionId: string, action: () => void) => {
    try {
      setProcessingAction(actionId)
      if (onActionClick) {
        onActionClick(actionId)
      }
      action()
    } finally {
      setProcessingAction(null)
    }
  }

  const actions: QuickAction[] = [
    {
      id: 'create-payment',
      label: 'Create Payment',
      description: 'Send fiat or crypto payment',
      icon: <Send className="h-5 w-5" />,
      variant: 'default',
      action: () => navigate(`/psp/payments?action=create&project=${projectId}`)
    },
    {
      id: 'create-trade',
      label: 'Create Trade',
      description: 'Exchange currencies',
      icon: <ArrowLeftRight className="h-5 w-5" />,
      variant: 'default',
      action: () => navigate(`/psp/trades?action=create&project=${projectId}`)
    },
    {
      id: 'add-account',
      label: 'Add Account',
      description: 'Connect bank or wallet',
      icon: <Plus className="h-5 w-5" />,
      variant: 'outline',
      action: () => navigate(`/psp/accounts?action=add&project=${projectId}`)
    },
    {
      id: 'create-api-key',
      label: 'Create API Key',
      description: 'Generate new API key',
      icon: <Key className="h-5 w-5" />,
      variant: 'outline',
      action: () => navigate(`/psp/api-keys?action=create&project=${projectId}`)
    },
    {
      id: 'register-webhook',
      label: 'Register Webhook',
      description: 'Setup event notifications',
      icon: <Webhook className="h-5 w-5" />,
      variant: 'outline',
      action: () => navigate(`/psp/webhooks?action=register&project=${projectId}`)
    },
    {
      id: 'verify-identity',
      label: 'Verify Identity',
      description: 'KYB/KYC verification',
      icon: <UserCheck className="h-5 w-5" />,
      variant: 'outline',
      action: () => navigate(`/psp/identity?action=create&project=${projectId}`)
    },
    {
      id: 'view-balances',
      label: 'View Balances',
      description: 'Check all balances',
      icon: <Wallet className="h-5 w-5" />,
      variant: 'secondary',
      action: () => navigate(`/psp/balances?project=${projectId}`)
    },
    {
      id: 'payment-settings',
      label: 'Payment Settings',
      description: 'Configure automation',
      icon: <CreditCard className="h-5 w-5" />,
      variant: 'secondary',
      action: () => navigate(`/psp/settings?project=${projectId}`)
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks and operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              className={cn(
                'h-auto py-4 px-4 justify-start gap-3',
                processingAction === action.id && 'opacity-50 cursor-wait'
              )}
              onClick={() => handleAction(action.id, action.action)}
              disabled={action.disabled || processingAction === action.id}
            >
              <div className={cn(
                'rounded-full p-2',
                action.variant === 'default' 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-primary/10'
              )}>
                {action.icon}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
