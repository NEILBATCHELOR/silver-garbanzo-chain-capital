/**
 * Token Operations Panel
 * UI for Solana SPL token operations
 * 
 * Current Operations:
 * - Transfer: Send tokens to another address
 * - Mint: Create new tokens (requires mint authority)
 * - Burn: Permanently destroy tokens
 * - Account: Create token accounts (ATAs)
 * 
 * Future Operations (services not yet implemented):
 * - Delegate: Approve/revoke token delegates
 * - Authority: Set mint/freeze authority
 * - Freeze: Freeze/thaw token accounts
 * - Close: Close accounts and sync native SOL
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ArrowRightLeft, Coins, Flame, Wallet } from 'lucide-react';

interface TokenOperationsPanelProps {
  tokenId: string;
  projectId: string;
  mint: string;
  decimals: number;
  symbol: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

export function TokenOperationsPanel({
  tokenId,
  projectId,
  mint,
  decimals,
  symbol,
  network,
}: TokenOperationsPanelProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Token Operations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your {symbol} tokens: transfer, mint, and burn
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Available Operations</AlertTitle>
          <AlertDescription className="text-sm">
            <div className="space-y-1 mt-2">
              <div>✅ <strong>Transfer:</strong> Send tokens to any address</div>
              <div>✅ <strong>Mint:</strong> Create new tokens (requires mint authority)</div>
              <div>✅ <strong>Burn:</strong> Permanently destroy tokens</div>
              <div>✅ <strong>Account:</strong> Create Associated Token Accounts (ATAs)</div>
              <div className="mt-3 pt-3 border-t">
                <strong>Coming Soon:</strong> Delegate, Authority Management, Freeze/Thaw, Close Account
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="transfer" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transfer" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="mint" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Mint
            </TabsTrigger>
            <TabsTrigger value="burn" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Burn
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Transfer Tab */}
          <TabsContent value="transfer" className="mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Transfer {symbol} tokens to another Solana address. The transfer form will be displayed on a separate page.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground">
              Navigate to the Transfer page from the token details to perform transfers.
            </div>
          </TabsContent>

          {/* Mint Tab */}
          <TabsContent value="mint" className="mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Mint new {symbol} tokens and send them to a destination address. You must have mint authority for this token.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground">
              Navigate to the Mint page from the token details to mint additional tokens.
            </div>
          </TabsContent>

          {/* Burn Tab */}
          <TabsContent value="burn" className="mt-6">
            <Alert variant="destructive">
              <Flame className="h-4 w-4" />
              <AlertDescription>
                Permanently destroy {symbol} tokens from circulation. This action cannot be undone.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground">
              Navigate to the Burn page from the token details to permanently remove tokens from circulation.
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-6">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Create an Associated Token Account (ATA) to hold {symbol} tokens. Each wallet needs a separate ATA for each token type.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground">
              Navigate to the Account page from the token details to create token accounts for your wallets.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
