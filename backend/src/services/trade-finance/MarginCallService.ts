/**
 * Margin Call Alert Service
 * 
 * Purpose: Send alerts to users when their positions are at risk
 * 
 * Features:
 * - Multi-channel alerts (email, SMS, push notifications)
 * - Multi-tier warning system (yellow/orange/red)
 * - Rate limiting to prevent spam
 * - Alert history tracking
 */

import { FastifyInstance } from 'fastify'
import { RiskMonitor, MonitoringAlert, PositionRiskData } from './RiskMonitoring'

export interface AlertChannel {
  email?: string
  phone?: string
  pushToken?: string
  telegram?: string
}

export interface AlertPreferences {
  walletAddress: string
  channels: AlertChannel
  enableWarnings: boolean
  enableDanger: boolean
  enableLiquidation: boolean
  minHealthFactor: number // Only alert if HF drops below this
}

export interface SentAlert {
  alertId: string
  walletAddress: string
  channels: string[] // Which channels were used
  severity: string
  message: string
  sentAt: Date
  delivered: boolean
}

export class MarginCallService {
  private supabase: any
  private projectId: string
  private riskMonitor: RiskMonitor
  private alertHistory: Map<string, Date> = new Map() // Rate limiting
  private readonly ALERT_COOLDOWN_MINUTES = 15 // Min time between alerts per user

  constructor(
    supabase: any,
    projectId: string,
    riskMonitor: RiskMonitor
  ) {
    this.supabase = supabase
    this.projectId = projectId
    this.riskMonitor = riskMonitor
  }

  /**
   * Get alert preferences for a wallet
   */
  async getAlertPreferences(walletAddress: string): Promise<AlertPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('alert_preferences')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('project_id', this.projectId)
        .single()

      if (error || !data) {
        // Default preferences if none set
        return {
          walletAddress,
          channels: {},
          enableWarnings: true,
          enableDanger: true,
          enableLiquidation: true,
          minHealthFactor: 1.1
        }
      }

      return {
        walletAddress: data.wallet_address,
        channels: data.channels || {},
        enableWarnings: data.enable_warnings ?? true,
        enableDanger: data.enable_danger ?? true,
        enableLiquidation: data.enable_liquidation ?? true,
        minHealthFactor: data.min_health_factor || 1.1
      }
    } catch (error) {
      console.error(`Error fetching alert preferences for ${walletAddress}:`, error)
      return null
    }
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  private shouldSendAlert(walletAddress: string): boolean {
    const lastAlert = this.alertHistory.get(walletAddress)
    
    if (!lastAlert) {
      return true
    }

    const minutesSinceLastAlert = (Date.now() - lastAlert.getTime()) / 60000
    return minutesSinceLastAlert >= this.ALERT_COOLDOWN_MINUTES
  }

  /**
   * Record that an alert was sent
   */
  private recordAlertSent(walletAddress: string): void {
    this.alertHistory.set(walletAddress, new Date())
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    email: string,
    severity: 'warning' | 'danger' | 'critical',
    healthFactor: number,
    collateralValue: number,
    debtValue: number
  ): Promise<boolean> {
    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log
    
    const subject = severity === 'critical' 
      ? '🚨 URGENT: Position Liquidatable'
      : severity === 'danger'
      ? '⚠️ WARNING: Add Collateral Now'
      : '📊 Margin Call Notice'

    const emailContent = `
Dear User,

Your commodity trade finance position requires immediate attention.

Current Status:
- Health Factor: ${healthFactor.toFixed(4)}
- Total Collateral: $${collateralValue.toLocaleString()}
- Total Debt: $${debtValue.toLocaleString()}

${severity === 'critical' 
  ? 'CRITICAL: Your position is eligible for liquidation. Add collateral immediately to avoid loss!'
  : severity === 'danger'
  ? 'DANGER: Your health factor is below 1.0. Add collateral within 24 hours.'
  : 'WARNING: Your health factor is approaching the liquidation threshold.'
}

Action Required:
1. Add more collateral to your position
2. Repay part of your loan
3. Monitor your health factor regularly

Login to manage your position: ${process.env.FRONTEND_URL || 'https://app.chaincapital.com'}

Best regards,
Chain Capital Risk Management
    `.trim()

    console.log('\n=== EMAIL ALERT ===')
    console.log(`To: ${email}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body:\n${emailContent}`)
    console.log('===================\n')

    // TODO: Replace with actual email sending
    // await emailService.send({ to: email, subject, body: emailContent })

    return true
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(
    phone: string,
    severity: 'warning' | 'danger' | 'critical',
    healthFactor: number
  ): Promise<boolean> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    
    const smsContent = severity === 'critical'
      ? `🚨 CRITICAL: Your position is liquidatable! HF: ${healthFactor.toFixed(3)}. Add collateral NOW!`
      : severity === 'danger'
      ? `⚠️ DANGER: Health factor at ${healthFactor.toFixed(3)}. Add collateral within 24h.`
      : `📊 WARNING: Health factor at ${healthFactor.toFixed(3)}. Monitor position closely.`

    console.log('\n=== SMS ALERT ===')
    console.log(`To: ${phone}`)
    console.log(`Message: ${smsContent}`)
    console.log('=================\n')

    // TODO: Replace with actual SMS sending
    // await smsService.send({ to: phone, message: smsContent })

    return true
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    pushToken: string,
    severity: 'warning' | 'danger' | 'critical',
    healthFactor: number
  ): Promise<boolean> {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    
    const title = severity === 'critical'
      ? '🚨 Position Liquidatable!'
      : severity === 'danger'
      ? '⚠️ Add Collateral Now'
      : '📊 Margin Call Notice'

    const body = `Health Factor: ${healthFactor.toFixed(3)}`

    console.log('\n=== PUSH NOTIFICATION ===')
    console.log(`Token: ${pushToken}`)
    console.log(`Title: ${title}`)
    console.log(`Body: ${body}`)
    console.log('========================\n')

    // TODO: Replace with actual push notification
    // await pushService.send({ token: pushToken, title, body })

    return true
  }

  /**
   * Send alert to user via all configured channels
   */
  async sendAlert(
    riskData: PositionRiskData,
    preferences: AlertPreferences
  ): Promise<SentAlert | null> {
    // Check if we should send (rate limiting)
    if (!this.shouldSendAlert(riskData.walletAddress)) {
      console.log(`Rate limit: Skipping alert for ${riskData.walletAddress}`)
      return null
    }

    // Check if user wants this type of alert
    const { status, healthFactor } = riskData
    if (
      (status === 'warning' && !preferences.enableWarnings) ||
      (status === 'danger' && !preferences.enableDanger) ||
      (status === 'liquidatable' && !preferences.enableLiquidation)
    ) {
      console.log(`Preferences: Skipping ${status} alert for ${riskData.walletAddress}`)
      return null
    }

    // Check minimum health factor threshold
    if (healthFactor > preferences.minHealthFactor) {
      console.log(`Health factor ${healthFactor} above threshold ${preferences.minHealthFactor}`)
      return null
    }

    const severity = status === 'liquidatable' 
      ? 'critical' 
      : status === 'danger' 
      ? 'danger' 
      : 'warning'

    const channelsUsed: string[] = []
    let anyDelivered = false

    // Send via email
    if (preferences.channels.email) {
      try {
        const sent = await this.sendEmailAlert(
          preferences.channels.email,
          severity,
          healthFactor,
          riskData.totalCollateralValue,
          riskData.totalDebt
        )
        if (sent) {
          channelsUsed.push('email')
          anyDelivered = true
        }
      } catch (error) {
        console.error('Email alert failed:', error)
      }
    }

    // Send via SMS
    if (preferences.channels.phone) {
      try {
        const sent = await this.sendSMSAlert(
          preferences.channels.phone,
          severity,
          healthFactor
        )
        if (sent) {
          channelsUsed.push('sms')
          anyDelivered = true
        }
      } catch (error) {
        console.error('SMS alert failed:', error)
      }
    }

    // Send push notification
    if (preferences.channels.pushToken) {
      try {
        const sent = await this.sendPushNotification(
          preferences.channels.pushToken,
          severity,
          healthFactor
        )
        if (sent) {
          channelsUsed.push('push')
          anyDelivered = true
        }
      } catch (error) {
        console.error('Push notification failed:', error)
      }
    }

    const sentAlert: SentAlert = {
      alertId: `${riskData.walletAddress}-${Date.now()}`,
      walletAddress: riskData.walletAddress,
      channels: channelsUsed,
      severity,
      message: `Health factor at ${healthFactor.toFixed(4)}`,
      sentAt: new Date(),
      delivered: anyDelivered
    }

    // Record alert sent
    this.recordAlertSent(riskData.walletAddress)

    // Store in database
    await this.storeAlertHistory(sentAlert)

    return sentAlert
  }

  /**
   * Store alert in database for history
   */
  private async storeAlertHistory(alert: SentAlert): Promise<void> {
    try {
      await this.supabase
        .from('alert_history')
        .insert({
          project_id: this.projectId,
          alert_id: alert.alertId,
          wallet_address: alert.walletAddress,
          channels: alert.channels,
          severity: alert.severity,
          message: alert.message,
          sent_at: alert.sentAt.toISOString(),
          delivered: alert.delivered
        })
    } catch (error) {
      console.error('Failed to store alert history:', error)
    }
  }

  /**
   * Process alerts for all at-risk positions
   */
  async processAllAlerts(): Promise<{
    sent: SentAlert[]
    skipped: number
  }> {
    try {
      // Get all positions at risk
      const monitoringResults = await this.riskMonitor.monitorAllPositions()
      
      const atRiskPositions = [
        ...monitoringResults.warning,
        ...monitoringResults.danger,
        ...monitoringResults.liquidatable
      ]

      const sent: SentAlert[] = []
      let skipped = 0

      for (const position of atRiskPositions) {
        // Get user preferences
        const preferences = await this.getAlertPreferences(position.walletAddress)
        
        if (!preferences) {
          skipped++
          continue
        }

        // Send alert
        const sentAlert = await this.sendAlert(position, preferences)
        
        if (sentAlert) {
          sent.push(sentAlert)
        } else {
          skipped++
        }
      }

      return { sent, skipped }
    } catch (error) {
      console.error('Error processing alerts:', error)
      throw error
    }
  }

  /**
   * Get alert history for a wallet
   */
  async getAlertHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<SentAlert[]> {
    try {
      const { data, error } = await this.supabase
        .from('alert_history')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('project_id', this.projectId)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data?.map((row: {
        alert_id: string
        wallet_address: string
        channels: string[]
        severity: string
        message: string
        sent_at: string
        delivered: boolean
      }) => ({
        alertId: row.alert_id,
        walletAddress: row.wallet_address,
        channels: row.channels,
        severity: row.severity,
        message: row.message,
        sentAt: new Date(row.sent_at),
        delivered: row.delivered
      })) || []
    } catch (error) {
      console.error('Error fetching alert history:', error)
      return []
    }
  }

  /**
   * Update alert preferences
   */
  async updateAlertPreferences(preferences: AlertPreferences): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('alert_preferences')
        .upsert({
          project_id: this.projectId,
          wallet_address: preferences.walletAddress,
          channels: preferences.channels,
          enable_warnings: preferences.enableWarnings,
          enable_danger: preferences.enableDanger,
          enable_liquidation: preferences.enableLiquidation,
          min_health_factor: preferences.minHealthFactor
        })

      if (error) {
        throw error
      }

      return true
    } catch (error) {
      console.error('Error updating alert preferences:', error)
      return false
    }
  }
}

/**
 * Create MarginCallService instance from Fastify instance
 */
export function createMarginCallService(
  fastify: FastifyInstance,
  projectId: string,
  riskMonitor: RiskMonitor
): MarginCallService {
  return new MarginCallService(fastify.supabase, projectId, riskMonitor)
}
