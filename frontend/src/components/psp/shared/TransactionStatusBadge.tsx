/**
 * Transaction Status Badge Component
 * Displays status badge for transactions
 */

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'

interface TransactionStatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    icon: Clock
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: Clock
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: CheckCircle2
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: XCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    icon: AlertCircle
  }
}

export function TransactionStatusBadge({
  status,
  className,
  showIcon = true
}: TransactionStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} ${className || ''}`}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
