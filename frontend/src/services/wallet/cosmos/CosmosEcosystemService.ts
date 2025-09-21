/**
 * Cosmos Ecosystem Service
 * Comprehensive service for Cosmos SDK operations including IBC, staking, governance, and DeFi
 */

import { 
  StargateClient, 
  SigningStargateClient,
  calculateFee,
  GasPrice,
  DeliverTxResponse
} from '@cosmjs/stargate';

import { 
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  OfflineSigner 
} from '@cosmjs/proto-signing';

import { fromHex } from '@cosmjs/encoding';
import { Coin } from '@cosmjs/stargate';

import { 
  MsgTransfer
} from 'cosmjs-types/ibc/applications/transfer/v1/tx';

import { 
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate 
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import { 
  MsgVote
} from 'cosmjs-types/cosmos/gov/v1beta1/tx';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

// Height interface for IBC operations
interface Height {
  revisionNumber: bigint;
  revisionHeight: bigint;
}

// Vote options enum for governance
enum VoteOption {
  VOTE_OPTION_UNSPECIFIED = 0,
  VOTE_OPTION_YES = 1,
  VOTE_OPTION_ABSTAIN = 2,
  VOTE_OPTION_NO = 3,
  VOTE_OPTION_NO_WITH_VETO = 4
}

// Proposal status enum for governance
enum ProposalStatus {
  PROPOSAL_STATUS_UNSPECIFIED = 0,
  PROPOSAL_STATUS_DEPOSIT_PERIOD = 1,
  PROPOSAL_STATUS_VOTING_PERIOD = 2,
  PROPOSAL_STATUS_PASSED = 3,
  PROPOSAL_STATUS_REJECTED = 4,
  PROPOSAL_STATUS_FAILED = 5
}

export interface CosmosChainConfig {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  restUrl: string;
  prefix: string;
  symbol: string;
  denom: string;
  decimals: number;
  gasPrice: string;
  ibcEnabled: boolean;
  stakingEnabled: boolean;
  governanceEnabled: boolean;
}

export interface IBCTransferParams {
  sourceChain: string;
  destinationChain: string;
  sourceChannel: string;
  amount: string;
  denom: string;
  sender: string;
  receiver: string;
  timeoutHeight?: number;
  timeoutTimestamp?: number;
  memo?: string;
}

export interface StakingParams {
  delegatorAddress: string;
  validatorAddress: string;
  amount: string;
  denom: string;
  chain: string;
}

export interface GovernanceVoteParams {
  proposalId: bigint;
  voter: string;
  option: 'YES' | 'NO' | 'ABSTAIN' | 'NO_WITH_VETO';
  chain: string;
}

export interface LiquidStakingParams {
  amount: string;
  provider: 'stride' | 'persistence' | 'pstake' | 'quicksilver';
  sourceChain: string;
  destinationAddress: string;
}

export interface CrossChainSwapParams {
  sourceChain: string;
  destinationChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  routes: SwapRoute[];
}

export interface SwapRoute {
  poolId: bigint;
  tokenOutDenom: string;
}

export interface ValidatorInfo {
  operatorAddress: string;
  moniker: string;
  status: string;
  tokens: string;
  delegatorShares: string;
  commission: {
    rate: string;
    maxRate: string;
    maxChangeRate: string;
  };
  minSelfDelegation: string;
  jailed: boolean;
  unbondingHeight: string;
  unbondingTime: string;
  description: {
    moniker: string;
    identity: string;
    website: string;
    details: string;
  };
}

export interface ProposalInfo {
  id: string;
  content: {
    title: string;
    description: string;
  };
  status: ProposalStatus;
  submitTime: string;
  depositEndTime: string;
  votingStartTime: string;
  votingEndTime: string;
  totalDeposit: Coin[];
  finalTallyResult: {
    yes: string;
    no: string;
    abstain: string;
    noWithVeto: string;
  };
}

// ============================================================================
// COSMOS ECOSYSTEM SERVICE
// ============================================================================

export class CosmosEcosystemService {
  private clients: Map<string, StargateClient> = new Map();
  private signingClients: Map<string, SigningStargateClient> = new Map();
  private chains: Map<string, CosmosChainConfig> = new Map();

  constructor() {
    this.initializeChains();
  }

  /**
   * Initialize supported Cosmos chains
   */
  private initializeChains(): void {
    const chains: CosmosChainConfig[] = [
      {
        chainId: 'cosmoshub-4',
        chainName: 'Cosmos Hub',
        rpcUrl: import.meta.env.VITE_COSMOS_RPC_URL || 'https://rpc.cosmos.network',
        restUrl: import.meta.env.VITE_COSMOS_REST_URL || 'https://rest.cosmos.network',
        prefix: 'cosmos',
        symbol: 'ATOM',
        denom: 'uatom',
        decimals: 6,
        gasPrice: '0.025',
        ibcEnabled: true,
        stakingEnabled: true,
        governanceEnabled: true
      },
      {
        chainId: 'osmosis-1',
        chainName: 'Osmosis',
        rpcUrl: import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.osmosis.zone',
        restUrl: import.meta.env.VITE_OSMOSIS_REST_URL || 'https://lcd.osmosis.zone',
        prefix: 'osmo',
        symbol: 'OSMO',
        denom: 'uosmo',
        decimals: 6,
        gasPrice: '0.025',
        ibcEnabled: true,
        stakingEnabled: true,
        governanceEnabled: true
      },
      {
        chainId: 'juno-1',
        chainName: 'Juno',
        rpcUrl: import.meta.env.VITE_JUNO_RPC_URL || 'https://rpc-juno.itastakers.com',
        restUrl: import.meta.env.VITE_JUNO_REST_URL || 'https://lcd-juno.itastakers.com',
        prefix: 'juno',
        symbol: 'JUNO',
        denom: 'ujuno',
        decimals: 6,
        gasPrice: '0.075',
        ibcEnabled: true,
        stakingEnabled: true,
        governanceEnabled: true
      },
      {
        chainId: 'secret-4',
        chainName: 'Secret Network',
        rpcUrl: import.meta.env.VITE_SECRET_RPC_URL || 'https://rpc.secret.express',
        restUrl: import.meta.env.VITE_SECRET_REST_URL || 'https://lcd.secret.express',
        prefix: 'secret',
        symbol: 'SCRT',
        denom: 'uscrt',
        decimals: 6,
        gasPrice: '0.25',
        ibcEnabled: true,
        stakingEnabled: true,
        governanceEnabled: true
      }
    ];

    chains.forEach(chain => {
      this.chains.set(chain.chainId, chain);
    });
  }

  /**
   * Get or create client for chain
   */
  private async getClient(chainId: string): Promise<StargateClient> {
    if (!this.clients.has(chainId)) {
      const config = this.chains.get(chainId);
      if (!config) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }
      const client = await StargateClient.connect(config.rpcUrl);
      this.clients.set(chainId, client);
    }
    return this.clients.get(chainId)!;
  }

  /**
   * Get or create signing client for chain
   */
  private async getSigningClient(
    chainId: string,
    signer: OfflineSigner
  ): Promise<SigningStargateClient> {
    const key = `${chainId}_${await signer.getAccounts().then(a => a[0].address)}`;
    
    if (!this.signingClients.has(key)) {
      const config = this.chains.get(chainId);
      if (!config) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }
      
      const gasPrice = GasPrice.fromString(`${config.gasPrice}${config.denom}`);
      const client = await SigningStargateClient.connectWithSigner(
        config.rpcUrl,
        signer,
        { gasPrice }
      );
      this.signingClients.set(key, client);
    }
    return this.signingClients.get(key)!;
  }

  // ============================================================================
  // IBC TRANSFERS
  // ============================================================================

  /**
   * Execute IBC transfer between Cosmos chains
   */
  async executeIBCTransfer(
    params: IBCTransferParams,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    const sourceConfig = this.chains.get(params.sourceChain);
    if (!sourceConfig) {
      throw new Error(`Unsupported source chain: ${params.sourceChain}`);
    }

    // Create wallet from private key
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(
      privKeyBytes,
      sourceConfig.prefix
    );

    // Get signing client
    const signingClient = await this.getSigningClient(params.sourceChain, wallet);

    // Create IBC transfer message
    const msg = {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      value: MsgTransfer.fromPartial({
        sourcePort: 'transfer',
        sourceChannel: params.sourceChannel,
        token: {
          denom: params.denom,
          amount: params.amount
        },
        sender: params.sender,
        receiver: params.receiver,
        timeoutHeight: params.timeoutHeight ? {
          revisionNumber: BigInt(0),
          revisionHeight: BigInt(params.timeoutHeight)
        } : undefined,
        timeoutTimestamp: params.timeoutTimestamp ? 
          BigInt(params.timeoutTimestamp) : 
          BigInt(Date.now() + 600000) * BigInt(1000000), // 10 minutes from now
        memo: params.memo || ''
      })
    };

    // Calculate fee
    const gasPrice = GasPrice.fromString(`${sourceConfig.gasPrice}${sourceConfig.denom}`);
    const fee = calculateFee(150000, gasPrice);

    // Execute transfer
    const result = await signingClient.signAndBroadcast(
      params.sender,
      [msg],
      fee,
      params.memo || ''
    );

    if (result.code !== 0) {
      throw new Error(`IBC transfer failed: ${result.rawLog}`);
    }

    return result;
  }

  /**
   * Get IBC channels for a chain
   */
  async getIBCChannels(chainId: string): Promise<any[]> {
    const config = this.chains.get(chainId);
    if (!config || !config.ibcEnabled) {
      return [];
    }

    try {
      const response = await fetch(`${config.restUrl}/ibc/core/channel/v1/channels`);
      const data = await response.json();
      return data.channels || [];
    } catch (error) {
      console.error(`Failed to get IBC channels for ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get IBC denom trace
   */
  async getIBCDenomTrace(chainId: string, hash: string): Promise<any> {
    const config = this.chains.get(chainId);
    if (!config) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    try {
      const response = await fetch(`${config.restUrl}/ibc/apps/transfer/v1/denom_traces/${hash}`);
      const data = await response.json();
      return data.denom_trace;
    } catch (error) {
      console.error(`Failed to get denom trace:`, error);
      return null;
    }
  }

  // ============================================================================
  // STAKING
  // ============================================================================

  /**
   * Delegate tokens to validator
   */
  async delegate(
    params: StakingParams,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    const config = this.chains.get(params.chain);
    if (!config || !config.stakingEnabled) {
      throw new Error(`Staking not supported on chain: ${params.chain}`);
    }

    // Create wallet
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, config.prefix);
    
    // Get signing client
    const signingClient = await this.getSigningClient(params.chain, wallet);

    // Create delegate message
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: MsgDelegate.fromPartial({
        delegatorAddress: params.delegatorAddress,
        validatorAddress: params.validatorAddress,
        amount: {
          denom: params.denom,
          amount: params.amount
        }
      })
    };

    // Calculate fee
    const gasPrice = GasPrice.fromString(`${config.gasPrice}${config.denom}`);
    const fee = calculateFee(250000, gasPrice);

    // Execute delegation
    const result = await signingClient.signAndBroadcast(
      params.delegatorAddress,
      [msg],
      fee,
      'Staking delegation'
    );

    if (result.code !== 0) {
      throw new Error(`Delegation failed: ${result.rawLog}`);
    }

    return result;
  }

  /**
   * Undelegate tokens from validator
   */
  async undelegate(
    params: StakingParams,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    const config = this.chains.get(params.chain);
    if (!config || !config.stakingEnabled) {
      throw new Error(`Staking not supported on chain: ${params.chain}`);
    }

    // Create wallet
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, config.prefix);
    
    // Get signing client
    const signingClient = await this.getSigningClient(params.chain, wallet);

    // Create undelegate message
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: MsgUndelegate.fromPartial({
        delegatorAddress: params.delegatorAddress,
        validatorAddress: params.validatorAddress,
        amount: {
          denom: params.denom,
          amount: params.amount
        }
      })
    };

    // Calculate fee
    const gasPrice = GasPrice.fromString(`${config.gasPrice}${config.denom}`);
    const fee = calculateFee(250000, gasPrice);

    // Execute undelegation
    const result = await signingClient.signAndBroadcast(
      params.delegatorAddress,
      [msg],
      fee,
      'Staking undelegation'
    );

    if (result.code !== 0) {
      throw new Error(`Undelegation failed: ${result.rawLog}`);
    }

    return result;
  }

  /**
   * Redelegate tokens between validators
   */
  async redelegate(
    delegatorAddress: string,
    srcValidatorAddress: string,
    dstValidatorAddress: string,
    amount: string,
    denom: string,
    chain: string,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    const config = this.chains.get(chain);
    if (!config || !config.stakingEnabled) {
      throw new Error(`Staking not supported on chain: ${chain}`);
    }

    // Create wallet
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, config.prefix);
    
    // Get signing client
    const signingClient = await this.getSigningClient(chain, wallet);

    // Create redelegate message
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: MsgBeginRedelegate.fromPartial({
        delegatorAddress,
        validatorSrcAddress: srcValidatorAddress,
        validatorDstAddress: dstValidatorAddress,
        amount: {
          denom,
          amount
        }
      })
    };

    // Calculate fee
    const gasPrice = GasPrice.fromString(`${config.gasPrice}${config.denom}`);
    const fee = calculateFee(300000, gasPrice);

    // Execute redelegation
    const result = await signingClient.signAndBroadcast(
      delegatorAddress,
      [msg],
      fee,
      'Staking redelegation'
    );

    if (result.code !== 0) {
      throw new Error(`Redelegation failed: ${result.rawLog}`);
    }

    return result;
  }

  /**
   * Get validators for a chain
   */
  async getValidators(chainId: string, status?: string): Promise<ValidatorInfo[]> {
    const config = this.chains.get(chainId);
    if (!config || !config.stakingEnabled) {
      return [];
    }

    try {
      const url = `${config.restUrl}/cosmos/staking/v1beta1/validators${
        status ? `?status=${status}` : ''
      }`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.validators || [];
    } catch (error) {
      console.error(`Failed to get validators for ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get delegations for an address
   */
  async getDelegations(chainId: string, delegatorAddress: string): Promise<any[]> {
    const config = this.chains.get(chainId);
    if (!config || !config.stakingEnabled) {
      return [];
    }

    try {
      const response = await fetch(
        `${config.restUrl}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`
      );
      const data = await response.json();
      return data.delegation_responses || [];
    } catch (error) {
      console.error(`Failed to get delegations:`, error);
      return [];
    }
  }

  /**
   * Get staking rewards
   */
  async getStakingRewards(chainId: string, delegatorAddress: string): Promise<any> {
    const config = this.chains.get(chainId);
    if (!config || !config.stakingEnabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${config.restUrl}/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get staking rewards:`, error);
      return null;
    }
  }

  // ============================================================================
  // GOVERNANCE
  // ============================================================================

  /**
   * Vote on governance proposal
   */
  async voteOnProposal(
    params: GovernanceVoteParams,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    const config = this.chains.get(params.chain);
    if (!config || !config.governanceEnabled) {
      throw new Error(`Governance not supported on chain: ${params.chain}`);
    }

    // Create wallet
    const privKeyBytes = fromHex(privateKey.replace('0x', ''));
    const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, config.prefix);
    
    // Get signing client
    const signingClient = await this.getSigningClient(params.chain, wallet);

    // Map vote option
    const voteOptionMap: { [key: string]: VoteOption } = {
      'YES': VoteOption.VOTE_OPTION_YES,
      'NO': VoteOption.VOTE_OPTION_NO,
      'ABSTAIN': VoteOption.VOTE_OPTION_ABSTAIN,
      'NO_WITH_VETO': VoteOption.VOTE_OPTION_NO_WITH_VETO
    };

    // Create vote message
    const msg = {
      typeUrl: '/cosmos.gov.v1beta1.MsgVote',
      value: MsgVote.fromPartial({
        proposalId: params.proposalId,
        voter: params.voter,
        option: voteOptionMap[params.option]
      })
    };

    // Calculate fee
    const gasPrice = GasPrice.fromString(`${config.gasPrice}${config.denom}`);
    const fee = calculateFee(100000, gasPrice);

    // Execute vote
    const result = await signingClient.signAndBroadcast(
      params.voter,
      [msg],
      fee,
      `Vote ${params.option} on proposal ${params.proposalId}`
    );

    if (result.code !== 0) {
      throw new Error(`Vote failed: ${result.rawLog}`);
    }

    return result;
  }

  /**
   * Get governance proposals
   */
  async getProposals(chainId: string, status?: string): Promise<ProposalInfo[]> {
    const config = this.chains.get(chainId);
    if (!config || !config.governanceEnabled) {
      return [];
    }

    try {
      const url = `${config.restUrl}/cosmos/gov/v1beta1/proposals${
        status ? `?proposal_status=${status}` : ''
      }`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.proposals || [];
    } catch (error) {
      console.error(`Failed to get proposals for ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Get proposal details
   */
  async getProposal(chainId: string, proposalId: string): Promise<ProposalInfo | null> {
    const config = this.chains.get(chainId);
    if (!config || !config.governanceEnabled) {
      return null;
    }

    try {
      const response = await fetch(
        `${config.restUrl}/cosmos/gov/v1beta1/proposals/${proposalId}`
      );
      const data = await response.json();
      return data.proposal;
    } catch (error) {
      console.error(`Failed to get proposal ${proposalId}:`, error);
      return null;
    }
  }

  /**
   * Get votes for a proposal
   */
  async getProposalVotes(chainId: string, proposalId: string): Promise<any[]> {
    const config = this.chains.get(chainId);
    if (!config || !config.governanceEnabled) {
      return [];
    }

    try {
      const response = await fetch(
        `${config.restUrl}/cosmos/gov/v1beta1/proposals/${proposalId}/votes`
      );
      const data = await response.json();
      return data.votes || [];
    } catch (error) {
      console.error(`Failed to get votes for proposal ${proposalId}:`, error);
      return [];
    }
  }

  // ============================================================================
  // LIQUID STAKING
  // ============================================================================

  /**
   * Execute liquid staking through providers like Stride, Persistence, pStake
   */
  async executeLiquidStaking(
    params: LiquidStakingParams,
    privateKey: string
  ): Promise<DeliverTxResponse> {
    // Provider-specific IBC channels
    const liquidStakingChannels: { [key: string]: { [key: string]: string } } = {
      'stride': {
        'cosmoshub-4': 'channel-391', // Cosmos to Stride
        'osmosis-1': 'channel-326',    // Osmosis to Stride
        'juno-1': 'channel-202'        // Juno to Stride
      },
      'persistence': {
        'cosmoshub-4': 'channel-190',  // Cosmos to Persistence
        'osmosis-1': 'channel-4'       // Osmosis to Persistence
      },
      'quicksilver': {
        'cosmoshub-4': 'channel-467',  // Cosmos to Quicksilver
        'osmosis-1': 'channel-522'     // Osmosis to Quicksilver
      }
    };

    const channel = liquidStakingChannels[params.provider]?.[params.sourceChain];
    if (!channel) {
      throw new Error(
        `Liquid staking not available from ${params.sourceChain} via ${params.provider}`
      );
    }

    // Map provider to receiver address format
    const receiverPrefix: { [key: string]: string } = {
      'stride': 'stride',
      'persistence': 'persistence',
      'pstake': 'persistence',
      'quicksilver': 'quick'
    };

    // Execute IBC transfer to liquid staking provider
    return this.executeIBCTransfer(
      {
        sourceChain: params.sourceChain,
        destinationChain: params.provider,
        sourceChannel: channel,
        amount: params.amount,
        denom: this.chains.get(params.sourceChain)?.denom || 'uatom',
        sender: params.destinationAddress,
        receiver: params.destinationAddress.replace(
          /^[a-z]+/,
          receiverPrefix[params.provider]
        ),
        memo: 'Liquid staking deposit'
      },
      privateKey
    );
  }

  /**
   * Get liquid staking APR/APY rates
   */
  async getLiquidStakingRates(provider: string): Promise<{
    apr: number;
    apy: number;
    totalStaked: string;
    exchangeRate: number;
  }> {
    // In production, fetch from provider APIs
    // For now, return estimated rates
    const rates: { [key: string]: any } = {
      'stride': { apr: 15.2, apy: 16.4, totalStaked: '100000000', exchangeRate: 1.05 },
      'persistence': { apr: 14.8, apy: 15.9, totalStaked: '50000000', exchangeRate: 1.04 },
      'quicksilver': { apr: 14.5, apy: 15.6, totalStaked: '30000000', exchangeRate: 1.03 }
    };

    return rates[provider] || { apr: 0, apy: 0, totalStaked: '0', exchangeRate: 1 };
  }

  // ============================================================================
  // DEFI INTEGRATIONS (Removed Osmosis-specific code for now)
  // ============================================================================

  /**
   * Execute basic token swap (simplified implementation)
   */
  async executeTokenSwap(
    chainId: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string,
    privateKey: string
  ): Promise<string> {
    // This is a placeholder for DEX integrations
    // In production, this would integrate with Osmosis, Uniswap on Cosmos chains, etc.
    console.log(`Swap on ${chainId}: ${amountIn} ${tokenIn} for ${tokenOut} (min: ${minAmountOut})`);
    
    // Return transaction hash placeholder
    return `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  /**
   * Get swap routes for token pair (simplified)
   */
  async getSwapRoutes(
    chainId: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<SwapRoute[]> {
    // Placeholder implementation
    // In production, this would query DEX APIs for optimal routes
    const routes: SwapRoute[] = [
      { poolId: BigInt(1), tokenOutDenom: tokenOut }
    ];

    return routes;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get chain configuration
   */
  getChainConfig(chainId: string): CosmosChainConfig | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return Array.from(this.chains.keys());
  }

  /**
   * Check if chain supports feature
   */
  isFeatureSupported(chainId: string, feature: 'ibc' | 'staking' | 'governance'): boolean {
    const config = this.chains.get(chainId);
    if (!config) return false;

    switch (feature) {
      case 'ibc':
        return config.ibcEnabled;
      case 'staking':
        return config.stakingEnabled;
      case 'governance':
        return config.governanceEnabled;
      default:
        return false;
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnect(): Promise<void> {
    for (const [, client] of this.clients) {
      await client.disconnect();
    }
    this.clients.clear();
    this.signingClients.clear();
  }
}

// Export singleton instance
export const cosmosEcosystemService = new CosmosEcosystemService();