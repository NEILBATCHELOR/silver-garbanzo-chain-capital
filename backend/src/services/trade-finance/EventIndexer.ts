/**
 * Blockchain Event Indexer
 * 
 * Listens to events from CommodityLendingPool and indexes them:
 * - Supply events
 * - Borrow events
 * - Repay events
 * - Liquidation events
 * 
 * Stores in database and broadcasts via WebSocket
 */

import { ethers } from 'ethers';
import { FastifyInstance } from 'fastify';
import { TradeFinanceWebSocketManager, broadcastPositionUpdate, broadcastHealthFactorUpdate } from './WebSocketService';

// ============================================================================
// CONTRACT ABI (Events Only)
// ============================================================================

const POOL_EVENTS_ABI = [
  // Supply event
  'event Supply(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  
  // Borrow event
  'event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  
  // Repay event
  'event Repay(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  
  // Withdraw event
  'event Withdraw(address indexed user, address indexed asset, uint256 amount, uint256 timestamp)',
  
  // Liquidation event
  'event Liquidate(address indexed liquidator, address indexed borrower, address collateralAsset, address debtAsset, uint256 debtCovered, uint256 collateralSeized, uint256 timestamp)'
];

// ============================================================================
// EVENT INDEXER
// ============================================================================

export class EventIndexer {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wsManager: TradeFinanceWebSocketManager;
  private supabase: any;
  private projectId: string;
  private isRunning = false;
  private lastBlockProcessed = 0;

  constructor(
    rpcUrl: string,
    poolAddress: string,
    wsManager: TradeFinanceWebSocketManager,
    supabase: any,
    projectId: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(poolAddress, POOL_EVENTS_ABI, this.provider);
    this.wsManager = wsManager;
    this.supabase = supabase;
    this.projectId = projectId;
  }

  /**
   * Start indexing events
   */
  async start(fromBlock: number = 0): Promise<void> {
    if (this.isRunning) {
      console.log('[EventIndexer] Already running');
      return;
    }

    this.isRunning = true;
    this.lastBlockProcessed = fromBlock;

    console.log(`[EventIndexer] Starting from block ${fromBlock}`);

    // Listen to new events
    this.contract.on('Supply', this.handleSupplyEvent.bind(this));
    this.contract.on('Borrow', this.handleBorrowEvent.bind(this));
    this.contract.on('Repay', this.handleRepayEvent.bind(this));
    this.contract.on('Withdraw', this.handleWithdrawEvent.bind(this));
    this.contract.on('Liquidate', this.handleLiquidateEvent.bind(this));

    // Index historical events if fromBlock > 0
    if (fromBlock > 0) {
      await this.indexHistoricalEvents(fromBlock);
    }
  }

  /**
   * Stop indexing
   */
  stop(): void {
    if (!this.isRunning) return;

    this.contract.removeAllListeners();
    this.isRunning = false;
    console.log('[EventIndexer] Stopped');
  }

  /**
   * Index historical events from a specific block
   */
  private async indexHistoricalEvents(fromBlock: number): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`[EventIndexer] Indexing historical events from block ${fromBlock} to ${currentBlock}`);

      // Supply events
      const supplyFilter = this.contract.filters.Supply();
      const supplyEvents = await this.contract.queryFilter(supplyFilter, fromBlock, currentBlock);
      for (const event of supplyEvents) {
        await this.processSupplyEvent(event);
      }

      // Borrow events
      const borrowFilter = this.contract.filters.Borrow();
      const borrowEvents = await this.contract.queryFilter(borrowFilter, fromBlock, currentBlock);
      for (const event of borrowEvents) {
        await this.processBorrowEvent(event);
      }

      // Repay events
      const repayFilter = this.contract.filters.Repay();
      const repayEvents = await this.contract.queryFilter(repayFilter, fromBlock, currentBlock);
      for (const event of repayEvents) {
        await this.processRepayEvent(event);
      }

      // Withdraw events
      const withdrawFilter = this.contract.filters.Withdraw();
      const withdrawEvents = await this.contract.queryFilter(withdrawFilter, fromBlock, currentBlock);
      for (const event of withdrawEvents) {
        await this.processWithdrawEvent(event);
      }

      // Liquidation events
      const liquidateFilter = this.contract.filters.Liquidate();
      const liquidateEvents = await this.contract.queryFilter(liquidateFilter, fromBlock, currentBlock);
      for (const event of liquidateEvents) {
        await this.processLiquidateEvent(event);
      }

      console.log(`[EventIndexer] Historical indexing complete`);
    } catch (error) {
      console.error('[EventIndexer] Failed to index historical events:', error);
    }
  }

  /**
   * Handle Supply event
   */
  private async handleSupplyEvent(...args: any[]): Promise<void> {
    const [user, asset, amount, timestamp, event] = args;
    await this.processSupplyEvent(event);
  }

  /**
   * Process Supply event
   */
  private async processSupplyEvent(event: any): Promise<void> {
    try {
      const { user, asset, amount, timestamp } = event.args || {};

      // Store in database
      const { error } = await this.supabase
        .from('commodity_transaction_events')
        .insert({
          project_id: this.projectId,
          event_type: 'SUPPLY',
          wallet_address: user,
          asset_address: asset,
          amount: amount.toString(),
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        });

      if (error) {
        console.error('[EventIndexer] Failed to store Supply event:', error);
        return;
      }

      // Broadcast via WebSocket
      broadcastPositionUpdate(this.wsManager, user, 'SUPPLY', {
        asset,
        amount: amount.toString(),
        transactionHash: event.transactionHash,
      });

      // Update health factor
      await this.updateHealthFactor(user);

      console.log(`[EventIndexer] Indexed Supply: ${user} supplied ${ethers.formatEther(amount)} of ${asset}`);
    } catch (error) {
      console.error('[EventIndexer] Error processing Supply event:', error);
    }
  }

  /**
   * Handle Borrow event
   */
  private async handleBorrowEvent(...args: any[]): Promise<void> {
    const [user, asset, amount, timestamp, event] = args;
    await this.processBorrowEvent(event);
  }

  /**
   * Process Borrow event
   */
  private async processBorrowEvent(event: any): Promise<void> {
    try {
      const { user, asset, amount, timestamp } = event.args || {};

      // Store in database
      const { error } = await this.supabase
        .from('commodity_transaction_events')
        .insert({
          project_id: this.projectId,
          event_type: 'BORROW',
          wallet_address: user,
          asset_address: asset,
          amount: amount.toString(),
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        });

      if (error) {
        console.error('[EventIndexer] Failed to store Borrow event:', error);
        return;
      }

      // Broadcast via WebSocket
      broadcastPositionUpdate(this.wsManager, user, 'BORROW', {
        asset,
        amount: amount.toString(),
        transactionHash: event.transactionHash,
      });

      // Update health factor
      await this.updateHealthFactor(user);

      console.log(`[EventIndexer] Indexed Borrow: ${user} borrowed ${ethers.formatEther(amount)} of ${asset}`);
    } catch (error) {
      console.error('[EventIndexer] Error processing Borrow event:', error);
    }
  }

  /**
   * Handle Repay event
   */
  private async handleRepayEvent(...args: any[]): Promise<void> {
    const [user, asset, amount, timestamp, event] = args;
    await this.processRepayEvent(event);
  }

  /**
   * Process Repay event
   */
  private async processRepayEvent(event: any): Promise<void> {
    try {
      const { user, asset, amount, timestamp } = event.args || {};

      // Store in database
      const { error } = await this.supabase
        .from('commodity_transaction_events')
        .insert({
          project_id: this.projectId,
          event_type: 'REPAY',
          wallet_address: user,
          asset_address: asset,
          amount: amount.toString(),
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        });

      if (error) {
        console.error('[EventIndexer] Failed to store Repay event:', error);
        return;
      }

      // Broadcast via WebSocket
      broadcastPositionUpdate(this.wsManager, user, 'REPAY', {
        asset,
        amount: amount.toString(),
        transactionHash: event.transactionHash,
      });

      // Update health factor
      await this.updateHealthFactor(user);

      console.log(`[EventIndexer] Indexed Repay: ${user} repaid ${ethers.formatEther(amount)} of ${asset}`);
    } catch (error) {
      console.error('[EventIndexer] Error processing Repay event:', error);
    }
  }

  /**
   * Handle Withdraw event
   */
  private async handleWithdrawEvent(...args: any[]): Promise<void> {
    const [user, asset, amount, timestamp, event] = args;
    await this.processWithdrawEvent(event);
  }

  /**
   * Process Withdraw event
   */
  private async processWithdrawEvent(event: any): Promise<void> {
    try {
      const { user, asset, amount, timestamp } = event.args || {};

      // Store in database
      const { error } = await this.supabase
        .from('commodity_transaction_events')
        .insert({
          project_id: this.projectId,
          event_type: 'WITHDRAW',
          wallet_address: user,
          asset_address: asset,
          amount: amount.toString(),
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        });

      if (error) {
        console.error('[EventIndexer] Failed to store Withdraw event:', error);
        return;
      }

      // Broadcast via WebSocket
      broadcastPositionUpdate(this.wsManager, user, 'WITHDRAW', {
        asset,
        amount: amount.toString(),
        transactionHash: event.transactionHash,
      });

      // Update health factor
      await this.updateHealthFactor(user);

      console.log(`[EventIndexer] Indexed Withdraw: ${user} withdrew ${ethers.formatEther(amount)} of ${asset}`);
    } catch (error) {
      console.error('[EventIndexer] Error processing Withdraw event:', error);
    }
  }

  /**
   * Handle Liquidate event
   */
  private async handleLiquidateEvent(...args: any[]): Promise<void> {
    const [liquidator, borrower, collateralAsset, debtAsset, debtCovered, collateralSeized, timestamp, event] = args;
    await this.processLiquidateEvent(event);
  }

  /**
   * Process Liquidate event
   */
  private async processLiquidateEvent(event: any): Promise<void> {
    try {
      const { liquidator, borrower, collateralAsset, debtAsset, debtCovered, collateralSeized, timestamp } = event.args || {};

      // Store in database
      const { error } = await this.supabase
        .from('commodity_transaction_events')
        .insert({
          project_id: this.projectId,
          event_type: 'LIQUIDATE',
          wallet_address: borrower,
          liquidator_address: liquidator,
          asset_address: debtAsset,
          collateral_address: collateralAsset,
          amount: debtCovered.toString(),
          collateral_seized: collateralSeized.toString(),
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        });

      if (error) {
        console.error('[EventIndexer] Failed to store Liquidate event:', error);
        return;
      }

      // Broadcast via WebSocket
      broadcastPositionUpdate(this.wsManager, borrower, 'LIQUIDATE', {
        liquidator,
        collateralAsset,
        debtAsset,
        debtCovered: debtCovered.toString(),
        collateralSeized: collateralSeized.toString(),
        transactionHash: event.transactionHash,
      });

      // Update health factor
      await this.updateHealthFactor(borrower);

      console.log(`[EventIndexer] Indexed Liquidation: ${borrower} liquidated by ${liquidator}`);
    } catch (error) {
      console.error('[EventIndexer] Error processing Liquidate event:', error);
    }
  }

  /**
   * Update and broadcast health factor
   */
  private async updateHealthFactor(userAddress: string): Promise<void> {
    try {
      // Query user position
      const { data: position, error } = await this.supabase
        .from('commodity_positions')
        .select(`
          *,
          collateral:commodity_collateral(value_usd),
          debt:commodity_debt(value_usd)
        `)
        .eq('wallet_address', userAddress)
        .eq('project_id', this.projectId)
        .single();

      if (error || !position) return;

      // Calculate health factor
      const totalCollateralValue = position.collateral?.reduce(
        (sum: number, c: any) => sum + (c.value_usd || 0),
        0
      ) || 0;

      const totalDebt = position.debt?.reduce(
        (sum: number, d: any) => sum + (d.value_usd || 0),
        0
      ) || 0;

      const liquidationThreshold = 0.85;
      const healthFactor = totalDebt > 0
        ? (totalCollateralValue * liquidationThreshold) / totalDebt
        : Infinity;

      // Determine status
      let status: 'healthy' | 'warning' | 'danger' | 'liquidatable';
      if (healthFactor >= 1.1) status = 'healthy';
      else if (healthFactor >= 1.0) status = 'warning';
      else if (healthFactor >= 0.95) status = 'danger';
      else status = 'liquidatable';

      // Broadcast health factor update
      broadcastHealthFactorUpdate(this.wsManager, userAddress, healthFactor, status);
    } catch (error) {
      console.error('[EventIndexer] Failed to update health factor:', error);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createEventIndexer(
  rpcUrl: string,
  poolAddress: string,
  wsManager: TradeFinanceWebSocketManager,
  supabase: any,
  projectId: string
): EventIndexer {
  return new EventIndexer(rpcUrl, poolAddress, wsManager, supabase, projectId);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EventIndexer;
