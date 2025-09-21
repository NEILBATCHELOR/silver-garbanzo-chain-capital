/**
 * Cosmos Transaction Builder
 * Comprehensive Cosmos SDK transaction building with IBC, staking, governance support
 * Supports all Cosmos-based chains including Cosmos Hub, Osmosis, Juno, Secret, etc.
 */

import {
  StargateClient,
  SigningStargateClient,
  GasPrice,
  calculateFee,
  DeliverTxResponse,
  StdFee,
  coins,
  coin,
} from '@cosmjs/stargate';

import { 
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  AccountData,
  OfflineSigner,
} from '@cosmjs/proto-signing';

import { 
  fromHex,
  fromBech32,
  toBech32,
  fromBase64,
  toBase64,
} from '@cosmjs/encoding';

import { 
  EncodeObject,
  Registry,
  GeneratedType,
} from '@cosmjs/proto-signing';

import {
  MsgSend,
  MsgMultiSend,
} from 'cosmjs-types/cosmos/bank/v1beta1/tx';

import {
  MsgDelegate,
  MsgUndelegate,
  MsgBeginRedelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import { MsgVote } from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import { VoteOption } from 'cosmjs-types/cosmos/gov/v1beta1/gov';

import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx';

import { Uint53, Uint64 } from '@cosmjs/math';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { rpcManager } from '../../../infrastructure/web3/rpc/RPCConnectionManager';
import type { SupportedChain, NetworkType } from '../../../infrastructure/web3/adapters/IBlockchainAdapter';
import { ChainType } from '../AddressUtils';
import { addressUtils } from '../AddressUtils';

// ============================================================================
// COSMOS-SPECIFIC INTERFACES
// ============================================================================

export interface CosmosTransactionRequest {
  from: string; // Cosmos bech32 address
  to?: string; // Recipient for transfers
  value?: string; // Amount in smallest unit
  denom?: string; // Token denomination (e.g., 'uatom', 'uosmo')
  gas?: string; // Gas limit
  gasPrice?: string; // Gas price
  memo?: string; // Transaction memo
  timeoutHeight?: bigint; // Timeout block height
  msgType?: 'transfer' | 'delegate' | 'undelegate' | 'redelegate' | 'vote' | 'ibc_transfer';
  // Staking specific
  validatorAddress?: string;
  srcValidatorAddress?: string;
  dstValidatorAddress?: string;
  // Governance specific
  proposalId?: bigint;
  voteOption?: VoteOption;
  // IBC specific
  sourcePort?: string;
  sourceChannel?: string;
  timeoutTimestamp?: bigint;
}

export interface CosmosGasEstimate {
  gasLimit: number;
  gasPrice: string;
  gasFee: string;
  gasFeeNative: string; // In native token format
  gasFeeUsd?: number;
  estimatedGas: number;
}

export interface CosmosSignedTransaction {
  txRaw: Uint8Array;
  txHash: string;
  signer: string;
  msgs: EncodeObject[];
  fee: StdFee;
  memo: string;
  chainId: string;
}

export interface CosmosBroadcastResult {
  success: boolean;
  txHash?: string;
  height?: number;
  gasUsed?: number;
  gasWanted?: number;
  code?: number;
  rawLog?: string;
  logs?: any[];
  events?: any[];
  error?: string;
}

export interface CosmosTransactionBuilderConfig {
  chainId: string;
  chainName: string;
  networkType: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl: string;
  restUrl?: string;
  prefix: string; // Bech32 prefix (cosmos, osmo, juno, etc.)
  symbol: string;
  decimals: number;
  denom: string; // Base denomination (uatom, uosmo, ujuno, etc.)
  defaultGasPrice?: string;
  defaultGasLimit?: number;
  timeout?: number;
  ibcEnabled?: boolean;
  stakingEnabled?: boolean;
  governanceEnabled?: boolean;
}

export interface CosmosAccountInfo {
  address: string;
  pubkey: string | null;
  accountNumber: number;
  sequence: number;
}

// ============================================================================
// COSMOS TRANSACTION BUILDER
// ============================================================================

export class CosmosTransactionBuilder {
  private client: StargateClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private readonly config: CosmosTransactionBuilderConfig;
  private readonly gasPrice: GasPrice;
  private registry: Registry;

  constructor(config: CosmosTransactionBuilderConfig) {
    this.config = config;
    this.gasPrice = GasPrice.fromString(
      `${config.defaultGasPrice || '0.025'}${config.denom}`
    );
    this.registry = this.createRegistry();
    this.initializeClients();
  }

  private createRegistry(): Registry {
    const registry = new Registry();
    
    // Register standard message types
    registry.register('/cosmos.bank.v1beta1.MsgSend', MsgSend);
    registry.register('/cosmos.bank.v1beta1.MsgMultiSend', MsgMultiSend);
    
    // Register staking messages if enabled
    if (this.config.stakingEnabled) {
      registry.register('/cosmos.staking.v1beta1.MsgDelegate', MsgDelegate);
      registry.register('/cosmos.staking.v1beta1.MsgUndelegate', MsgUndelegate);
      registry.register('/cosmos.staking.v1beta1.MsgBeginRedelegate', MsgBeginRedelegate);
    }
    
    // Register governance messages if enabled
    if (this.config.governanceEnabled) {
      registry.register('/cosmos.gov.v1beta1.MsgVote', MsgVote);
    }
    
    // Register IBC messages if enabled
    if (this.config.ibcEnabled) {
      registry.register('/ibc.applications.transfer.v1.MsgTransfer', MsgTransfer);
    }
    
    return registry;
  }

  private async initializeClients(): Promise<void> {
    try {
      const rpcUrl = this.getRpcUrl() || this.config.rpcUrl;
      this.client = await StargateClient.connect(rpcUrl);
      console.log(`Connected to ${this.config.chainName} at ${rpcUrl}`);
    } catch (error) {
      console.error(`Failed to initialize Cosmos clients for ${this.config.chainName}:`, error);
    }
  }

  /**
   * Validate Cosmos transaction parameters
   */
  async validateTransaction(tx: CosmosTransactionRequest): Promise<boolean> {
    // Validate from address
    const fromValid = this.validateAddress(tx.from);
    if (!fromValid) {
      throw new Error(`Invalid from address: ${tx.from}`);
    }

    // Validate to address if present
    if (tx.to) {
      const toValid = this.validateAddress(tx.to);
      if (!toValid) {
        throw new Error(`Invalid to address: ${tx.to}`);
      }
    }

    // Validate validator address if present
    if (tx.validatorAddress) {
      if (!tx.validatorAddress.startsWith(`${this.config.prefix}valoper`)) {
        throw new Error(`Invalid validator address: ${tx.validatorAddress}`);
      }
    }

    // Validate value
    if (tx.value) {
      try {
        const valueNum = BigInt(tx.value);
        if (valueNum <= 0n) {
          throw new Error('Transaction value must be greater than 0');
        }
      } catch (error) {
        throw new Error(`Invalid transaction value: ${error.message}`);
      }
    }

    return true;
  }

  /**
   * Validate Cosmos bech32 address
   */
  validateAddress(address: string): boolean {
    try {
      const decoded = fromBech32(address);
      return decoded.prefix === this.config.prefix && decoded.data.length === 20;
    } catch {
      return false;
    }
  }

  /**
   * Estimate Cosmos transaction gas
   */
  async estimateGas(tx: CosmosTransactionRequest): Promise<CosmosGasEstimate> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error(`${this.config.chainName} client not initialized`);
      }
    }

    await this.validateTransaction(tx);

    try {
      // Create message for simulation
      const msg = this.createMessage(tx);
      
      // Base gas estimation
      let estimatedGas = this.config.defaultGasLimit || 200000;
      
      // Adjust based on message type
      switch (tx.msgType) {
        case 'ibc_transfer':
          estimatedGas = 150000;
          break;
        case 'delegate':
        case 'undelegate':
        case 'redelegate':
          estimatedGas = 250000;
          break;
        case 'vote':
          estimatedGas = 100000;
          break;
        default:
          estimatedGas = 100000; // Standard transfer
      }

      const gasLimit = Math.ceil(estimatedGas * 1.5); // 50% buffer
      const fee = calculateFee(gasLimit, this.gasPrice);
      
      const gasFeeNative = this.formatNativeAmount(fee.amount[0].amount);
      
      // Get USD estimate
      let gasFeeUsd: number | undefined;
      try {
        const price = await this.getNativePriceUSD();
        if (price) {
          gasFeeUsd = parseFloat(gasFeeNative) * price;
        }
      } catch (error) {
        console.warn('Failed to get USD price:', error);
      }

      return {
        gasLimit,
        gasPrice: this.config.defaultGasPrice || '0.025',
        gasFee: fee.amount[0].amount,
        gasFeeNative,
        gasFeeUsd,
        estimatedGas,
      };

    } catch (error) {
      throw new Error(`Cosmos gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Create message based on transaction type
   */
  private createMessage(tx: CosmosTransactionRequest): EncodeObject {
    const msgType = tx.msgType || 'transfer';

    switch (msgType) {
      case 'transfer':
        return {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: MsgSend.fromPartial({
            fromAddress: tx.from,
            toAddress: tx.to!,
            amount: [{
              denom: tx.denom || this.config.denom,
              amount: tx.value!,
            }],
          }),
        };

      case 'delegate':
        return {
          typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
          value: MsgDelegate.fromPartial({
            delegatorAddress: tx.from,
            validatorAddress: tx.validatorAddress!,
            amount: {
              denom: tx.denom || this.config.denom,
              amount: tx.value!,
            },
          }),
        };

      case 'undelegate':
        return {
          typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
          value: MsgUndelegate.fromPartial({
            delegatorAddress: tx.from,
            validatorAddress: tx.validatorAddress!,
            amount: {
              denom: tx.denom || this.config.denom,
              amount: tx.value!,
            },
          }),
        };

      case 'redelegate':
        return {
          typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
          value: MsgBeginRedelegate.fromPartial({
            delegatorAddress: tx.from,
            validatorSrcAddress: tx.srcValidatorAddress!,
            validatorDstAddress: tx.dstValidatorAddress!,
            amount: {
              denom: tx.denom || this.config.denom,
              amount: tx.value!,
            },
          }),
        };

      case 'vote':
        return {
          typeUrl: '/cosmos.gov.v1beta1.MsgVote',
          value: MsgVote.fromPartial({
            proposalId: tx.proposalId!,
            voter: tx.from,
            option: tx.voteOption || VoteOption.VOTE_OPTION_YES,
          }),
        };

      case 'ibc_transfer':
        return {
          typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
          value: MsgTransfer.fromPartial({
            sourcePort: tx.sourcePort || 'transfer',
            sourceChannel: tx.sourceChannel!,
            token: {
              denom: tx.denom || this.config.denom,
              amount: tx.value!,
            },
            sender: tx.from,
            receiver: tx.to!,
            timeoutHeight: {
              revisionNumber: BigInt(0),
              revisionHeight: tx.timeoutHeight || BigInt(0),
            },
            timeoutTimestamp: tx.timeoutTimestamp || BigInt(0),
            memo: tx.memo || '',
          }),
        };

      default:
        throw new Error(`Unsupported message type: ${msgType}`);
    }
  }

  /**
   * Sign Cosmos transaction using private key
   */
  async signTransaction(
    tx: CosmosTransactionRequest,
    privateKey: string
  ): Promise<CosmosSignedTransaction> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error(`${this.config.chainName} client not initialized`);
      }
    }

    await this.validateTransaction(tx);

    try {
      // Create wallet from private key
      const privKeyBytes = fromHex(privateKey.replace('0x', ''));
      const wallet = await DirectSecp256k1Wallet.fromKey(privKeyBytes, this.config.prefix);
      
      // Get account from wallet
      const [account] = await wallet.getAccounts();
      if (account.address !== tx.from) {
        throw new Error('Private key does not match from address');
      }

      // Create signing client
      const signingClient = await SigningStargateClient.connectWithSigner(
        this.getRpcUrl() || this.config.rpcUrl,
        wallet,
        { registry: this.registry, gasPrice: this.gasPrice }
      );

      // Create message
      const msg = this.createMessage(tx);
      
      // Calculate fee
      const gasEstimate = await this.estimateGas(tx);
      const fee = {
        amount: coins(gasEstimate.gasFee, tx.denom || this.config.denom),
        gas: gasEstimate.gasLimit.toString(),
      };

      // Sign transaction (not broadcast yet)
      const txRaw = await signingClient.sign(
        tx.from,
        [msg],
        fee,
        tx.memo || ''
      );

      return {
        txRaw: TxRaw.encode(txRaw).finish(),
        txHash: '', // Will be calculated during broadcast
        signer: tx.from,
        msgs: [msg],
        fee,
        memo: tx.memo || '',
        chainId: this.config.chainId,
      };

    } catch (error) {
      throw new Error(`Cosmos transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Broadcast Cosmos transaction
   */
  async broadcastTransaction(
    signedTx: CosmosSignedTransaction
  ): Promise<CosmosBroadcastResult> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error(`${this.config.chainName} client not initialized`);
      }
    }

    try {
      const result = await this.client.broadcastTx(signedTx.txRaw);

      return {
        success: result.code === 0,
        txHash: result.transactionHash,
        height: result.height,
        gasUsed: Number(result.gasUsed),
        gasWanted: Number(result.gasWanted),
        code: result.code,
        rawLog: result.rawLog,
        events: [...result.events],
      };

    } catch (error) {
      return {
        success: false,
        error: `Cosmos broadcast failed: ${error.message}`,
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    success: boolean;
    found: boolean;
    height?: number;
    gasUsed?: number;
    gasWanted?: number;
    code?: number;
    logs?: any[];
  }> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error('Client not initialized');
      }
    }

    try {
      const tx = await this.client.getTx(txHash);

      if (!tx) {
        return {
          success: false,
          found: false,
        };
      }

      return {
        success: tx.code === 0,
        found: true,
        height: tx.height,
        gasUsed: Number(tx.gasUsed),
        gasWanted: Number(tx.gasWanted),
        code: tx.code,
      };

    } catch (error) {
      console.error(`Failed to get transaction status for ${txHash}:`, error);
      return {
        success: false,
        found: false,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, denom?: string): Promise<string> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error('Client not initialized');
      }
    }

    try {
      const balance = await this.client.getBalance(
        address,
        denom || this.config.denom
      );
      return balance.amount;
    } catch (error) {
      console.error(`Failed to get balance for ${address}:`, error);
      return '0';
    }
  }

  /**
   * Get all balances for address
   */
  async getAllBalances(address: string): Promise<readonly Coin[]> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error('Client not initialized');
      }
    }

    try {
      const balances = await this.client.getAllBalances(address);
      return balances;
    } catch (error) {
      console.error(`Failed to get all balances for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(address: string): Promise<CosmosAccountInfo | null> {
    if (!this.client) {
      await this.initializeClients();
      if (!this.client) {
        throw new Error('Client not initialized');
      }
    }

    try {
      const account = await this.client.getAccount(address);
      if (!account) {
        return null;
      }

      return {
        address: account.address,
        pubkey: account.pubkey ? toBase64(account.pubkey.value) : null,
        accountNumber: account.accountNumber,
        sequence: account.sequence,
      };
    } catch (error) {
      console.error(`Failed to get account info for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get staking delegations
   */
  async getDelegations(delegatorAddress: string): Promise<any[]> {
    if (!this.client || !this.config.stakingEnabled) {
      return [];
    }

    try {
      const endpoint = `${this.config.restUrl}/cosmos/staking/v1beta1/delegations/${delegatorAddress}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      return data.delegation_responses || [];
    } catch (error) {
      console.error(`Failed to get delegations for ${delegatorAddress}:`, error);
      return [];
    }
  }

  /**
   * Get validators
   */
  async getValidators(status?: 'BOND_STATUS_BONDED' | 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING'): Promise<any[]> {
    if (!this.client || !this.config.stakingEnabled) {
      return [];
    }

    try {
      const endpoint = `${this.config.restUrl}/cosmos/staking/v1beta1/validators${status ? `?status=${status}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      return data.validators || [];
    } catch (error) {
      console.error('Failed to get validators:', error);
      return [];
    }
  }

  /**
   * Get governance proposals
   */
  async getProposals(status?: string): Promise<any[]> {
    if (!this.client || !this.config.governanceEnabled) {
      return [];
    }

    try {
      const endpoint = `${this.config.restUrl}/cosmos/gov/v1beta1/proposals${status ? `?proposal_status=${status}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      return data.proposals || [];
    } catch (error) {
      console.error('Failed to get proposals:', error);
      return [];
    }
  }

  /**
   * Get IBC channels
   */
  async getIBCChannels(): Promise<any[]> {
    if (!this.client || !this.config.ibcEnabled) {
      return [];
    }

    try {
      const endpoint = `${this.config.restUrl}/ibc/core/channel/v1/channels`;
      const response = await fetch(endpoint);
      const data = await response.json();
      return data.channels || [];
    } catch (error) {
      console.error('Failed to get IBC channels:', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private formatNativeAmount(amount: string): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** this.config.decimals);
    const whole = value / divisor;
    const remainder = value % divisor;
    const decimal = remainder.toString().padStart(this.config.decimals, '0');
    return `${whole}.${decimal}`;
  }

  private async getNativePriceUSD(): Promise<number | null> {
    try {
      // Map chain symbols to CoinGecko IDs
      const coinGeckoIds: { [key: string]: string } = {
        'ATOM': 'cosmos',
        'OSMO': 'osmosis',
        'JUNO': 'juno-network',
        'SCRT': 'secret',
        'AKT': 'akash-network',
        'LUNA': 'terra-luna-2',
        'KAVA': 'kava',
        'EVMOS': 'evmos',
        'STARS': 'stargaze',
        'REGEN': 'regen',
      };

      const geckoId = coinGeckoIds[this.config.symbol];
      if (!geckoId) return null;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`
      );
      const data = await response.json();
      return data[geckoId]?.usd || null;
    } catch {
      return null;
    }
  }

  private getRpcUrl(): string | null {
    try {
      const provider = rpcManager.getOptimalProvider(
        this.config.chainName.toLowerCase() as SupportedChain,
        this.config.networkType as NetworkType
      );
      return provider?.config.url || this.config.rpcUrl;
    } catch {
      return this.config.rpcUrl;
    }
  }
}

// ============================================================================
// CHAIN-SPECIFIC COSMOS BUILDERS
// ============================================================================

export const CosmosHubTransactionBuilder = () => {
  return new CosmosTransactionBuilder({
    chainId: 'cosmoshub-4',
    chainName: 'Cosmos Hub',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_COSMOS_RPC_URL || 'https://rpc.cosmos.network',
    restUrl: import.meta.env.VITE_COSMOS_REST_URL || 'https://rest.cosmos.network',
    prefix: 'cosmos',
    symbol: 'ATOM',
    decimals: 6,
    denom: 'uatom',
    defaultGasPrice: '0.025',
    defaultGasLimit: 200000,
    timeout: 30000,
    ibcEnabled: true,
    stakingEnabled: true,
    governanceEnabled: true,
  });
};

export const OsmosisTransactionBuilder = () => {
  return new CosmosTransactionBuilder({
    chainId: 'osmosis-1',
    chainName: 'Osmosis',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.osmosis.zone',
    restUrl: import.meta.env.VITE_OSMOSIS_REST_URL || 'https://lcd.osmosis.zone',
    prefix: 'osmo',
    symbol: 'OSMO',
    decimals: 6,
    denom: 'uosmo',
    defaultGasPrice: '0.025',
    defaultGasLimit: 250000,
    timeout: 30000,
    ibcEnabled: true,
    stakingEnabled: true,
    governanceEnabled: true,
  });
};

export const JunoTransactionBuilder = () => {
  return new CosmosTransactionBuilder({
    chainId: 'juno-1',
    chainName: 'Juno',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_JUNO_RPC_URL || 'https://rpc-juno.itastakers.com',
    restUrl: import.meta.env.VITE_JUNO_REST_URL || 'https://lcd-juno.itastakers.com',
    prefix: 'juno',
    symbol: 'JUNO',
    decimals: 6,
    denom: 'ujuno',
    defaultGasPrice: '0.075',
    defaultGasLimit: 200000,
    timeout: 30000,
    ibcEnabled: true,
    stakingEnabled: true,
    governanceEnabled: true,
  });
};

export const SecretNetworkTransactionBuilder = () => {
  return new CosmosTransactionBuilder({
    chainId: 'secret-4',
    chainName: 'Secret Network',
    networkType: 'mainnet',
    rpcUrl: import.meta.env.VITE_SECRET_RPC_URL || 'https://rpc.secret.express',
    restUrl: import.meta.env.VITE_SECRET_REST_URL || 'https://lcd.secret.express',
    prefix: 'secret',
    symbol: 'SCRT',
    decimals: 6,
    denom: 'uscrt',
    defaultGasPrice: '0.25',
    defaultGasLimit: 300000,
    timeout: 30000,
    ibcEnabled: true,
    stakingEnabled: true,
    governanceEnabled: true,
  });
};

// Testnet builders
export const CosmosTestnetTransactionBuilder = () => {
  return new CosmosTransactionBuilder({
    chainId: 'theta-testnet-001',
    chainName: 'Cosmos Testnet',
    networkType: 'testnet',
    rpcUrl: import.meta.env.VITE_COSMOS_TESTNET_RPC_URL || 'https://rpc.testnet.cosmos.network',
    restUrl: import.meta.env.VITE_COSMOS_TESTNET_REST_URL || 'https://rest.testnet.cosmos.network',
    prefix: 'cosmos',
    symbol: 'ATOM',
    decimals: 6,
    denom: 'uatom',
    defaultGasPrice: '0.025',
    defaultGasLimit: 200000,
    timeout: 30000,
    ibcEnabled: true,
    stakingEnabled: true,
    governanceEnabled: true,
  });
};

// Export convenience function
export const getCosmosTransactionBuilder = (
  chain: 'cosmos' | 'osmosis' | 'juno' | 'secret' = 'cosmos',
  networkType: 'mainnet' | 'testnet' = 'mainnet'
) => {
  if (networkType === 'testnet') {
    return CosmosTestnetTransactionBuilder();
  }

  switch (chain) {
    case 'osmosis':
      return OsmosisTransactionBuilder();
    case 'juno':
      return JunoTransactionBuilder();
    case 'secret':
      return SecretNetworkTransactionBuilder();
    case 'cosmos':
    default:
      return CosmosHubTransactionBuilder();
  }
};
