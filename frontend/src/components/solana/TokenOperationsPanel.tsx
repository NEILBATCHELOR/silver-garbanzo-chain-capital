/**
 * Token Operations Panel
 * Integrated UI for Solana token operations using existing form components
 * 
 * Operations:
 * ✅ Transfer: TransferTokenForm
 * ✅ Mint: MintTokenForm
 * ✅ Burn: BurnTokenForm
 * ✅ Account: CreateAccountForm
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, ArrowRightLeft, Coins, Flame, Wallet } from 'lucide-react';

// Import actual form components
import { TransferTokenForm } from './TransferTokenForm';
import { MintTokenForm } from './MintTokenForm';
import { BurnTokenForm } from './BurnTokenForm';
import { CreateAccountForm } from './CreateAccountForm';

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
  const [activeTab, setActiveTab] = useState('transfer');

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Token Operations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your {symbol} tokens: transfer, mint, burn, and create accounts
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
            </div>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {/* Each tab renders the form directly with props - no routing needed */}
          <TabsContent value="transfer" className="mt-6">
            <div className="space-y-4">
              <TransferTokenForm projectId={projectId} tokenId={tokenId} />
            </div>
          </TabsContent>

          <TabsContent value="mint" className="mt-6">
            <div className="space-y-4">
              <MintTokenForm projectId={projectId} tokenId={tokenId} />
            </div>
          </TabsContent>

          <TabsContent value="burn" className="mt-6">
            <div className="space-y-4">
              <BurnTokenForm projectId={projectId} tokenId={tokenId} />
            </div>
          </TabsContent>

          <TabsContent value="account" className="mt-6">
            <div className="space-y-4">
              <CreateAccountForm projectId={projectId} tokenId={tokenId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
