/**
 * Price Update Jobs - Scheduled Background Tasks
 * 
 * Automatic commodity price updates on optimized schedules:
 * - Chainlink: Always current (on-chain data)
 * - CME: Every 30 minutes (futures markets)
 * - LME: Every 1 hour (base metals)
 * - ICE: Every 4 hours (soft commodities)
 * - FRED: Daily at 8 AM ET (government data)
 * 
 * Features:
 * - Cron-based scheduling
 * - Error handling with retries
 * - Performance monitoring
 * - Graceful shutdown
 */

import { FastifyInstance } from 'fastify'
import { createPriceOrchestrator } from './PriceOrchestrator'
import { createCMEPriceService } from './CMEPriceService'
import { createLMEPriceService } from './LMEPriceService'
import { createICEPriceService } from './ICEPriceService'
import { createPriceAggregator } from './PriceAggregator'
import { createPreciousMetalsPriceService } from './PreciousMetalsPriceService'

interface JobStats {
  lastRun: Date | null
  successCount: number
  failureCount: number
  avgDurationMs: number
}

export class PriceUpdateScheduler {
  private fastify: FastifyInstance
  private projectId: string
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private jobStats: Map<string, JobStats> = new Map()
  private isShuttingDown = false
  
  constructor(fastify: FastifyInstance, projectId: string) {
    this.fastify = fastify
    this.projectId = projectId
    
    // Initialize stats for each job
    this._initializeStats()
  }
  
  /**
   * Start all scheduled jobs
   */
  async start(): Promise<void> {
    this.fastify.log.info('Starting price update scheduler...')
    
    // Job 1: CME Updates (every 30 minutes)
    if (process.env.CME_API_KEY) {
      this._scheduleJob('cme-updates', 30 * 60 * 1000, () => this._updateCMEPrices())
      this.fastify.log.info('CME price updates: every 30 minutes')
    }
    
    // Job 2: LME Updates (every 1 hour)
    if (process.env.METALS_API_KEY) {
      this._scheduleJob('lme-updates', 60 * 60 * 1000, () => this._updateLMEPrices())
      this.fastify.log.info('LME price updates: every 1 hour')
    }
    
    // Job 3: ICE Updates (every 4 hours)
    if (process.env.BARCHART_API_KEY) {
      this._scheduleJob('ice-updates', 4 * 60 * 60 * 1000, () => this._updateICEPrices())
      this.fastify.log.info('ICE price updates: every 4 hours')
    }
    
    // Job 4: Precious Metals Updates (every 5 minutes)
    this._scheduleJob('precious-metals-updates', 5 * 60 * 1000, () => this._updatePreciousMetalsPrices())
    this.fastify.log.info('Precious metals updates: every 5 minutes (metals.live free tier)')
    
    // Job 5: FRED Updates (daily at 8 AM ET)
    this._scheduleDailyJob('fred-updates', 8, 0, () => this._updateFREDPrices())
    this.fastify.log.info('FRED price updates: daily at 8:00 AM ET')
    
    // Job 6: Health Check (every 5 minutes)
    this._scheduleJob('health-check', 5 * 60 * 1000, () => this._checkOracleHealth())
    this.fastify.log.info('Oracle health check: every 5 minutes')
    
    // Run initial updates
    this.fastify.log.info('Running initial price updates...')
    await this._runInitialUpdates()
    
    this.fastify.log.info('Price update scheduler started successfully')
  }
  
  /**
   * Stop all scheduled jobs
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true
    this.fastify.log.info('Stopping price update scheduler...')
    
    // Clear all intervals
    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval)
      this.fastify.log.info(`Stopped job: ${jobName}`)
    }
    
    this.intervals.clear()
    this.fastify.log.info('Price update scheduler stopped')
  }
  
  /**
   * Get job statistics
   */
  getStats(): Map<string, JobStats> {
    return new Map(this.jobStats)
  }
  
  /**
   * Initialize job statistics
   */
  private _initializeStats(): void {
    const jobs = [
      'cme-updates', 
      'lme-updates', 
      'ice-updates', 
      'precious-metals-updates',
      'fred-updates', 
      'health-check'
    ]
    
    for (const job of jobs) {
      this.jobStats.set(job, {
        lastRun: null,
        successCount: 0,
        failureCount: 0,
        avgDurationMs: 0
      })
    }
  }
  
  /**
   * Schedule a job with interval
   */
  private _scheduleJob(
    jobName: string,
    intervalMs: number,
    handler: () => Promise<void>
  ): void {
    const wrappedHandler = async () => {
      if (this.isShuttingDown) return
      
      const startTime = Date.now()
      const stats = this.jobStats.get(jobName)
      
      try {
        await handler()
        
        if (stats) {
          stats.lastRun = new Date()
          stats.successCount++
          
          // Update average duration
          const duration = Date.now() - startTime
          stats.avgDurationMs = Math.round(
            (stats.avgDurationMs * (stats.successCount - 1) + duration) / stats.successCount
          )
        }
        
        this.fastify.log.info(`Job ${jobName} completed in ${Date.now() - startTime}ms`)
      } catch (error) {
        if (stats) {
          stats.failureCount++
        }
        
        this.fastify.log.error(`Job ${jobName} failed:`, error)
      }
    }
    
    const interval = setInterval(wrappedHandler, intervalMs)
    this.intervals.set(jobName, interval)
  }
  
  /**
   * Schedule daily job at specific time (ET)
   */
  private _scheduleDailyJob(
    jobName: string,
    hour: number,
    minute: number,
    handler: () => Promise<void>
  ): void {
    const checkAndRun = async () => {
      if (this.isShuttingDown) return
      
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      
      if (et.getHours() === hour && et.getMinutes() === minute) {
        const stats = this.jobStats.get(jobName)
        
        // Only run once per day
        if (stats?.lastRun) {
          const lastRunDate = stats.lastRun.toDateString()
          const todayDate = new Date().toDateString()
          if (lastRunDate === todayDate) {
            return // Already ran today
          }
        }
        
        const startTime = Date.now()
        
        try {
          await handler()
          
          if (stats) {
            stats.lastRun = new Date()
            stats.successCount++
            stats.avgDurationMs = Date.now() - startTime
          }
          
          this.fastify.log.info(`Job ${jobName} completed in ${Date.now() - startTime}ms`)
        } catch (error) {
          if (stats) {
            stats.failureCount++
          }
          
          this.fastify.log.error(`Job ${jobName} failed:`, error)
        }
      }
    }
    
    // Check every minute
    const interval = setInterval(checkAndRun, 60 * 1000)
    this.intervals.set(jobName, interval)
  }
  
  /**
   * Run initial updates on startup
   */
  private async _runInitialUpdates(): Promise<void> {
    const updates = []
    
    if (process.env.CME_API_KEY) {
      updates.push(this._updateCMEPrices())
    }
    
    if (process.env.METALS_API_KEY) {
      updates.push(this._updateLMEPrices())
    }
    
    if (process.env.BARCHART_API_KEY) {
      updates.push(this._updateICEPrices())
    }
    
    // Always run precious metals (free tier available)
    updates.push(this._updatePreciousMetalsPrices())
    
    updates.push(this._updateFREDPrices())
    
    await Promise.allSettled(updates)
  }
  
  /**
   * Update CME prices
   */
  private async _updateCMEPrices(): Promise<void> {
    this.fastify.log.info('Updating CME prices...')
    
    const cmeService = createCMEPriceService(this.fastify, this.projectId)
    
    // CME commodities to update
    const commodities = [
      'CL', 'NG', 'ZC', 'ZW', 'ZS', 'GC', 'SI', 'HG'
    ]
    
    let successCount = 0
    let failCount = 0
    
    for (const productCode of commodities) {
      try {
        const price = await cmeService.getCurrentPrice(productCode)
        if (price) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
        this.fastify.log.warn(`Failed to update CME price for ${productCode}:`, error)
      }
    }
    
    this.fastify.log.info(
      `CME prices updated: ${successCount} success, ${failCount} failed`
    )
  }
  
  /**
   * Update LME prices
   */
  private async _updateLMEPrices(): Promise<void> {
    this.fastify.log.info('Updating LME prices...')
    
    const lmeService = createLMEPriceService(this.fastify, this.projectId)
    
    try {
      const prices = await lmeService.getLatestPrices()
      const result = await lmeService.storePrices(prices)
      
      this.fastify.log.info(
        `LME prices updated: ${result.success} success, ${result.failed} failed`
      )
    } catch (error) {
      this.fastify.log.error('Failed to update LME prices:', error)
      throw error
    }
  }
  
  /**
   * Update ICE prices
   */
  private async _updateICEPrices(): Promise<void> {
    this.fastify.log.info('Updating ICE prices...')
    
    const iceService = createICEPriceService(this.fastify, this.projectId)
    
    try {
      const prices = await iceService.getSoftCommodityPrices()
      const result = await iceService.storePrices(prices)
      
      this.fastify.log.info(
        `ICE prices updated: ${result.success} success, ${result.failed} failed`
      )
    } catch (error) {
      this.fastify.log.error('Failed to update ICE prices:', error)
      throw error
    }
  }
  
  /**
   * Update FRED prices
   */
  private async _updateFREDPrices(): Promise<void> {
    this.fastify.log.info('Updating FRED prices...')
    
    const fredService = createPriceAggregator(this.fastify, this.projectId)
    
    try {
      const result = await fredService.updateAllPrices()
      
      this.fastify.log.info(
        `FRED prices updated: ${result.success.length} success, ${result.failed.length} failed`
      )
    } catch (error) {
      this.fastify.log.error('Failed to update FRED prices:', error)
      throw error
    }
  }
  
  /**
   * Update Precious Metals prices
   */
  private async _updatePreciousMetalsPrices(): Promise<void> {
    this.fastify.log.info('Updating precious metals prices...')
    
    const preciousMetalsService = createPreciousMetalsPriceService(this.fastify)
    
    const metals = ['gold', 'silver', 'platinum', 'palladium'] as const
    let successCount = 0
    let failCount = 0
    
    for (const metal of metals) {
      try {
        const price = await preciousMetalsService.getSpotPrice(metal)
        
        if (price) {
          // Store in database
          const { error } = await this.fastify.supabase
            .from('commodity_prices')
            .insert({
              project_id: this.projectId,
              commodity_type: price.metal,
              price_usd: price.price_usd,
              oracle_source: price.provider,
              confidence_score: price.confidence,
              timestamp: price.timestamp.toISOString()
            })
          
          if (!error) {
            successCount++
            this.fastify.log.debug(
              `✓ ${price.metal}: $${price.price_usd}/oz (${price.provider})`
            )
          } else {
            failCount++
            this.fastify.log.warn(`Failed to store ${metal} price:`, error)
          }
        } else {
          failCount++
          this.fastify.log.warn(`No price data available for ${metal}`)
        }
      } catch (error) {
        failCount++
        this.fastify.log.warn(`Failed to update precious metal ${metal}:`, error)
      }
    }
    
    this.fastify.log.info(
      `Precious metals prices updated: ${successCount} success, ${failCount} failed`
    )
  }
  
  /**
   * Check oracle health
   */
  private async _checkOracleHealth(): Promise<void> {
    const { data: latestPrices, error } = await this.fastify.supabase
      .from('commodity_prices')
      .select('commodity_type, timestamp, oracle_source')
      .eq('project_id', this.projectId)
      .order('timestamp', { ascending: false })
    
    if (error) {
      this.fastify.log.error('Failed to check oracle health:', error)
      return
    }
    
    // Group by commodity
    const commodityMap = new Map()
    latestPrices?.forEach((price: any) => {
      if (!commodityMap.has(price.commodity_type)) {
        commodityMap.set(price.commodity_type, price)
      }
    })
    
    // Check for stale prices
    const now = Date.now()
    const staleThreshold = 60 * 60 * 1000 // 1 hour
    let staleCount = 0
    
    for (const [commodity, price] of commodityMap) {
      const age = now - new Date(price.timestamp).getTime()
      if (age > staleThreshold) {
        staleCount++
        this.fastify.log.warn(
          `Stale price detected: ${commodity} (${Math.floor(age / 60000)} minutes old)`
        )
      }
    }
    
    if (staleCount === 0) {
      this.fastify.log.debug('Oracle health check: All prices fresh')
    } else {
      this.fastify.log.warn(`Oracle health check: ${staleCount} stale prices detected`)
    }
  }
}

/**
 * Factory function
 */
export function createPriceUpdateScheduler(
  fastify: FastifyInstance,
  projectId: string
): PriceUpdateScheduler {
  return new PriceUpdateScheduler(fastify, projectId)
}

/**
 * Register scheduler with Fastify
 */
export async function registerPriceUpdateScheduler(
  fastify: FastifyInstance,
  projectId: string
): Promise<void> {
  const scheduler = createPriceUpdateScheduler(fastify, projectId)
  
  // Start scheduler
  await scheduler.start()
  
  // Store in Fastify instance for access
  fastify.decorate('priceScheduler', scheduler)
  
  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await scheduler.stop()
  })
  
  fastify.log.info('Price update scheduler registered')
}
