/**
 * Cosmos Staking Interface
 * Comprehensive UI for Cosmos ecosystem staking operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Coins,
  Lock,
  TrendingUp,
  Users,
  Vote,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Send,
  ArrowRightLeft,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { cosmosEcosystemService } from '@/services/wallet/cosmos';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import type { 
  ValidatorInfo, 
  ProposalInfo,
  StakingParams,
  GovernanceVoteParams 
} from '@/services/wallet/cosmos';

interface CosmosStakingInterfaceProps {
  wallet: any;
  chainId?: string;
}

export const CosmosStakingInterface: React.FC<CosmosStakingInterfaceProps> = ({ 
  wallet, 
  chainId = 'cosmoshub-4' 
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{ 
    available: string; 
    staked: string; 
    unbonding: string;
    rewards: string;
  }>({
    available: '0',
    staked: '0',
    unbonding: '0',
    rewards: '0'
  });
  
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<string>('');
  const [delegations, setDelegations] = useState<any[]>([]);
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  
  // Staking form state
  const [stakingAmount, setStakingAmount] = useState('');
  const [unstakingAmount, setUnstakingAmount] = useState('');
  const [redelegateAmount, setRedelegateAmount] = useState('');
  const [targetValidator, setTargetValidator] = useState('');
  
  // IBC Transfer state
  const [ibcTargetChain, setIbcTargetChain] = useState('');
  const [ibcAmount, setIbcAmount] = useState('');
  
  // Load initial data
  useEffect(() => {
    if (wallet?.address) {
      loadAccountData();
      loadValidators();
      loadProposals();
    }
  }, [wallet, chainId]);
  
  // Helper function to get private key from key vault
  const getPrivateKey = async (): Promise<string> => {
    try {
      if (!wallet?.keyVaultId) {
        throw new Error('Wallet does not have key vault ID');
      }
      
      const keyResult = await keyVaultClient.getKey(wallet.keyVaultId);
      
      // Handle both string and KeyData object types
      if (typeof keyResult === 'string') {
        return keyResult;
      } else {
        return keyResult.privateKey;
      }
    } catch (error) {
      console.error('Failed to retrieve private key from key vault:', error);
      throw error;
    }
  };
  
  const loadAccountData = async () => {
    if (!wallet?.address) return;
    
    try {
      setLoading(true);
      
      // Get balances
      const balances = await cosmosEcosystemService.getBalances(chainId, wallet.address);
      const stakingInfo = await cosmosEcosystemService.getStakingInfo(chainId, wallet.address);
      
      setBalance({
        available: balances.available || '0',
        staked: stakingInfo.totalStaked || '0',
        unbonding: stakingInfo.totalUnbonding || '0',
        rewards: stakingInfo.totalRewards || '0'
      });
      
      setDelegations(stakingInfo.delegations || []);
    } catch (error) {
      console.error('Failed to load account data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };
  
  const loadValidators = async () => {
    try {
      const validatorList = await cosmosEcosystemService.getValidators(chainId);
      setValidators(validatorList.slice(0, 20)); // Top 20 validators
    } catch (error) {
      console.error('Failed to load validators:', error);
    }
  };
  
  const loadProposals = async () => {
    try {
      const proposalList = await cosmosEcosystemService.getGovernanceProposals(chainId);
      // Filter proposals by numeric status value for voting period (ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD = 2)
      setProposals(proposalList.filter(p => p.status === 2));
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  };
  
  // Staking operations
  const handleStake = async () => {
    if (!stakingAmount || !selectedValidator) {
      toast.error('Please enter amount and select validator');
      return;
    }
    
    try {
      setLoading(true);
      
      const params: StakingParams = {
        delegatorAddress: wallet.address,
        validatorAddress: selectedValidator,
        amount: stakingAmount,
        denom: 'uatom',
        chain: chainId
      };
      
      const result = await cosmosEcosystemService.stake(chainId, wallet.address, params);
      
      toast.success(`Staked ${stakingAmount} ATOM successfully`);
      setStakingAmount('');
      await loadAccountData();
    } catch (error) {
      console.error('Staking failed:', error);
      toast.error('Staking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnstake = async () => {
    if (!unstakingAmount || !selectedValidator) {
      toast.error('Please enter amount and select validator');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await cosmosEcosystemService.unstake(
        chainId,
        wallet.address,
        {
          validatorAddress: selectedValidator,
          amount: unstakingAmount,
          denom: 'uatom'
        }
      );
      
      toast.success(`Started unbonding ${unstakingAmount} ATOM (21 day unbonding period)`);
      setUnstakingAmount('');
      await loadAccountData();
    } catch (error) {
      console.error('Unstaking failed:', error);
      toast.error('Unstaking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClaimRewards = async () => {
    try {
      setLoading(true);
      
      // Claim rewards from all validators
      for (const delegation of delegations) {
        await cosmosEcosystemService.claimRewards(
          chainId,
          wallet.address,
          delegation.validatorAddress
        );
      }
      
      toast.success('Claimed all rewards successfully');
      await loadAccountData();
    } catch (error) {
      console.error('Claim rewards failed:', error);
      toast.error('Failed to claim rewards');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRedelegate = async () => {
    if (!redelegateAmount || !selectedValidator || !targetValidator) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await cosmosEcosystemService.redelegate(
        wallet.address,
        selectedValidator,
        targetValidator,
        redelegateAmount,
        'uatom',
        chainId,
        await getPrivateKey()
      );
      
      toast.success('Redelegation successful');
      setRedelegateAmount('');
      setTargetValidator('');
      await loadAccountData();
    } catch (error) {
      console.error('Redelegation failed:', error);
      toast.error('Redelegation failed');
    } finally {
      setLoading(false);
    }
  };
  
  // IBC Transfer
  const handleIBCTransfer = async () => {
    if (!ibcAmount || !ibcTargetChain) {
      toast.error('Please enter amount and select target chain');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await cosmosEcosystemService.ibcTransfer(
        chainId,
        wallet.address,
        {
          sourcePort: 'transfer',
          sourceChannel: getIBCChannel(ibcTargetChain),
          token: { denom: 'uatom', amount: ibcAmount },
          receiver: wallet.address, // Same address on target chain
          timeoutHeight: {
            revisionNumber: 0,
            revisionHeight: 0
          },
          timeoutTimestamp: Date.now() + 600000 // 10 minutes
        }
      );
      
      toast.success(`IBC Transfer initiated to ${ibcTargetChain}`);
      setIbcAmount('');
      setIbcTargetChain('');
      await loadAccountData();
    } catch (error) {
      console.error('IBC transfer failed:', error);
      toast.error('IBC transfer failed');
    } finally {
      setLoading(false);
    }
  };
  
  const getIBCChannel = (targetChain: string): string => {
    // Map of common IBC channels from Cosmos Hub
    const channels: Record<string, string> = {
      'osmosis-1': 'channel-141',
      'juno-1': 'channel-207',
      'akash': 'channel-184',
      'secret-4': 'channel-235',
      'stargaze-1': 'channel-339',
      'evmos_9001-2': 'channel-292'
    };
    
    return channels[targetChain] || 'channel-0';
  };
  
  // Governance voting
  const handleVote = async (proposalId: string, voteOption: string) => {
    try {
      setLoading(true);
      
      const params: GovernanceVoteParams = {
        proposalId: BigInt(proposalId), // Convert to bigint
        voter: wallet.address,
        option: voteOption as 'YES' | 'NO' | 'ABSTAIN' | 'NO_WITH_VETO',
        chain: chainId
      };
      
      const result = await cosmosEcosystemService.voteOnProposal(params, await getPrivateKey());
      
      toast.success(`Voted ${voteOption} on proposal #${proposalId}`);
      await loadProposals();
    } catch (error) {
      console.error('Voting failed:', error);
      toast.error('Voting failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cosmos Hub Staking
          </CardTitle>
          <CardDescription>
            Manage your ATOM staking and governance participation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{balance.available} ATOM</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Staked</p>
              <p className="text-2xl font-bold text-green-500">{balance.staked} ATOM</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Unbonding</p>
              <p className="text-2xl font-bold text-orange-500">{balance.unbonding} ATOM</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Rewards</p>
              <p className="text-2xl font-bold text-purple-500">{balance.rewards} ATOM</p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={handleClaimRewards}
              disabled={loading || parseFloat(balance.rewards) === 0}
              size="sm"
              variant="outline"
            >
              <Coins className="mr-2 h-4 w-4" />
              Claim Rewards
            </Button>
            <Button
              onClick={loadAccountData}
              disabled={loading}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Staking Tabs */}
      <Tabs defaultValue="stake" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stake">Stake</TabsTrigger>
          <TabsTrigger value="unstake">Unstake</TabsTrigger>
          <TabsTrigger value="redelegate">Redelegate</TabsTrigger>
          <TabsTrigger value="ibc">IBC Transfer</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>
        
        {/* Staking Tab */}
        <TabsContent value="stake" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stake ATOM</CardTitle>
              <CardDescription>
                Delegate your ATOM to validators and earn staking rewards (~18% APR)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Validator</Label>
                <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a validator" />
                  </SelectTrigger>
                  <SelectContent>
                    {validators.map((validator) => (
                      <SelectItem key={validator.operatorAddress} value={validator.operatorAddress}>
                        <div className="flex items-center justify-between w-full">
                          <span>{validator.description.moniker}</span>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">
                              {(parseFloat(validator.commission.rate) * 100).toFixed(1)}% fee
                            </Badge>
                            <Badge variant="secondary">
                              {validator.jailed ? 'Jailed' : 'Active'}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedValidator && validators.find(v => v.operatorAddress === selectedValidator) && (
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Voting Power:</span>{' '}
                    {validators.find(v => v.operatorAddress === selectedValidator)?.tokens || '0'}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Commission:</span>{' '}
                    {(parseFloat(validators.find(v => v.operatorAddress === selectedValidator)?.commission.rate || '0') * 100).toFixed(2)}%
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Amount to Stake</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakingAmount}
                    onChange={(e) => setStakingAmount(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setStakingAmount(balance.available)}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available: {balance.available} ATOM
                </p>
              </div>
              
              <Button
                onClick={handleStake}
                disabled={loading || !stakingAmount || !selectedValidator}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Stake ATOM
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Unstaking Tab */}
        <TabsContent value="unstake" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unstake ATOM</CardTitle>
              <CardDescription>
                Undelegate your ATOM (21 day unbonding period)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Delegation</Label>
                <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose delegation to unstake from" />
                  </SelectTrigger>
                  <SelectContent>
                    {delegations.map((delegation) => (
                      <SelectItem key={delegation.validatorAddress} value={delegation.validatorAddress}>
                        <div className="flex items-center justify-between w-full">
                          <span>{delegation.validatorName}</span>
                          <Badge variant="outline">
                            {delegation.amount} ATOM
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Amount to Unstake</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={unstakingAmount}
                    onChange={(e) => setUnstakingAmount(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const delegation = delegations.find(d => d.validatorAddress === selectedValidator);
                      if (delegation) setUnstakingAmount(delegation.amount);
                    }}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900 dark:text-yellow-400">
                      21 Day Unbonding Period
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-500">
                      Your ATOM will be locked for 21 days and won't earn rewards during unbonding.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleUnstake}
                disabled={loading || !unstakingAmount || !selectedValidator}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Begin Unstaking
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Redelegate Tab */}
        <TabsContent value="redelegate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redelegate ATOM</CardTitle>
              <CardDescription>
                Move your delegation to another validator without unbonding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>From Validator</Label>
                <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source validator" />
                  </SelectTrigger>
                  <SelectContent>
                    {delegations.map((delegation) => (
                      <SelectItem key={delegation.validatorAddress} value={delegation.validatorAddress}>
                        {delegation.validatorName} ({delegation.amount} ATOM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>To Validator</Label>
                <Select value={targetValidator} onValueChange={setTargetValidator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target validator" />
                  </SelectTrigger>
                  <SelectContent>
                    {validators
                      .filter(v => v.operatorAddress !== selectedValidator)
                      .map((validator) => (
                        <SelectItem key={validator.operatorAddress} value={validator.operatorAddress}>
                          {validator.description.moniker}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={redelegateAmount}
                  onChange={(e) => setRedelegateAmount(e.target.value)}
                />
              </div>
              
              <Button
                onClick={handleRedelegate}
                disabled={loading || !redelegateAmount || !selectedValidator || !targetValidator}
                className="w-full"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Redelegate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* IBC Transfer Tab */}
        <TabsContent value="ibc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IBC Transfer</CardTitle>
              <CardDescription>
                Transfer ATOM to other Cosmos chains via IBC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Chain</Label>
                <Select value={ibcTargetChain} onValueChange={setIbcTargetChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="osmosis-1">Osmosis</SelectItem>
                    <SelectItem value="juno-1">Juno</SelectItem>
                    <SelectItem value="akash">Akash</SelectItem>
                    <SelectItem value="secret-4">Secret Network</SelectItem>
                    <SelectItem value="stargaze-1">Stargaze</SelectItem>
                    <SelectItem value="evmos_9001-2">Evmos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={ibcAmount}
                    onChange={(e) => setIbcAmount(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setIbcAmount(balance.available)}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available: {balance.available} ATOM
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-700 dark:text-blue-400">
                      IBC transfers typically complete in 1-2 minutes
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleIBCTransfer}
                disabled={loading || !ibcAmount || !ibcTargetChain}
                className="w-full"
              >
                <Send className="mr-2 h-4 w-4" />
                Transfer via IBC
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Governance Tab */}
        <TabsContent value="governance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Proposals</CardTitle>
              <CardDescription>
                Vote on governance proposals to shape the future of Cosmos Hub
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No active proposals at the moment
                </p>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">
                            #{proposal.id} - {proposal.content.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {proposal.content.description.substring(0, 150)}...
                          </p>
                        </div>
                        <Badge>
                          {proposal.status.toString().replace('PROPOSAL_STATUS_', '')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Voting Progress</span>
                          <span>{parseInt(proposal.finalTallyResult.yes) + parseInt(proposal.finalTallyResult.no) + parseInt(proposal.finalTallyResult.abstain) + parseInt(proposal.finalTallyResult.noWithVeto)} votes</span>
                        </div>
                        <Progress value={parseFloat(proposal.finalTallyResult.yes || '0') / (parseFloat(proposal.finalTallyResult.yes || '0') + parseFloat(proposal.finalTallyResult.no || '0') + parseFloat(proposal.finalTallyResult.abstain || '0') + parseFloat(proposal.finalTallyResult.noWithVeto || '0')) * 100} className="h-2" />
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <div className="text-green-500">
                            Yes: {proposal.finalTallyResult.yes}
                          </div>
                          <div className="text-red-500">
                            No: {proposal.finalTallyResult.no}
                          </div>
                          <div className="text-yellow-500">
                            Veto: {proposal.finalTallyResult.noWithVeto}
                          </div>
                          <div className="text-gray-500">
                            Abstain: {proposal.finalTallyResult.abstain}
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, 'YES')}
                          disabled={loading}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, 'NO')}
                          disabled={loading}
                        >
                          No
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, 'NO_WITH_VETO')}
                          disabled={loading}
                        >
                          Veto
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(proposal.id, 'ABSTAIN')}
                          disabled={loading}
                        >
                          Abstain
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Current Delegations */}
      {delegations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Delegations</CardTitle>
            <CardDescription>
              Active stakes across validators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {delegations.map((delegation) => (
                <div key={delegation.validatorAddress} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{delegation.validatorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {delegation.validatorAddress.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">{delegation.amount} ATOM</p>
                    <p className="text-sm text-green-500">
                      +{delegation.rewards} rewards
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CosmosStakingInterface;
