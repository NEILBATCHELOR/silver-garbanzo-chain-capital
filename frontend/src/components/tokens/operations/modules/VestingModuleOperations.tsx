/**
 * Vesting Module Operations
 * 
 * Provides UI for interacting with vesting schedules:
 * - View vesting schedule details
 * - Claim vested tokens
 * - Check claimable balance
 * - View vesting progress
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

interface VestingModuleOperationsProps {
  moduleAddress: string;
  tokenAddress: string;
  chain: SupportedChain;
  environment?: 'mainnet' | 'testnet';
}

interface VestingSchedule {
  amount: bigint;
  claimed: bigint;
  vested: bigint;
  startTime: bigint;
  cliffDuration: bigint;
  vestingDuration: bigint;
  revocable: boolean;
}

const VESTING_MODULE_ABI = [
  'function claim() external returns (uint256)',
  'function getVestingSchedule(address beneficiary) external view returns (uint256 amount, uint256 claimed, uint256 vested, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, bool revocable)',
  'function getClaimableAmount(address beneficiary) external view returns (uint256)'
];

export const VestingModuleOperations: React.FC<VestingModuleOperationsProps> = ({
  moduleAddress,
  tokenAddress,
  chain,
  environment = 'testnet'
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [schedule, setSchedule] = useState<VestingSchedule | null>(null);
  const [claimableAmount, setClaimableAmount] = useState<bigint>(BigInt(0));
  const [userAddress, setUserAddress] = useState<string>('');

  // Load vesting schedule on mount
  useEffect(() => {
    loadSchedule();
  }, [moduleAddress, chain]);

  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);

      // Get provider and signer
      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Get user address from provider
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      setUserAddress(address);

      // Create contract instance
      const vestingContract = new ethers.Contract(moduleAddress, VESTING_MODULE_ABI, provider);

      // Get vesting schedule
      const scheduleData = await vestingContract.getVestingSchedule(address);
      
      setSchedule({
        amount: scheduleData[0],
        claimed: scheduleData[1],
        vested: scheduleData[2],
        startTime: scheduleData[3],
        cliffDuration: scheduleData[4],
        vestingDuration: scheduleData[5],
        revocable: scheduleData[6]
      });

      // Get claimable amount
      const claimable = await vestingContract.getClaimableAmount(address);
      setClaimableAmount(claimable);

    } catch (error) {
      console.error('Error loading vesting schedule:', error);
      toast({
        title: 'Failed to load schedule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleClaim = async () => {
    try {
      setLoading(true);

      // Get provider and signer
      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) {
        throw new Error('Provider not available');
      }

      const signer = await provider.getSigner();

      // Create contract instance
      const vestingContract = new ethers.Contract(moduleAddress, VESTING_MODULE_ABI, signer);

      // Claim tokens
      const tx = await vestingContract.claim();
      
      toast({
        title: 'Transaction Submitted',
        description: `Claiming vested tokens...`,
      });

      await tx.wait();

      toast({
        title: 'Tokens Claimed',
        description: `Successfully claimed ${ethers.formatUnits(claimableAmount, 18)} tokens`,
        variant: 'default'
      });

      // Reload schedule
      await loadSchedule();

    } catch (error) {
      console.error('Error claiming tokens:', error);
      toast({
        title: 'Claim Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate vesting progress
  const calculateProgress = () => {
    if (!schedule || schedule.amount === BigInt(0)) return 0;
    return Number((schedule.vested * BigInt(100)) / schedule.amount);
  };

  // Format date
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  // Calculate cliff end date
  const getCliffEnd = () => {
    if (!schedule) return '';
    const cliffEnd = Number(schedule.startTime) + Number(schedule.cliffDuration);
    return formatDate(BigInt(cliffEnd));
  };

  // Calculate vesting end date
  const getVestingEnd = () => {
    if (!schedule) return '';
    const vestingEnd = Number(schedule.startTime) + Number(schedule.vestingDuration);
    return formatDate(BigInt(vestingEnd));
  };

  // Check if cliff has passed
  const isCliffPassed = () => {
    if (!schedule) return false;
    const now = Math.floor(Date.now() / 1000);
    const cliffEnd = Number(schedule.startTime) + Number(schedule.cliffDuration);
    return now >= cliffEnd;
  };

  if (loadingSchedule) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!schedule || schedule.amount === BigInt(0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vesting Schedule</CardTitle>
          <CardDescription>No vesting schedule found for your address</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any vesting schedules assigned to your address.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schedule Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Vesting Schedule</CardTitle>
              <CardDescription>View and manage your vested tokens</CardDescription>
            </div>
            {schedule.revocable && (
              <Badge variant="outline" className="bg-yellow-50">Revocable</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vesting Progress</span>
              <span className="font-medium">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                {ethers.formatUnits(schedule.amount, 18)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Already Claimed</p>
              <p className="text-2xl font-bold text-green-600">
                {ethers.formatUnits(schedule.claimed, 18)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Currently Vested</p>
              <p className="text-2xl font-bold text-blue-600">
                {ethers.formatUnits(schedule.vested, 18)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Claimable Now</p>
              <p className="text-2xl font-bold text-primary">
                {ethers.formatUnits(claimableAmount, 18)}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold">Vesting Timeline</h4>
            
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Start Date</p>
                <p className="text-muted-foreground">{formatDate(schedule.startTime)}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Cliff End</p>
                <p className="text-muted-foreground">{getCliffEnd()}</p>
              </div>
              {isCliffPassed() ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Vesting End</p>
                <p className="text-muted-foreground">{getVestingEnd()}</p>
              </div>
            </div>
          </div>

          {/* Cliff Warning */}
          {!isCliffPassed() && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                You must wait until the cliff period ends ({getCliffEnd()}) before claiming any tokens.
              </AlertDescription>
            </Alert>
          )}

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            disabled={loading || claimableAmount === BigInt(0) || !isCliffPassed()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Claiming...
              </>
            ) : (
              `Claim ${ethers.formatUnits(claimableAmount, 18)} Tokens`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
