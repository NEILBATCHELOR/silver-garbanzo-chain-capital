/**
 * Token Operations Panel
 * Comprehensive UI for all Solana SPL token operations
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, X, ExternalLink } from 'lucide-react';
import {
  modernSolanaTokenMintService,
  modernSolanaTokenBurnService,
  modernSolanaTokenDelegateService,
  modernSolanaAuthorityService,
  modernSolanaFreezeService,
  modernSolanaAccountService,
  type AuthorityType,
} from '@/services/wallet/solana';
import { address, type Address } from '@solana/kit';

interface TokenOperationsPanelProps {
  mint: string;
  decimals: number;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

export function TokenOperationsPanel({
  mint,
  decimals,
  network,
}: TokenOperationsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Token Operations</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your token: mint, burn, delegate, freeze, and more
      </p>

      <Tabs defaultValue="mint">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="mint">Mint</TabsTrigger>
          <TabsTrigger value="burn">Burn</TabsTrigger>
          <TabsTrigger value="delegate">Delegate</TabsTrigger>
          <TabsTrigger value="authority">Authority</TabsTrigger>
          <TabsTrigger value="freeze">Freeze</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Mint Tab */}
        <TabsContent value="mint">
          <MintTokensForm
            mint={mint}
            decimals={decimals}
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>

        {/* Burn Tab */}
        <TabsContent value="burn">
          <BurnTokensForm
            mint={mint}
            decimals={decimals}
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>

        {/* Delegate Tab */}
        <TabsContent value="delegate">
          <DelegateManagementForm
            mint={mint}
            decimals={decimals}
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>

        {/* Authority Tab */}
        <TabsContent value="authority">
          <AuthorityManagementForm
            mint={mint}
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>

        {/* Freeze Tab */}
        <TabsContent value="freeze">
          <FreezeManagementForm
            mint={mint}
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <AccountManagementForm
            network={network}
            onResult={setResult}
            setLoading={setLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Result Display */}
      {result && (
        <div className="mt-6">
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <AlertDescription>
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">Operation Successful!</span>
                  </div>
                  {result.signature && (
                    <div className="text-sm">
                      <strong>Signature:</strong> {result.signature.slice(0, 8)}...{result.signature.slice(-8)}
                    </div>
                  )}
                  {result.explorerUrl && (
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      View on Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <div>
                    <strong>Operation Failed</strong>
                    {result.errors && result.errors.map((err: string, i: number) => (
                      <div key={i} className="text-sm mt-1">{err}</div>
                    ))}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}

// Mint Tokens Form
function MintTokensForm({ mint, decimals, network, onResult, setLoading }: any) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleMint = async () => {
    setLoading(true);
    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
      
      const result = await modernSolanaTokenMintService.mintTokens(
        {
          mint: address(mint),
          destination: address(destination),
          amount: amountBigInt,
          decimals,
        },
        {
          network,
          mintAuthorityPrivateKey: privateKey,
        }
      );

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Destination Address</Label>
        <Input
          placeholder="Solana address..."
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <Label>Mint Authority Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button onClick={handleMint} className="w-full">
        Mint Tokens
      </Button>
    </div>
  );
}

// Burn Tokens Form
function BurnTokensForm({ mint, decimals, network, onResult, setLoading }: any) {
  const [owner, setOwner] = useState('');
  const [amount, setAmount] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleBurn = async () => {
    setLoading(true);
    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
      
      const result = await modernSolanaTokenBurnService.burnTokens(
        {
          mint: address(mint),
          owner: address(owner),
          amount: amountBigInt,
          decimals,
        },
        {
          network,
          signerPrivateKey: privateKey,
        }
      );

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Owner Address</Label>
        <Input
          placeholder="Your wallet address"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
      </div>
      <div>
        <Label>Amount to Burn</Label>
        <Input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <Label>Owner Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button onClick={handleBurn} variant="destructive" className="w-full">
        Burn Tokens
      </Button>
    </div>
  );
}

// Delegate Management Form
function DelegateManagementForm({ mint, decimals, network, onResult, setLoading }: any) {
  const [operation, setOperation] = useState<'approve' | 'revoke'>('approve');
  const [tokenAccount, setTokenAccount] = useState('');
  const [delegateAddress, setDelegateAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleDelegate = async () => {
    setLoading(true);
    try {
      let result;
      
      if (operation === 'approve') {
        const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
        result = await modernSolanaTokenDelegateService.approveDelegate(
          {
            mint: address(mint),
            tokenAccount: address(tokenAccount),
            delegate: address(delegateAddress),
            amount: amountBigInt,
            decimals,
          },
          {
            network,
            signerPrivateKey: privateKey,
          }
        );
      } else {
        result = await modernSolanaTokenDelegateService.revokeDelegate(
          { tokenAccount: address(tokenAccount) },
          { network, signerPrivateKey: privateKey }
        );
      }

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Operation</Label>
        <Select value={operation} onValueChange={(v) => setOperation(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approve">Approve Delegate</SelectItem>
            <SelectItem value="revoke">Revoke Delegate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Token Account</Label>
        <Input
          placeholder="Token account address"
          value={tokenAccount}
          onChange={(e) => setTokenAccount(e.target.value)}
        />
      </div>
      {operation === 'approve' && (
        <>
          <div>
            <Label>Delegate Address</Label>
            <Input
              placeholder="Address to delegate to"
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
            />
          </div>
          <div>
            <Label>Delegated Amount</Label>
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </>
      )}
      <div>
        <Label>Owner Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button onClick={handleDelegate} className="w-full">
        {operation === 'approve' ? 'Approve Delegate' : 'Revoke Delegate'}
      </Button>
    </div>
  );
}

// Authority Management Form  
function AuthorityManagementForm({ mint, network, onResult, setLoading }: any) {
  const [authorityType, setAuthorityType] = useState<AuthorityType>('MintTokens');
  const [newAuthority, setNewAuthority] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleSetAuthority = async () => {
    setLoading(true);
    try {
      const result = await modernSolanaAuthorityService.setAuthority(
        {
          account: address(mint),
          authorityType,
          newAuthority: newAuthority ? address(newAuthority) : null,
        },
        {
          network,
          currentAuthorityPrivateKey: privateKey,
        }
      );

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Authority Type</Label>
        <Select value={authorityType} onValueChange={(v) => setAuthorityType(v as AuthorityType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MintTokens">Mint Authority</SelectItem>
            <SelectItem value="FreezeAccount">Freeze Authority</SelectItem>
            <SelectItem value="AccountOwner">Account Owner</SelectItem>
            <SelectItem value="CloseAccount">Close Authority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>New Authority (leave empty to revoke)</Label>
        <Input
          placeholder="New authority address or leave empty"
          value={newAuthority}
          onChange={(e) => setNewAuthority(e.target.value)}
        />
      </div>
      <div>
        <Label>Current Authority Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button onClick={handleSetAuthority} variant="outline" className="w-full">
        Update Authority
      </Button>
    </div>
  );
}

// Freeze Management Form
function FreezeManagementForm({ mint, network, onResult, setLoading }: any) {
  const [operation, setOperation] = useState<'freeze' | 'thaw'>('freeze');
  const [tokenAccount, setTokenAccount] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleFreeze = async () => {
    setLoading(true);
    try {
      let result;
      
      if (operation === 'freeze') {
        result = await modernSolanaFreezeService.freezeAccount(
          { tokenAccount: address(tokenAccount), mint: address(mint) },
          { network, freezeAuthorityPrivateKey: privateKey }
        );
      } else {
        result = await modernSolanaFreezeService.thawAccount(
          { tokenAccount: address(tokenAccount), mint: address(mint) },
          { network, freezeAuthorityPrivateKey: privateKey }
        );
      }

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Operation</Label>
        <Select value={operation} onValueChange={(v) => setOperation(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="freeze">Freeze Account</SelectItem>
            <SelectItem value="thaw">Thaw Account</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Token Account</Label>
        <Input
          placeholder="Token account to freeze/thaw"
          value={tokenAccount}
          onChange={(e) => setTokenAccount(e.target.value)}
        />
      </div>
      <div>
        <Label>Freeze Authority Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button 
        onClick={handleFreeze} 
        variant={operation === 'freeze' ? 'destructive' : 'default'} 
        className="w-full"
      >
        {operation === 'freeze' ? 'Freeze Account' : 'Thaw Account'}
      </Button>
    </div>
  );
}

// Account Management Form
function AccountManagementForm({ network, onResult, setLoading }: any) {
  const [operation, setOperation] = useState<'close' | 'sync'>('close');
  const [tokenAccount, setTokenAccount] = useState('');
  const [destination, setDestination] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleAccount = async () => {
    setLoading(true);
    try {
      let result;
      
      if (operation === 'close') {
        result = await modernSolanaAccountService.closeAccount(
          {
            tokenAccount: address(tokenAccount),
            destination: address(destination),
          },
          { network, ownerPrivateKey: privateKey }
        );
      } else {
        result = await modernSolanaAccountService.syncNative(
          { tokenAccount: address(tokenAccount) },
          { network, ownerPrivateKey: privateKey }
        );
      }

      onResult(result);
    } catch (error: any) {
      onResult({ success: false, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Operation</Label>
        <Select value={operation} onValueChange={(v) => setOperation(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="close">Close Account</SelectItem>
            <SelectItem value="sync">Sync Native (Wrapped SOL)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Token Account</Label>
        <Input
          placeholder="Token account address"
          value={tokenAccount}
          onChange={(e) => setTokenAccount(e.target.value)}
        />
      </div>
      {operation === 'close' && (
        <div>
          <Label>Destination (for reclaimed rent)</Label>
          <Input
            placeholder="SOL destination address"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
      )}
      <div>
        <Label>Owner Private Key</Label>
        <Input
          type="password"
          placeholder="Base58 or hex"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
      </div>
      <Button onClick={handleAccount} variant="outline" className="w-full">
        {operation === 'close' ? 'Close Account' : 'Sync Native SOL'}
      </Button>
    </div>
  );
}
