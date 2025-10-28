/**
 * Network Badge Component
 * Displays badge for blockchain networks
 */

import { Badge } from '@/components/ui/badge'

interface NetworkBadgeProps {
  network: string | null
  className?: string
}

const networkColors: Record<string, string> = {
  ethereum: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  polygon: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  stellar: 'bg-green-500/10 text-green-500 border-green-500/20',
  solana: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  bitcoin: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
}

export function NetworkBadge({ network, className }: NetworkBadgeProps) {
  if (!network) return null
  
  const colorClass = networkColors[network.toLowerCase()] || 'bg-gray-500/10 text-gray-500'
  
  return (
    <Badge variant="outline" className={`${colorClass} ${className || ''}`}>
      {network}
    </Badge>
  )
}
