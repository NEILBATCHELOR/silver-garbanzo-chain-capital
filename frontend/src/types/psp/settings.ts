/**
 * PSP Payment Settings Types
 * Types for payment automation and configuration
 */

export type WithdrawalFrequency = 'continuous' | 'on_demand' | 'daily' | 'weekly'

export type DefaultFiatRail = 'ach' | 'wire' | 'rtp' | 'fednow'

export interface PspPaymentSettings {
  id: string
  project_id: string
  
  // Automation settings
  automation_enabled: boolean
  withdrawal_frequency: WithdrawalFrequency
  
  // On-ramp settings (USD -> Crypto)
  onramp_enabled: boolean
  onramp_target_asset: string | null
  onramp_target_network: string | null
  onramp_target_wallet_id: string | null
  
  // Off-ramp settings (Crypto -> USD)
  offramp_enabled: boolean
  offramp_target_currency: string | null
  offramp_target_account_id: string | null
  
  // Default payment rails
  default_fiat_rail: DefaultFiatRail
  
  created_at: string
  updated_at: string
}

export interface UpdatePaymentSettingsRequest {
  project_id: string
  automation_enabled?: boolean
  withdrawal_frequency?: WithdrawalFrequency
  onramp_enabled?: boolean
  onramp_target_asset?: string
  onramp_target_network?: string
  onramp_target_wallet_id?: string
  offramp_enabled?: boolean
  offramp_target_currency?: string
  offramp_target_account_id?: string
  default_fiat_rail?: DefaultFiatRail
}
