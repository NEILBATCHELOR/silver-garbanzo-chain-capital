/**
 * Payment Details Component
 * Displays detailed information about a payment
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react'
import type { PspPayment } from '@/types/psp'
import { TransactionStatusBadge, CurrencyAmount, NetworkBadge } from '../shared'
import { format } from 'date-fns'

interface PaymentDetailsProps {
  payment: PspPayment
}

export function PaymentDetails({ payment }: PaymentDetailsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Details</CardTitle>
            <TransactionStatusBadge status={payment.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {payment.direction === 'outbound' ? (
              <ArrowUpRight className="h-8 w-8 text-red-500" />
            ) : (
              <ArrowDownLeft className="h-8 w-8 text-green-500" />
            )}
            <div>
              <div className="text-2xl font-bold">
                <CurrencyAmount amount={payment.amount} currency={payment.currency} />
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {payment.payment_type.replace('_', ' ')} • {payment.direction}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {payment.warp_payment_id && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Warp Payment ID</div>
                <div className="font-mono text-sm">{payment.warp_payment_id}</div>
              </div>
            )}
            {payment.payment_rail && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Payment Rail</div>
                <Badge variant="outline" className="uppercase">
                  {payment.payment_rail}
                </Badge>
              </div>
            )}
          </div>

          {payment.network && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Network</div>
              <NetworkBadge network={payment.network} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Initiated</div>
              <div className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(new Date(payment.initiated_at), 'PPp')}
              </div>
            </div>
            {payment.completed_at && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Completed</div>
                <div className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {format(new Date(payment.completed_at), 'PPp')}
                </div>
              </div>
            )}
            {payment.failed_at && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Failed</div>
                <div className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  {format(new Date(payment.failed_at), 'PPp')}
                </div>
              </div>
            )}
          </div>

          {payment.memo && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Memo</div>
              <div className="text-sm">{payment.memo}</div>
            </div>
          )}

          {payment.error_code && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="text-sm font-medium text-red-500">Error</div>
              <div className="text-sm mt-1">
                Code: {payment.error_code}
                {payment.error_message && ` - ${payment.error_message}`}
              </div>
            </div>
          )}

          {payment.idempotency_key && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Idempotency Key</div>
              <div className="font-mono text-xs">{payment.idempotency_key}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
