/**
 * Timelock Module Operations
 * Provides UI for locking and unlocking tokens with time delays
 */

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

interface TimelockModuleOperationsProps {
  moduleAddress: string;
  tokenAddress: string;
  chain: SupportedChain;
  environment?: 'mainnet' | 'testnet';
}

const TIMELOCK_MODULE_ABI = [
  'function lock(address user, uint256 amount, uint256 duration) external returns (uint256 lockId)',
  'function unlock(uint256 lockId) external',
  'function getLock(uint256 lockId) external view returns (uint256 amount, uint256 unlockTime, bool claimed)'
];

const ERC20_ABI = ['function approve(address spender, uint256 amount) external returns (bool)'];

export const TimelockModuleOperations: React.FC<TimelockModuleOperationsProps> = ({
  moduleAddress,
  tokenAddress,
  chain,
  environment = 'testnet'
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState('');

  const handleLock = async () => {
    try {
      setLoading(true);

      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) throw new Error('Provider not available');

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // First approve timelock to spend tokens
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amount = ethers.parseUnits(lockAmount, 18);
      
      const approveTx = await tokenContract.approve(moduleAddress, amount);
      toast({ title: 'Approving tokens...', description: 'Waiting for confirmation' });
      await approveTx.wait();

      // Then lock tokens
      const timelockContract = new ethers.Contract(moduleAddress, TIMELOCK_MODULE_ABI, signer);
      const duration = parseInt(lockDuration) * 24 * 60 * 60; // Days to seconds
      
      const lockTx = await timelockContract.lock(userAddress, amount, duration);
      toast({ title: 'Locking tokens...', description: 'Waiting for confirmation' });
      await lockTx.wait();

      toast({
        title: 'Tokens Locked',
        description: `${lockAmount} tokens locked for ${lockDuration} days`,
        variant: 'default'
      });

      setLockAmount('');
      setLockDuration('');
    } catch (error) {
      console.error('Error locking tokens:', error);
      toast({
        title: 'Lock Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Lock Tokens
        </CardTitle>
        <CardDescription>
          Lock tokens for a specified duration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Amount to Lock</Label>
          <Input
            type="number"
            value={lockAmount}
            onChange={(e) => setLockAmount(e.target.value)}
            placeholder="0.0"
          />
        </div>

        <div>
          <Label>Lock Duration (days)</Label>
          <Input
            type="number"
            value={lockDuration}
            onChange={(e) => setLockDuration(e.target.value)}
            placeholder="30"
          />
        </div>

        <Button
          onClick={handleLock}
          disabled={loading || !lockAmount || !lockDuration}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Locking...
            </>
          ) : (
            'Lock Tokens'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
