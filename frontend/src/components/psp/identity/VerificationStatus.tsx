/**
 * Verification Status Component
 * Visual status indicator for identity verification
 */

import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react'
import type { CaseStatus } from '@/types/psp'

interface VerificationStatusProps {
  status: CaseStatus
  className?: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Pending Verification'
  },
  in_review: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Under Review'
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Verified'
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Rejected'
  },
  review_required: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: 'Action Required'
  }
}

export function VerificationStatus({ status, className = '' }: VerificationStatusProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${config.bgColor} ${className}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  )
}
