/**
 * Payments List Component
 * Displays all payment transactions with filtering
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { PspPayment } from '@/types/psp'
import { TransactionStatusBadge, CurrencyAmount } from '../shared'
import { formatDistanceToNow } from 'date-fns'

interface PaymentsListProps {
  payments: PspPayment[]
  onView: (payment: PspPayment) => void
  loading?: boolean
}

export function PaymentsList({ payments, onView, loading }: PaymentsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading payments...</div>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ArrowUpRight className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No payments</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first payment to get started
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Initiated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow
              key={payment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(payment)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {payment.direction === 'outbound' ? (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <div className="font-medium capitalize">
                      {payment.payment_type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {payment.direction}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <CurrencyAmount
                  amount={payment.amount}
                  currency={payment.currency}
                  className="font-semibold"
                />
              </TableCell>
              <TableCell>
                {payment.payment_rail && (
                  <Badge variant="outline" className="uppercase">
                    {payment.payment_rail}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <TransactionStatusBadge status={payment.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(payment.initiated_at), { addSuffix: true })}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation()
                      onView(payment)
                    }}>
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
