/**
 * Token Operations Panel
 * Comprehensive UI for all Solana token operations
 * 
 * Token Operations:
 * ✅ Transfer: Send tokens between accounts
 * ✅ Mint: Create new tokens (requires mint authority)
 * ✅ Burn: Permanently destroy tokens
 * 
 * Account Management:
 * ✅ Create Account: Create Associated Token Accounts (ATAs)
 * ✅ Close Account: Reclaim rent from empty accounts
 * 
 * Permissions:
 * ✅ Approve Delegate: Allow spending on your behalf
 * ✅ Revoke Delegate: Remove delegate permissions
 * ✅ Set Authority: Change mint/freeze authorities
 * 
 * Account Control:
 * ✅ Freeze: Prevent transfers (requires freeze authority)
 * ✅ Thaw: Allow transfers again
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Info, 
  ArrowRightLeft, 
  Coins, 
  Flame, 
  Wallet,
  XCircle,
  UserCheck,
  UserX,
  Key,
  Snowflake,
  Shield,
  Mail
} from 'lucide-react';

// Import form components
import { UnifiedSolanaTransfer } from './UnifiedSolanaTransfer';
import { MintTokenForm } from './MintTokenForm';
import { BurnTokenForm } from './BurnTokenForm';
import { CreateAccountForm } from './CreateAccountForm';
import { CloseAccountForm } from './CloseAccountForm';
import { ApproveDelegateForm } from './ApproveDelegateForm';
import { RevokeDelegateForm } from './RevokeDelegateForm';
import { SetAuthorityForm } from './SetAuthorityForm';
import { FreezeAccountForm } from './FreezeAccountForm';
import { ThawAccountForm } from './ThawAccountForm';
import { CpiGuardForm } from './CpiGuardForm';
import { MemoTransferForm } from './MemoTransferForm';

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
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Token Operations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete toolkit for managing {symbol} tokens
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Available Operations</AlertTitle>
          <AlertDescription className="text-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <p className="font-semibold mb-2">Token Operations</p>
                <div className="space-y-1 text-xs">
                  <div>• Transfer tokens</div>
                  <div>• Mint new tokens</div>
                  <div>• Burn tokens</div>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Account Management</p>
                <div className="space-y-1 text-xs">
                  <div>• Create token accounts</div>
                  <div>• Close empty accounts</div>
                  <div>• Reclaim rent</div>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Permissions & Control</p>
                <div className="space-y-1 text-xs">
                  <div>• Approve/revoke delegates</div>
                  <div>• Set authorities</div>
                  <div>• Freeze/thaw accounts</div>
                  <div>• CPI Guard protection</div>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Account Extensions</p>
                <div className="space-y-1 text-xs">
                  <div>• Memo Transfer (Token-2022)</div>
                  <div>• ImmutableOwner (at creation)</div>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Operations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab List - Two Rows for Better Organization */}
          <div className="space-y-2">
            {/* Row 1: Token Operations */}
            <div className="text-xs text-muted-foreground font-medium mb-1">Token Operations</div>
            <TabsList className="grid w-full grid-cols-3 mb-4">
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
            </TabsList>

            {/* Row 2: Account Management */}
            <div className="text-xs text-muted-foreground font-medium mb-1">Account Management</div>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Create Account
              </TabsTrigger>
              <TabsTrigger value="close" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Close Account
              </TabsTrigger>
            </TabsList>

            {/* Row 3: Permissions & Control */}
            <div className="text-xs text-muted-foreground font-medium mb-1">Permissions & Control</div>
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="approve" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Approve
              </TabsTrigger>
              <TabsTrigger value="revoke" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Revoke
              </TabsTrigger>
              <TabsTrigger value="authority" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Authority
              </TabsTrigger>
              <TabsTrigger value="freeze" className="flex items-center gap-2">
                <Snowflake className="h-4 w-4" />
                Freeze
              </TabsTrigger>
              <TabsTrigger value="thaw" className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Thaw
              </TabsTrigger>
              <TabsTrigger value="cpiguard" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                CPI Guard
              </TabsTrigger>
            </TabsList>

            {/* Row 4: Account Extensions (Token-2022) */}
            <div className="text-xs text-muted-foreground font-medium mb-1">Account Extensions</div>
            <TabsList className="grid w-full grid-cols-1 mb-4">
              <TabsTrigger value="memotransfer" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Memo Transfer
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          
          {/* Token Operations */}
          <TabsContent value="transfer" className="mt-6">
            <UnifiedSolanaTransfer 
              projectId={projectId} 
              tokenId={tokenId}
              onTransferComplete={() => {
                // Optional: Could trigger a refresh or show a success message
                console.log('Transfer completed in token operations');
              }}
            />
          </TabsContent>

          <TabsContent value="mint" className="mt-6">
            <MintTokenForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="burn" className="mt-6">
            <BurnTokenForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          {/* Account Management */}
          <TabsContent value="account" className="mt-6">
            <CreateAccountForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="close" className="mt-6">
            <CloseAccountForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          {/* Permissions & Control */}
          <TabsContent value="approve" className="mt-6">
            <ApproveDelegateForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="revoke" className="mt-6">
            <RevokeDelegateForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="authority" className="mt-6">
            <SetAuthorityForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="freeze" className="mt-6">
            <FreezeAccountForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="thaw" className="mt-6">
            <ThawAccountForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="cpiguard" className="mt-6">
            <CpiGuardForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>

          {/* Account Extensions */}
          <TabsContent value="memotransfer" className="mt-6">
            <MemoTransferForm projectId={projectId} tokenId={tokenId} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
