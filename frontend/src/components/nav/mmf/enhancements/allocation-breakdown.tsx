/**
 * ENHANCEMENT 1: Asset Allocation Breakdown
 * Displays portfolio composition with comparison to typical MMF allocations
 * Following Bonds pattern - Zero hardcoded values
 */

import { useQuery } from '@tanstack/react-query'
import { Pie, PieChart, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { MMFAPI } from '@/infrastructure/api/nav/mmf-api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface AllocationBreakdownProps {
  fundId: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export function AllocationBreakdown({ fundId }: AllocationBreakdownProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mmf-allocation', fundId],
    queryFn: () => MMFAPI.getAllocationBreakdown(fundId),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-sm text-destructive text-center">
            Failed to load allocation breakdown: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const breakdown = data?.data || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>
          Portfolio composition vs industry typical
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="percentage"
                  nameKey="assetClass"
                  cx="50%"
                  cy="50%"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  labelLine={true}
                >
                  {breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Class</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Typical Range</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((item) => (
                  <TableRow key={item.assetClass}>
                    <TableCell className="font-medium">
                      {item.assetClass.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </TableCell>
                    <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                    <TableCell>
                      {item.typicalRange
                        ? `${item.typicalRange.min}-${item.typicalRange.max}%`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {item.variance !== null && item.variance !== undefined ? (
                        <Badge
                          variant={Math.abs(item.variance) > 10 ? 'destructive' : 'secondary'}
                        >
                          {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {breakdown.slice(0, 4).map((item, idx) => (
            <div key={idx} className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground">
                {item.assetClass.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
              <div className="text-2xl font-bold">{item.percentage.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                ${(item.totalValue / 1_000_000).toFixed(2)}M
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
