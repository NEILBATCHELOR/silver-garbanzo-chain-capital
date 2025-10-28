/**
 * Connected Accounts List Component
 * Displays all external fiat and crypto accounts
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { MoreHorizontal, Wallet, Trash2, Building2, Coins } from 'lucide-react'
import type { PspExternalAccount, AccountStatus } from '@/types/psp'
import { formatDistanceToNow } from 'date-fns'

interface ConnectedAccountsListProps {
  fiatAccounts: PspExternalAccount[]
  cryptoAccounts: PspExternalAccount[]
  onView: (account: PspExternalAccount) => void
  onDeactivate: (id: string) => void
  loading?: boolean
}

const statusColors: Record<AccountStatus, string> = {
  active: 'bg-green-500/10 text-green-500',
  inactive: 'bg-gray-500/10 text-gray-500',
  suspended: 'bg-red-500/10 text-red-500'
}

export function ConnectedAccountsList({
  fiatAccounts,
  cryptoAccounts,
  onView,
  onDeactivate,
  loading
}: ConnectedAccountsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading accounts...</div>
      </div>
    )
  }

  const FiatAccountsTable = () => (
    <div className="rounded-md border">
      {fiatAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No fiat accounts</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Add an ACH or Wire account to receive fiat payments
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiatAccounts.map((account) => (
              <TableRow
                key={account.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onView(account)}
              >
                <TableCell className="font-medium">{account.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">
                    {account.transfer_method || account.account_type}
                  </Badge>
                </TableCell>
                <TableCell>{account.bank_name || 'N/A'}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    ****{account.account_number_last4}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[account.status]}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
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
                        onView(account)
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeactivate(account.id)
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
      )}
    </div>
  )

  const CryptoAccountsTable = () => (
    <div className="rounded-md border">
      {cryptoAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Coins className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No crypto accounts</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Add a crypto wallet to receive cryptocurrency payments
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cryptoAccounts.map((account) => (
              <TableRow
                key={account.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onView(account)}
              >
                <TableCell className="font-medium">{account.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {account.network}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {account.wallet_address?.slice(0, 6)}...{account.wallet_address?.slice(-4)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[account.status]}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
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
                        onView(account)
                      }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeactivate(account.id)
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
      )}
    </div>
  )

  return (
    <Tabs defaultValue="fiat" className="w-full">
      <TabsList>
        <TabsTrigger value="fiat" className="gap-2">
          <Wallet className="h-4 w-4" />
          Fiat Accounts ({fiatAccounts.length})
        </TabsTrigger>
        <TabsTrigger value="crypto" className="gap-2">
          <Coins className="h-4 w-4" />
          Crypto Accounts ({cryptoAccounts.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fiat" className="mt-6">
        <FiatAccountsTable />
      </TabsContent>

      <TabsContent value="crypto" className="mt-6">
        <CryptoAccountsTable />
      </TabsContent>
    </Tabs>
  )
}
