/**
 * PSP Dashboard Page
 * Main dashboard for PSP hub with balances, transactions, and quick actions
 */

import React from 'react'
import { BalancesOverview, RecentTransactions, QuickActions } from '../dashboard'

interface PspDashboardProps {
  projectId: string
}

function PspDashboard({ projectId }: PspDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions - Top for immediate access */}
      <QuickActions projectId={projectId} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balances Overview */}
        <BalancesOverview projectId={projectId} />

        {/* Recent Transactions */}
        <RecentTransactions projectId={projectId} limit={8} />
      </div>
    </div>
  )
}

export default PspDashboard
