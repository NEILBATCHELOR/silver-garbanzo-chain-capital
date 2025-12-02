/**
 * Registration Status Tracker
 * Tracks ETF registration status with SEC
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertTriangle, FileText, Send } from 'lucide-react'
import type { ETFProduct } from '@/types/nav/etf'

interface RegistrationStep {
  id: string
  label: string
  description: string
  status: 'completed' | 'current' | 'pending' | 'blocked'
  completedDate?: Date
}

interface RegistrationStatusProps {
  product: ETFProduct
  onUpdateStatus?: (status: string) => void
}

export function RegistrationStatus({ product, onUpdateStatus }: RegistrationStatusProps) {
  // Map registration status to steps
  const getSteps = (): RegistrationStep[] => {
    const status = product.registration_status || 'draft'
    
    return [
      {
        id: 'draft',
        label: 'Draft Creation',
        description: 'ETF product created in draft mode',
        status: status === 'draft' ? 'current' : 'completed',
        completedDate: product.inception_date ? new Date(product.inception_date) : undefined,
      },
      {
        id: 'pending_sec',
        label: 'SEC Filing',
        description: 'Form N-1A submitted to SEC',
        status: 
          status === 'pending_sec' ? 'current' 
          : ['active', 'suspended', 'liquidating'].includes(status) ? 'completed'
          : 'pending',
        completedDate: undefined,
      },
      {
        id: 'active',
        label: 'Approved & Active',
        description: 'SEC approval received, ETF trading',
        status: status === 'active' ? 'completed' : status === 'draft' || status === 'pending_sec' ? 'pending' : 'current',
        completedDate: undefined,
      },
    ]
  }

  const steps = getSteps()
  const currentStepIndex = steps.findIndex(s => s.status === 'current')
  const progress = currentStepIndex === -1 ? 100 : ((currentStepIndex + 1) / steps.length) * 100

  const getStatusBadge = () => {
    const status = product.registration_status || 'draft'
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'pending_sec':
        return <Badge variant="default">Pending SEC</Badge>
      case 'active':
        return <Badge variant="default" className="bg-green-600">Active</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStepIcon = (status: RegistrationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'current':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const handleAdvanceStatus = () => {
    const status = product.registration_status || 'draft'
    if (status === 'draft') {
      onUpdateStatus?.('pending_sec')
    } else if (status === 'pending_sec') {
      onUpdateStatus?.('active')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Registration Status</CardTitle>
            <CardDescription>
              {product.fund_ticker} - {product.fund_name}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-muted">
                  {getStepIcon(step.status)}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-12 ${
                    step.status === 'completed' ? 'bg-green-600' : 'bg-muted'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{step.label}</h4>
                  {step.completedDate && (
                    <span className="text-sm text-muted-foreground">
                      {step.completedDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
                {step.status === 'current' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>In progress</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {product.registration_status !== 'active' && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Next Steps</h4>
            
            {product.registration_status === 'draft' && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Complete your ETF documentation and holdings before submitting to SEC.
                </AlertDescription>
              </Alert>
            )}

            {product.registration_status === 'pending_sec' && (
              <Alert>
                <Send className="h-4 w-4" />
                <AlertDescription>
                  Form N-1A submitted. Awaiting SEC review (typically 30-60 days).
                </AlertDescription>
              </Alert>
            )}

            {onUpdateStatus && (
              <Button onClick={handleAdvanceStatus} className="w-full">
                {product.registration_status === 'draft' && 'Submit to SEC'}
                {product.registration_status === 'pending_sec' && 'Mark as Approved'}
              </Button>
            )}
          </div>
        )}

        {/* Active Status Info */}
        {product.registration_status === 'active' && (
          <Alert className="border-green-600">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              ETF is actively trading. All regulatory requirements met.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
