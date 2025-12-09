/**
 * Risk Monitoring Service
 * 
 * Purpose: Continuous monitoring of commodity positions for liquidation risks
 * 
 * Features:
 * - Real-time health factor calculations
 * - Automatic liquidation detection
 * - Oracle health monitoring
 * - Utilization tracking
 * - Alert triggering
 */

import { FastifyInstance } from 'fastify'
import { PriceAggregator } from './PriceAggregator'

export interface PositionRiskData {
  walletAddress: string
  healthFactor: number
  totalCollateralValue: number
  totalDebt: number
  liquidationThreshold: number
  status: 'healthy' | 'warning' | 'danger' | 'liquidatable'
  collateral: CollateralItem[]
  debt: DebtItem[]
}

export interface CollateralItem {
  id: string
  commodity_type: string
  token_address: string
  amount: number
  value_usd: number
  haircut_bps: number
  quality: string
}

export interface DebtItem {
  id: string
  asset_address: string
  amount: number
  value_usd: number
  interest_rate_bps: number
}

export interface MonitoringAlert {
  alertId: string
  walletAddress: string
  alertType: 'health_factor_warning' | 'health_factor_danger' | 'liquidatable' | 'oracle_failure' | 'high_utilization'
  severity: 'low' | 'medium' | 'high' | 'critical'
  healthFactor?: number
  message: string
  timestamp: Date
}

export interface OracleHealthStatus {
  commodity: string
  status: 'healthy' | 'degraded' | 'stale' | 'offline'
  lastUpdate: Date
  ageMinutes: number
  confidence: number
}

export class RiskMonitor {
  private supabase: any
  private projectId: string
  private priceAggregator: PriceAggregator
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor(
    supabase: any,
    projectId: string,
    priceAggregator: PriceAggregator
  ) {
    this.supabase = supabase
    this.projectId = projectId
    this.priceAggregator = priceAggregator
  }

  /**
   * Calculate health factor for a specific position
   */
  async calculateHealthFactor(walletAddress: string): Promise<PositionRiskData | null> {
    try {
      // Fetch position data
      const { data: position, error } = await this.supabase
        .from('commodity_positions')
        .select(`
          *,
          collateral:commodity_collateral(
            id,
            commodity_type,
            token_address,
            amount,
            value_usd,
            haircut_bps,
            quality
          ),
          debt:commodity_debt(
            id,
            asset_address,
            amount,
            value_usd,
            interest_rate_bps
          )
        `)
        .eq('wallet_address', walletAddress)
        .eq('project_id', this.projectId)
        .single()

      if (error || !position) {
        return null
      }

      // Update collateral values with current prices
      const updatedCollateral = await this.updateCollateralValues(position.collateral)
      
      // Calculate totals
      const totalCollateralValue = updatedCollateral.reduce(
        (sum, c) => sum + c.value_usd,
        0
      )
      
      const totalDebt = position.debt?.reduce(
        (sum: number, d: DebtItem) => sum + d.value_usd,
        0
      ) || 0

      // Get average liquidation threshold (85% default)
      const liquidationThreshold = 0.85

      // Calculate health factor: HF = (Collateral × Liq Threshold) / Debt
      const healthFactor = totalDebt > 0
        ? (totalCollateralValue * liquidationThreshold) / totalDebt
        : Infinity

      // Determine status
      let status: 'healthy' | 'warning' | 'danger' | 'liquidatable'
      if (healthFactor >= 1.1) status = 'healthy'
      else if (healthFactor >= 1.0) status = 'warning'
      else if (healthFactor >= 0.95) status = 'danger'
      else status = 'liquidatable'

      return {
        walletAddress,
        healthFactor,
        totalCollateralValue,
        totalDebt,
        liquidationThreshold,
        status,
        collateral: updatedCollateral,
        debt: position.debt || []
      }
    } catch (error) {
      console.error(`Error calculating health factor for ${walletAddress}:`, error)
      return null
    }
  }

  /**
   * Update collateral values with current prices from FRED
   */
  private async updateCollateralValues(collateral: CollateralItem[]): Promise<CollateralItem[]> {
    const updated: CollateralItem[] = []

    for (const item of collateral) {
      try {
        // Fetch current price
        const priceData = await this.priceAggregator.getPriceWithAutoUpdate(
          item.commodity_type,
          60 // Max 60 minutes old
        )

        // Calculate new value (accounting for haircut)
        const haircutMultiplier = 1 - (item.haircut_bps / 10000)
        const newValue = item.amount * priceData.price_usd * haircutMultiplier

        updated.push({
          ...item,
          value_usd: newValue
        })
      } catch (error) {
        console.error(`Failed to update price for ${item.commodity_type}:`, error)
        // Keep original value if price update fails
        updated.push(item)
      }
    }

    return updated
  }

  /**
   * Monitor all positions and return those at risk
   */
  async monitorAllPositions(): Promise<{
    healthy: PositionRiskData[]
    warning: PositionRiskData[]
    danger: PositionRiskData[]
    liquidatable: PositionRiskData[]
    alerts: MonitoringAlert[]
  }> {
    try {
      // Fetch all active positions
      const { data: positions, error } = await this.supabase
        .from('commodity_positions')
        .select('wallet_address')
        .eq('project_id', this.projectId)
        .eq('status', 'active')

      if (error || !positions) {
        return {
          healthy: [],
          warning: [],
          danger: [],
          liquidatable: [],
          alerts: []
        }
      }

      const healthy: PositionRiskData[] = []
      const warning: PositionRiskData[] = []
      const danger: PositionRiskData[] = []
      const liquidatable: PositionRiskData[] = []
      const alerts: MonitoringAlert[] = []

      // Calculate risk for each position
      for (const position of positions) {
        const riskData = await this.calculateHealthFactor(position.wallet_address)
        
        if (!riskData) continue

        // Categorize by status
        switch (riskData.status) {
          case 'healthy':
            healthy.push(riskData)
            break
          case 'warning':
            warning.push(riskData)
            alerts.push({
              alertId: `${position.wallet_address}-warning-${Date.now()}`,
              walletAddress: position.wallet_address,
              alertType: 'health_factor_warning',
              severity: 'medium',
              healthFactor: riskData.healthFactor,
              message: `Health factor at ${riskData.healthFactor.toFixed(3)} (1.0-1.1 range)`,
              timestamp: new Date()
            })
            break
          case 'danger':
            danger.push(riskData)
            alerts.push({
              alertId: `${position.wallet_address}-danger-${Date.now()}`,
              walletAddress: position.wallet_address,
              alertType: 'health_factor_danger',
              severity: 'high',
              healthFactor: riskData.healthFactor,
              message: `Health factor at ${riskData.healthFactor.toFixed(3)} (0.95-1.0 range) - Add collateral immediately!`,
              timestamp: new Date()
            })
            break
          case 'liquidatable':
            liquidatable.push(riskData)
            alerts.push({
              alertId: `${position.wallet_address}-liquidatable-${Date.now()}`,
              walletAddress: position.wallet_address,
              alertType: 'liquidatable',
              severity: 'critical',
              healthFactor: riskData.healthFactor,
              message: `Position liquidatable! Health factor: ${riskData.healthFactor.toFixed(3)}`,
              timestamp: new Date()
            })
            break
        }
      }

      return {
        healthy,
        warning,
        danger,
        liquidatable,
        alerts
      }
    } catch (error) {
      console.error('Error monitoring positions:', error)
      throw error
    }
  }

  /**
   * Check oracle health for all commodities
   */
  async checkOracleHealth(): Promise<OracleHealthStatus[]> {
    try {
      // Get latest price for each commodity
      const { data: latestPrices, error } = await this.supabase
        .from('commodity_prices')
        .select('commodity_type, timestamp, confidence_score')
        .eq('project_id', this.projectId)
        .order('timestamp', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch oracle health: ${error.message}`)
      }

      // Group by commodity and get latest
      const commodityMap = new Map<string, {
        commodity_type: string
        price_usd: number
        timestamp: string
        source: string
        confidence_score?: number
      }>()
      latestPrices?.forEach((price: {
        commodity_type: string
        price_usd: number
        timestamp: string
        source: string
        confidence_score?: number
      }) => {
        if (!commodityMap.has(price.commodity_type)) {
          commodityMap.set(price.commodity_type, price)
        }
      })

      // Check health of each feed
      const now = Date.now()
      return Array.from(commodityMap.values()).map((price: {
        commodity_type: string
        price_usd: number
        timestamp: string
        source: string
        confidence_score?: number
      }) => {
        const lastUpdate = new Date(price.timestamp)
        const ageMs = now - lastUpdate.getTime()
        const ageMinutes = Math.floor(ageMs / 60000)
        
        let status: 'healthy' | 'degraded' | 'stale' | 'offline'
        if (ageMinutes < 30) status = 'healthy'
        else if (ageMinutes < 60) status = 'degraded'
        else if (ageMinutes < 180) status = 'stale'
        else status = 'offline'

        return {
          commodity: price.commodity_type,
          status,
          lastUpdate,
          ageMinutes,
          confidence: price.confidence_score ?? 0
        }
      })
    } catch (error) {
      console.error('Error checking oracle health:', error)
      throw error
    }
  }

  /**
   * Calculate protocol-wide utilization metrics
   */
  async calculateUtilization(): Promise<{
    totalCollateralValue: number
    totalDebt: number
    utilizationRate: number
    borrowCapacity: number
    availableToBorrow: number
  }> {
    try {
      // Fetch all active positions
      const { data: positions, error } = await this.supabase
        .from('commodity_positions')
        .select(`
          collateral:commodity_collateral(value_usd),
          debt:commodity_debt(value_usd)
        `)
        .eq('project_id', this.projectId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to fetch positions: ${error.message}`)
      }

      let totalCollateralValue = 0
      let totalDebt = 0

      positions?.forEach((position: {
        collateral?: Array<{ value_usd: number }>
        debt?: Array<{ value_usd: number }>
      }) => {
        totalCollateralValue += position.collateral?.reduce(
          (sum: number, c: { value_usd: number }) => sum + (c.value_usd || 0),
          0
        ) || 0

        totalDebt += position.debt?.reduce(
          (sum: number, d: { value_usd: number }) => sum + (d.value_usd || 0),
          0
        ) || 0
      })

      // Calculate metrics (assuming 80% LTV)
      const ltv = 0.80
      const borrowCapacity = totalCollateralValue * ltv
      const utilizationRate = borrowCapacity > 0 ? totalDebt / borrowCapacity : 0
      const availableToBorrow = Math.max(0, borrowCapacity - totalDebt)

      return {
        totalCollateralValue,
        totalDebt,
        utilizationRate,
        borrowCapacity,
        availableToBorrow
      }
    } catch (error) {
      console.error('Error calculating utilization:', error)
      throw error
    }
  }

  /**
   * Start continuous monitoring (runs every N minutes)
   */
  startContinuousMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      console.warn('Monitoring already running')
      return
    }

    console.log(`Starting continuous risk monitoring (every ${intervalMinutes} minutes)`)

    const runMonitoring = async () => {
      try {
        const results = await this.monitorAllPositions()
        const oracleHealth = await this.checkOracleHealth()
        const utilization = await this.calculateUtilization()

        console.log('\n=== Risk Monitoring Report ===')
        console.log(`Healthy: ${results.healthy.length}`)
        console.log(`Warning: ${results.warning.length}`)
        console.log(`Danger: ${results.danger.length}`)
        console.log(`Liquidatable: ${results.liquidatable.length}`)
        console.log(`Utilization: ${(utilization.utilizationRate * 100).toFixed(2)}%`)
        console.log(`Alerts: ${results.alerts.length}`)

        // Log critical alerts
        if (results.alerts.length > 0) {
          console.log('\nCritical Alerts:')
          results.alerts
            .filter(a => a.severity === 'critical' || a.severity === 'high')
            .forEach(alert => {
              console.log(`  [${alert.severity.toUpperCase()}] ${alert.message}`)
            })
        }

        // Check oracle health
        const unhealthyOracles = oracleHealth.filter(
          o => o.status !== 'healthy'
        )
        if (unhealthyOracles.length > 0) {
          console.log('\nOracle Issues:')
          unhealthyOracles.forEach(oracle => {
            console.log(`  ${oracle.commodity}: ${oracle.status} (${oracle.ageMinutes}m old)`)
          })
        }

        console.log('==============================\n')
      } catch (error) {
        console.error('Monitoring cycle error:', error)
      }
    }

    // Run immediately, then on interval
    runMonitoring()
    this.monitoringInterval = setInterval(runMonitoring, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('Continuous risk monitoring stopped')
    }
  }
}

/**
 * Create RiskMonitor instance from Fastify instance
 */
export function createRiskMonitor(
  fastify: FastifyInstance,
  projectId: string,
  priceAggregator: PriceAggregator
): RiskMonitor {
  return new RiskMonitor(fastify.supabase, projectId, priceAggregator)
}
