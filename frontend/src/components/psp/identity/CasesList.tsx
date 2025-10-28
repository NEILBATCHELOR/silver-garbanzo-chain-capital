/**
 * Cases List Component
 * Displays all identity verification cases
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, User, Building2, Trash2 } from 'lucide-react'
import type { PspIdentityCase, CaseStatus } from '@/types/psp'
import { formatDistanceToNow } from 'date-fns'

interface CasesListProps {
  cases: PspIdentityCase[]
  onView: (identityCase: PspIdentityCase) => void
  onDeactivate: (id: string) => void
  loading?: boolean
}

const statusColors: Record<CaseStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  in_review: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  review_required: 'bg-orange-500/10 text-orange-500'
}

const statusLabels: Record<CaseStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  review_required: 'Review Required'
}

export function CasesList({ cases, onView, onDeactivate, loading }: CasesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading cases...</div>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No identity cases</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first KYB/KYC case to verify business identity
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
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((identityCase) => (
            <TableRow
              key={identityCase.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(identityCase)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {identityCase.case_type === 'business' ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="capitalize">{identityCase.case_type}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {identityCase.business_data?.legalName || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[identityCase.status]}>
                  {statusLabels[identityCase.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(identityCase.created_at), {
                    addSuffix: true
                  })}
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
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onView(identityCase)
                      }}
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeactivate(identityCase.id)
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deactivate
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
