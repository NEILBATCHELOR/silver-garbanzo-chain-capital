/**
 * Asset Icon Component
 * Displays icon for crypto assets and fiat currencies
 */

import { Bitcoin, Banknote, Coins } from 'lucide-react'

interface AssetIconProps {
  symbol: string
  className?: string
}

const assetIcons: Record<string, React.ComponentType<any>> = {
  BTC: Bitcoin,
  USD: Banknote,
  USDC: Coins,
  USDT: Coins,
  ETH: Coins
}

export function AssetIcon({ symbol, className = 'h-5 w-5' }: AssetIconProps) {
  const Icon = assetIcons[symbol.toUpperCase()] || Coins
  
  return <Icon className={className} />
}
