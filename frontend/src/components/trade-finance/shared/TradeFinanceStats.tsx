/**
 * Trade Finance Stats
 * Display key protocol statistics
 */

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(change).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TradeFinanceStatsProps {
  totalValueLocked?: number;
  totalSupplied?: number;
  totalBorrowed?: number;
  activeUsers?: number;
  tvlChange?: number;
  suppliedChange?: number;
  borrowedChange?: number;
  usersChange?: number;
}

export function TradeFinanceStats({
  totalValueLocked = 0,
  totalSupplied = 0,
  totalBorrowed = 0,
  activeUsers = 0,
  tvlChange,
  suppliedChange,
  borrowedChange,
  usersChange,
}: TradeFinanceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Value Locked"
        value={`$${totalValueLocked.toLocaleString()}`}
        change={tvlChange}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Total Supplied"
        value={`$${totalSupplied.toLocaleString()}`}
        change={suppliedChange}
        icon={<TrendingUp className="h-5 w-5 text-green-500" />}
      />
      <StatCard
        title="Total Borrowed"
        value={`$${totalBorrowed.toLocaleString()}`}
        change={borrowedChange}
        icon={<TrendingDown className="h-5 w-5 text-blue-500" />}
      />
      <StatCard
        title="Active Users"
        value={activeUsers.toLocaleString()}
        change={usersChange}
        icon={<Users className="h-5 w-5 text-purple-500" />}
      />
    </div>
  );
}
