/**
 * Transactions Page Component
 * Transaction history and details
 */

import React from 'react'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <p className="text-muted-foreground">
          View and manage payment transactions
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Transaction history coming soon
        </p>
      </div>
    </div>
  )
}
