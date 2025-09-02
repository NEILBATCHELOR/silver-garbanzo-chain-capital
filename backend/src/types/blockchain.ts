/**
 * Blockchain Domain Types
 * Types specific to blockchain operations, wallets, and transactions
 */

/**
 * Wallet creation data structure
 */
export interface WalletCreationData {
  userId: string
  blockchain: string
  walletType: 'custodial' | 'non-custodial'
  metadata?: Record<string, any>
}

/**
 * Transaction data structure
 */
export interface TransactionData {
  fromAddress: string
  toAddress: string
  value: string
  tokenSymbol?: string
  tokenAddress?: string
  blockchain: string
  memo?: string
}

/**
 * Transaction status tracking
 */
export interface TransactionStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  confirmations: number
  gasUsed?: string
  networkFee?: string
}

/**
 * MoonPay integration data
 */
export interface MoonpayTransactionData {
  type: 'buy' | 'sell'
  cryptoCurrency: string
  fiatCurrency: string
  fiatAmount: number
  walletAddress?: string
  customerId?: string
}

/**
 * Ripple payment data
 */
export interface RipplePaymentData {
  fromAccount: string
  toAccount: string
  amount: number
  currency: string
  memo?: string
  destinationTag?: number
}
